import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { OAuthProviderName } from '../../../packages/clawgtm-auth/src/contracts.ts';

interface PendingOAuthState {
  agent: string;
  provider: OAuthProviderName;
  state: string;
  created_at: string;
}

interface PendingOAuthDocument {
  pending: PendingOAuthState[];
}

export class OAuthStateStore {
  private readonly storagePath: string;

  constructor(storagePath = path.resolve('.clawgtm/oauth_state.json')) {
    this.storagePath = storagePath;
    this.ensureFile();
  }

  put(input: { agent: string; provider: OAuthProviderName; state: string }): void {
    const doc = this.read();
    doc.pending = doc.pending.filter(
      (entry) => !(entry.agent === input.agent && entry.provider === input.provider),
    );
    doc.pending.push({
      ...input,
      created_at: new Date().toISOString(),
    });
    this.write(doc);
  }

  take(input: { agent: string; provider: OAuthProviderName }): PendingOAuthState | null {
    const doc = this.read();
    const entry = doc.pending.find(
      (candidate) => candidate.agent === input.agent && candidate.provider === input.provider,
    );

    if (!entry) {
      return null;
    }

    doc.pending = doc.pending.filter((candidate) => candidate !== entry);
    this.write(doc);
    return entry;
  }

  private ensureFile(): void {
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
    try {
      readFileSync(this.storagePath, 'utf8');
    } catch {
      this.write({ pending: [] });
    }
  }

  private read(): PendingOAuthDocument {
    const raw = readFileSync(this.storagePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PendingOAuthDocument>;
    return {
      pending: Array.isArray(parsed.pending) ? parsed.pending : [],
    };
  }

  private write(document: PendingOAuthDocument): void {
    writeFileSync(this.storagePath, JSON.stringify(document, null, 2), 'utf8');
  }
}
