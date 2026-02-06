import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileApprovalStore } from '../src/file-approval-store.js';

describe('FileApprovalStore', () => {
  it('persists approval requests on disk', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'clawgtm-approvals-'));
    const filePath = path.join(dir, 'approvals.json');

    try {
      const store = new FileApprovalStore(filePath);
      store.save({
        request_id: 'req-1',
        created_at: '2026-02-06T00:00:00.000Z',
        requested_by: 'human',
        agent_id: 'bdr',
        task_id: 'task-1',
        run_id: 'run-1',
        action_type: 'external_email_send',
        target: 'prospect@example.com',
        payload: '{}',
        status: 'pending',
        decision_by: null,
        decision_at: null,
        executed_at: null,
      });

      expect(store.get('req-1')?.target).toBe('prospect@example.com');
      expect(store.list()).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
