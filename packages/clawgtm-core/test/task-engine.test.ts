import { describe, expect, it } from 'vitest';
import { ArtifactRegistry } from '../src/artifact-registry.js';
import { AuditLog } from '../src/audit-log.js';
import { SqliteAdapter } from '../src/db.js';
import { TaskEngine } from '../src/task-engine.js';

describe('task engine with audit and artifact registry', () => {
  it('stores task and completion records', () => {
    const db = new SqliteAdapter();
    const auditLog = new AuditLog(db);
    const artifactRegistry = new ArtifactRegistry(db);
    const engine = new TaskEngine(auditLog, artifactRegistry);

    engine.createTask({
      task_id: 'task-onboarding-1',
      requested_by: 'headofrevenue',
      priority: 'P0',
      objective: 'Produce JTBD',
      context: {
        company: 'company/company_overview.md',
        audience: 'personas/buyer.md',
        constraints: 'company/constraints.md',
      },
      inputs: {
        docs: ['company/product_overview.md'],
        data: ['metrics/target_metrics.md'],
      },
      success_criteria: {
        metric: 'onboarding_complete',
        target: '100%',
        timeframe: '48h',
      },
      deliverables: {
        artifacts: ['analysis'],
        output_paths: ['analysis/jtbd_framework.md'],
      },
      due: {
        soft_due: '2026-02-08T00:00:00.000Z',
        hard_due: null,
      },
      approval_required: true,
    });

    const result = engine.completeTask({
      runId: 'run-1',
      agentId: 'researcher',
      result: {
        task_id: 'task-onboarding-1',
        status: 'success',
        summary: 'Published JTBD',
        artifacts: [
          {
            type: 'analysis',
            path: 'analysis/jtbd_framework.md',
            description: 'JTBD framework v1',
          },
        ],
        metrics_impact: [
          {
            metric: 'sales_velocity',
            expected_delta: '+10%',
            confidence: 'med',
          },
        ],
        risks: ['Need validation from RevOps'],
        dependencies: [{ type: 'agent', description: 'Narrative reads JTBD' }],
        next_actions: [{ owner: 'agent', action: 'Draft messaging framework', due: null }],
        review_required: true,
      },
    });

    expect(result.status).toBe('success');
    expect(engine.getResult('task-onboarding-1')?.summary).toContain('JTBD');
    expect(artifactRegistry.listByTask('task-onboarding-1')).toHaveLength(1);
    expect(auditLog.list()).toHaveLength(2);
    expect(auditLog.list()[1]?.run_id).toBe('run-1');
  });
});
