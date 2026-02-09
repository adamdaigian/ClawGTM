import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captureBusinessContext } from '../src/context-capture.ts';
import { runOnboardingWorkflow } from '../src/onboarding-orchestrator.ts';

describe('runOnboardingWorkflow', () => {
  it('produces required onboarding artifacts and run summary', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'clawgtm-onboard-'));

    try {
      mkdirSync(path.resolve(root, 'clawgtm'), { recursive: true });
      const manifestSource = readFileSync(path.resolve('clawgtm/agents.manifest.yaml'), 'utf8');
      writeFileSync(path.resolve(root, 'clawgtm/agents.manifest.yaml'), manifestSource, 'utf8');

      captureBusinessContext(
        {
          companyName: 'Acme',
          serviceSummary: 'AI sales assistant',
          objective: 'Increase qualified pipeline by 30%',
          icp: 'VP Sales at B2B SaaS',
          constraints: 'No outbound without approval',
          pricing: '$99/mo per seat',
          targetMetrics: 'Pipeline coverage >= 3x',
        },
        root,
      );

      const result = await runOnboardingWorkflow({
        objective: 'Increase qualified pipeline by 30%',
        channelId: 'C-WAR-ROOM',
        workspaceRoot: root,
      });

      expect(result.blocked).toBe(false);
      expect(result.taskIds).toHaveLength(4);

      expect(readFileSync(path.resolve(root, 'analysis/jtbd_framework.md'), 'utf8')).toContain(
        '## Switching forces',
      );
      expect(readFileSync(path.resolve(root, 'narrative/positioning.md'), 'utf8')).toContain(
        'Objective alignment',
      );
      expect(readFileSync(path.resolve(root, 'gtm/strategy.md'), 'utf8')).toContain('Objective:');

      const summary = JSON.parse(readFileSync(result.summaryPath, 'utf8')) as {
        artifacts: unknown[];
        audit_events: unknown[];
      };
      expect(summary.artifacts.length).toBeGreaterThanOrEqual(12);
      expect(summary.audit_events.length).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
