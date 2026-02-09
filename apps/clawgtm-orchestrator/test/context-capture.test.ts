import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captureBusinessContext } from '../src/context-capture.ts';

describe('captureBusinessContext', () => {
  it('writes required onboarding input docs from business context', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'clawgtm-context-'));
    try {
      const result = captureBusinessContext(
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

      expect(result.writtenFiles).toContain('company/company_overview.md');
      const overview = readFileSync(path.resolve(root, 'company/company_overview.md'), 'utf8');
      expect(overview).toContain('Acme');
      expect(overview).toContain('Increase qualified pipeline');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
