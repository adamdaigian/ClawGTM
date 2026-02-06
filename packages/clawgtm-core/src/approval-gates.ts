import { randomUUID } from 'node:crypto';
import type { AuditLog } from './audit-log.ts';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export interface ApprovalRequest {
  request_id: string;
  created_at: string;
  requested_by: 'agent' | 'human';
  agent_id: string;
  task_id: string;
  run_id: string;
  action_type: string;
  target: string;
  payload: string;
  status: ApprovalStatus;
  decision_by: string | null;
  decision_at: string | null;
  executed_at: string | null;
}

export interface ApprovalStore {
  save(request: ApprovalRequest): void;
  update(request: ApprovalRequest): void;
  get(requestId: string): ApprovalRequest | null;
  list(): ApprovalRequest[];
}

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly requests = new Map<string, ApprovalRequest>();

  save(request: ApprovalRequest): void {
    this.requests.set(request.request_id, { ...request });
  }

  update(request: ApprovalRequest): void {
    this.requests.set(request.request_id, { ...request });
  }

  get(requestId: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);
    return request ? { ...request } : null;
  }

  list(): ApprovalRequest[] {
    return Array.from(this.requests.values()).map((request) => ({ ...request }));
  }
}

export class ApprovalGateService {
  private readonly store: ApprovalStore;
  private readonly auditLog?: AuditLog;

  constructor(store: ApprovalStore, auditLog?: AuditLog) {
    this.store = store;
    this.auditLog = auditLog;
  }

  propose(input: {
    requestedBy: 'agent' | 'human';
    agentId: string;
    taskId: string;
    runId: string;
    actionType: string;
    target: string;
    payload?: string;
  }): ApprovalRequest {
    const request: ApprovalRequest = {
      request_id: randomUUID(),
      created_at: new Date().toISOString(),
      requested_by: input.requestedBy,
      agent_id: input.agentId,
      task_id: input.taskId,
      run_id: input.runId,
      action_type: input.actionType,
      target: input.target,
      payload: input.payload ?? '{}',
      status: 'pending',
      decision_by: null,
      decision_at: null,
      executed_at: null,
    };

    this.store.save(request);
    this.log(request, 'approval.propose', 'success', null);
    return request;
  }

  approve(requestId: string, decidedBy: string): ApprovalRequest {
    const request = this.requireRequest(requestId);
    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending.`);
    }

    request.status = 'approved';
    request.decision_by = decidedBy;
    request.decision_at = new Date().toISOString();
    this.store.update(request);

    this.log(request, 'approval.approve', 'success', null);
    return request;
  }

  reject(requestId: string, decidedBy: string): ApprovalRequest {
    const request = this.requireRequest(requestId);
    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending.`);
    }

    request.status = 'rejected';
    request.decision_by = decidedBy;
    request.decision_at = new Date().toISOString();
    this.store.update(request);

    this.log(request, 'approval.reject', 'success', null);
    return request;
  }

  async executeApproved<T>(requestId: string, action: () => Promise<T> | T): Promise<T> {
    const request = this.requireRequest(requestId);
    if (request.status !== 'approved') {
      this.log(request, 'approval.execute', 'blocked', JSON.stringify({ reason: 'not_approved' }));
      throw new Error(`Approval request ${requestId} is not approved.`);
    }

    const result = await action();
    request.status = 'executed';
    request.executed_at = new Date().toISOString();
    this.store.update(request);

    this.log(request, 'approval.execute', 'success', null);
    return result;
  }

  get(requestId: string): ApprovalRequest | null {
    return this.store.get(requestId);
  }

  list(): ApprovalRequest[] {
    return this.store.list();
  }

  private requireRequest(requestId: string): ApprovalRequest {
    const request = this.store.get(requestId);
    if (!request) {
      throw new Error(`Unknown approval request: ${requestId}`);
    }
    return request;
  }

  private log(
    request: ApprovalRequest,
    actionType: string,
    status: string,
    errorPayload: string | null,
  ): void {
    if (!this.auditLog) {
      return;
    }

    this.auditLog.append({
      timestamp: new Date().toISOString(),
      agent_id: request.agent_id,
      task_id: request.task_id,
      run_id: request.run_id,
      action_type: actionType,
      target: request.target,
      artifact_refs: [],
      status,
      error_payload: errorPayload,
    });
  }
}
