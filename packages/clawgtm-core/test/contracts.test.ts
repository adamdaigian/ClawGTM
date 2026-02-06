import { describe, expect, it } from 'vitest';
import { validateResult, validateTask } from '../src/contracts.js';

describe('contracts', () => {
  it('accepts exact task schema', () => {
    expect(() =>
      validateTask({
        task_id: 'task-1',
        requested_by: 'headofrevenue',
        priority: 'P1',
        objective: 'Create strategy',
        context: {
          company: 'company/company_overview.md',
          audience: 'personas/icp.md',
          constraints: 'company/constraints.md',
        },
        inputs: {
          docs: ['analysis/jtbd_framework.md'],
          data: ['metrics/target_metrics.md'],
        },
        success_criteria: {
          metric: 'pipeline_coverage',
          target: '1.2x',
          timeframe: '30d',
        },
        deliverables: {
          artifacts: ['strategy'],
          output_paths: ['gtm/strategy.md'],
        },
        due: {
          soft_due: '2026-02-06T12:00:00.000Z',
          hard_due: null,
        },
        approval_required: true,
      }),
    ).not.toThrow();
  });

  it('rejects invalid result schema', () => {
    expect(() =>
      validateResult({
        task_id: 'task-1',
        status: 'success',
        summary: 'Done',
        artifacts: [{ type: 'doc', path: '', description: 'missing' }],
        metrics_impact: [],
        risks: [],
        dependencies: [],
        next_actions: [],
        review_required: false,
      }),
    ).toThrow(/type and path/);
  });
});
