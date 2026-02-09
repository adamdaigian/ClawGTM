import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface BusinessContextInput {
  companyName: string;
  serviceSummary: string;
  objective: string;
  icp: string;
  constraints: string;
  pricing: string;
  targetMetrics: string;
}

export interface BusinessContextCaptureResult {
  writtenFiles: string[];
}

export function captureBusinessContext(
  input: BusinessContextInput,
  workspaceRoot = process.cwd(),
): BusinessContextCaptureResult {
  const docs = new Map<string, string>([
    [
      'company/company_overview.md',
      `# Company Overview\n\n## Name\n${input.companyName}\n\n## Mission\nDrive predictable growth through ClawGTM execution.\n\n## Core Objective\n${input.objective}\n`,
    ],
    [
      'company/product_overview.md',
      `# Product Overview\n\n## Product or Service\n${input.serviceSummary}\n\n## ICP\n${input.icp}\n\n## Growth Objective\n${input.objective}\n`,
    ],
    ['company/pricing.md', `# Pricing\n\n${input.pricing}\n`],
    ['company/constraints.md', `# Constraints\n\n${input.constraints}\n`],
    [
      'personas/primary_icp.md',
      `# Primary ICP\n\n## Persona\n${input.icp}\n\n## Buying Trigger\nNeed to improve revenue quality and consistency.\n`,
    ],
    ['metrics/target_metrics.md', `# Target Metrics\n\n${input.targetMetrics}\n`],
  ]);

  const writtenFiles: string[] = [];
  for (const [relativePath, contents] of docs.entries()) {
    const absolutePath = path.resolve(workspaceRoot, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
    writtenFiles.push(relativePath);
  }

  return { writtenFiles };
}
