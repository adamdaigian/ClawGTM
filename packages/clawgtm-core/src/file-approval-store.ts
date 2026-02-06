import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ApprovalRequest, ApprovalStore } from './approval-gates.ts';

interface ApprovalDocument {
  requests: ApprovalRequest[];
}

export class FileApprovalStore implements ApprovalStore {
  private readonly storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = path.resolve(storagePath);
    this.ensureFile();
  }

  save(request: ApprovalRequest): void {
    const doc = this.read();
    doc.requests.push(request);
    this.write(doc);
  }

  update(request: ApprovalRequest): void {
    const doc = this.read();
    const index = doc.requests.findIndex((candidate) => candidate.request_id === request.request_id);
    if (index === -1) {
      throw new Error(`Unknown approval request: ${request.request_id}`);
    }
    doc.requests[index] = request;
    this.write(doc);
  }

  get(requestId: string): ApprovalRequest | null {
    const doc = this.read();
    const request = doc.requests.find((candidate) => candidate.request_id === requestId);
    return request ? { ...request } : null;
  }

  list(): ApprovalRequest[] {
    return this.read().requests.map((request) => ({ ...request }));
  }

  private ensureFile(): void {
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
    try {
      readFileSync(this.storagePath, 'utf8');
    } catch {
      this.write({ requests: [] });
    }
  }

  private read(): ApprovalDocument {
    const raw = readFileSync(this.storagePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ApprovalDocument>;
    return {
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    };
  }

  private write(document: ApprovalDocument): void {
    writeFileSync(this.storagePath, JSON.stringify(document, null, 2), 'utf8');
  }
}
