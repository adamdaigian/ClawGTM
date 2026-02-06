import { describe, expect, it } from 'vitest';
import { ApprovalGateService, InMemoryApprovalStore } from '../src/approval-gates.js';
import { AuditLog } from '../src/audit-log.js';

describe('ApprovalGateService', () => {
  it('enforces propose -> approve -> execute flow', async () => {
    const audit = new AuditLog();
    const service = new ApprovalGateService(new InMemoryApprovalStore(), audit);

    const request = service.propose({
      requestedBy: 'agent',
      agentId: 'bdr',
      taskId: 'task-10',
      runId: 'run-10',
      actionType: 'external_email_send',
      target: 'prospect@example.com',
    });

    await expect(service.executeApproved(request.request_id, async () => 'sent')).rejects.toThrow(
      /not approved/,
    );

    service.approve(request.request_id, 'human:ops');
    const result = await service.executeApproved(request.request_id, async () => 'sent');

    expect(result).toBe('sent');
    expect(service.get(request.request_id)?.status).toBe('executed');
    expect(audit.list().map((entry) => entry.action_type)).toEqual([
      'approval.propose',
      'approval.execute',
      'approval.approve',
      'approval.execute',
    ]);
  });

  it('records rejection decision', () => {
    const service = new ApprovalGateService(new InMemoryApprovalStore());

    const request = service.propose({
      requestedBy: 'human',
      agentId: 'revops',
      taskId: 'task-11',
      runId: 'run-11',
      actionType: 'crm_write',
      target: 'opportunity-123',
    });

    service.reject(request.request_id, 'human:approver');
    expect(service.get(request.request_id)?.status).toBe('rejected');
  });
});
