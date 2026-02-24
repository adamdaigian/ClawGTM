import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { generateWithLLM, AGENT_PERSONAS, OUTPUT_FORMATS } from './llm-client.ts';

function writeArtifact(relativePath: string, content: string, workspaceRoot = process.cwd()): void {
  const absolute = path.resolve(workspaceRoot, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function readDoc(relativePath: string, workspaceRoot = process.cwd()): string {
  const absolute = path.resolve(workspaceRoot, relativePath);
  if (!existsSync(absolute)) {
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function readAllDocs(patterns: string[], workspaceRoot = process.cwd()): string {
  const contents: string[] = [];
  for (const pattern of patterns) {
    const content = readDoc(pattern, workspaceRoot);
    if (content) {
      contents.push(`--- ${pattern} ---\n${content}\n`);
    }
  }
  return contents.join('\n');
}

/**
 * RESEARCHER AGENT
 * Phase 1: Produces market research, competitive analysis, and JTBD framework
 */
export async function runResearcher(contextObjective: string, workspaceRoot = process.cwd()): Promise<string[]> {
  // Read business context
  const businessOverview = readDoc('company/business_overview.md', workspaceRoot) 
    || readDoc('company/company_overview.md', workspaceRoot)
    || readDoc('MASTERPLAN.md', workspaceRoot);
  
  const context = `## Business Context
${businessOverview}

## Objective
${contextObjective}

Based on this business context, conduct thorough research and analysis.`;

  const artifacts: { path: string; format: keyof typeof OUTPUT_FORMATS }[] = [
    { path: 'analysis/market_opportunities.md', format: 'market_opportunities' },
    { path: 'analysis/competitors.md', format: 'competitors' },
    { path: 'analysis/pain_points.md', format: 'pain_points' },
    { path: 'analysis/jtbd_framework.md', format: 'jtbd_framework' },
    { path: 'analysis/current_solutions.md', format: 'current_solutions' },
  ];

  const generatedPaths: string[] = [];

  for (const artifact of artifacts) {
    console.log(`[Researcher] Generating ${artifact.path}...`);
    
    const content = await generateWithLLM({
      role: 'Researcher',
      persona: AGENT_PERSONAS.researcher,
      task: `Generate a comprehensive ${artifact.format.replace(/_/g, ' ')} document based on the business context provided.`,
      context,
      outputFormat: OUTPUT_FORMATS[artifact.format],
    });

    writeArtifact(artifact.path, content, workspaceRoot);
    generatedPaths.push(artifact.path);
  }

  return generatedPaths;
}

/**
 * Validates that the JTBD framework has all required sections
 */
export function validateJtbdFramework(workspaceRoot = process.cwd()): { valid: boolean; missing: string[] } {
  const requiredSections = [
    '## Job (primary job statement)',
    '## Situation (triggering context)',
    '## Desired outcome',
    '## Current solutions',
    '## Frictions',
    '## Emotional & social jobs',
    '## Purchase triggers',
    '## Success criteria',
    '## Switching forces',
  ];

  let content = '';
  try {
    content = readDoc('analysis/jtbd_framework.md', workspaceRoot);
  } catch {
    return { valid: false, missing: [...requiredSections] };
  }

  if (!content) {
    return { valid: false, missing: [...requiredSections] };
  }

  const missing = requiredSections.filter((heading) => !content.toLowerCase().includes(heading.toLowerCase()));
  return { valid: missing.length === 0, missing };
}

/**
 * NARRATIVE AGENT
 * Phase 2: Produces positioning, messaging framework, and ICP documents
 */
export async function runNarrative(contextObjective: string, workspaceRoot = process.cwd()): Promise<string[]> {
  // Read business context + research outputs
  const businessOverview = readDoc('company/business_overview.md', workspaceRoot)
    || readDoc('company/company_overview.md', workspaceRoot)
    || readDoc('MASTERPLAN.md', workspaceRoot);
  
  const researchDocs = readAllDocs([
    'analysis/market_opportunities.md',
    'analysis/competitors.md',
    'analysis/pain_points.md',
    'analysis/jtbd_framework.md',
    'analysis/current_solutions.md',
  ], workspaceRoot);

  const context = `## Business Context
${businessOverview}

## Research & Analysis (from Researcher agent)
${researchDocs}

## Objective
${contextObjective}

Based on this business context and research, develop positioning and messaging.`;

  const generatedPaths: string[] = [];

  // Generate positioning
  console.log('[Narrative] Generating narrative/positioning.md...');
  const positioning = await generateWithLLM({
    role: 'Narrative Engineer',
    persona: AGENT_PERSONAS.narrative,
    task: 'Create a comprehensive positioning and value proposition document that will serve as the foundation for all marketing and sales messaging.',
    context,
    outputFormat: OUTPUT_FORMATS.positioning,
  });
  writeArtifact('narrative/positioning.md', positioning, workspaceRoot);
  generatedPaths.push('narrative/positioning.md');

  // Generate messaging framework
  console.log('[Narrative] Generating narrative/messaging_framework.md...');
  const messaging = await generateWithLLM({
    role: 'Narrative Engineer',
    persona: AGENT_PERSONAS.narrative,
    task: 'Create a detailed messaging framework that provides clear, actionable guidance for all customer-facing communications.',
    context: context + `\n\n## Positioning (just created)\n${positioning}`,
    outputFormat: OUTPUT_FORMATS.messaging_framework,
  });
  writeArtifact('narrative/messaging_framework.md', messaging, workspaceRoot);
  generatedPaths.push('narrative/messaging_framework.md');

  // Generate core ICP
  console.log('[Narrative] Generating icp/core_icp.md...');
  const coreIcp = await generateWithLLM({
    role: 'Narrative Engineer',
    persona: AGENT_PERSONAS.narrative,
    task: 'Create a detailed Ideal Customer Profile (ICP) document for the PRIMARY target buyer. This should be the single most important persona for the business.',
    context,
    outputFormat: OUTPUT_FORMATS.icp,
  });
  writeArtifact('icp/core_icp.md', coreIcp, workspaceRoot);
  generatedPaths.push('icp/core_icp.md');

  // Generate adjacent ICP
  console.log('[Narrative] Generating icp/adjacent_icp_1.md...');
  const adjacentIcp = await generateWithLLM({
    role: 'Narrative Engineer',
    persona: AGENT_PERSONAS.narrative,
    task: 'Create a detailed Ideal Customer Profile (ICP) document for a SECONDARY target buyer. This should be an adjacent persona who also benefits from the product but is not the primary target.',
    context,
    outputFormat: OUTPUT_FORMATS.icp,
  });
  writeArtifact('icp/adjacent_icp_1.md', adjacentIcp, workspaceRoot);
  generatedPaths.push('icp/adjacent_icp_1.md');

  return generatedPaths;
}

/**
 * GROWTH ANALYST AGENT
 * Produces metrics architecture and north star tree
 */
export async function runGrowthAnalyst(workspaceRoot = process.cwd()): Promise<string[]> {
  const businessOverview = readDoc('company/business_overview.md', workspaceRoot)
    || readDoc('company/company_overview.md', workspaceRoot)
    || readDoc('MASTERPLAN.md', workspaceRoot);
  
  const context = `## Business Context
${businessOverview}

Develop a metrics architecture that will guide the company's growth.`;

  const generatedPaths: string[] = [];

  console.log('[Growth Analyst] Generating metrics/north_star_tree.md...');
  const northStar = await generateWithLLM({
    role: 'Growth Analyst',
    persona: AGENT_PERSONAS.growth_analyst,
    task: 'Define the north star metric and create a metrics tree showing how all key metrics ladder up to it.',
    context,
    outputFormat: `# North Star Tree

## North Star Metric
[The single metric that best captures the value you deliver to customers]

## Metric Tree
Show how metrics flow from north star down to leading indicators:

North Star
├── Level 1 Metrics (direct drivers)
│   ├── Level 2 Metrics
│   │   └── Level 3 Metrics (leading indicators)

## Metric Definitions
For each metric:
- Name
- Definition
- Calculation
- Data source
- Owner
- Target`,
  });
  writeArtifact('metrics/north_star_tree.md', northStar, workspaceRoot);
  generatedPaths.push('metrics/north_star_tree.md');

  console.log('[Growth Analyst] Generating metrics/metrics_dictionary.md...');
  const dictionary = await generateWithLLM({
    role: 'Growth Analyst',
    persona: AGENT_PERSONAS.growth_analyst,
    task: 'Create a comprehensive metrics dictionary defining all key business metrics.',
    context,
    outputFormat: `# Metrics Dictionary

## Revenue Metrics
| Metric | Definition | Calculation | Frequency |
|--------|------------|-------------|-----------|

## Growth Metrics
| Metric | Definition | Calculation | Frequency |
|--------|------------|-------------|-----------|

## Efficiency Metrics
| Metric | Definition | Calculation | Frequency |
|--------|------------|-------------|-----------|

## Detailed Definitions
For each key metric, provide:
- Business definition
- Technical calculation
- Caveats/edge cases
- Historical context`,
  });
  writeArtifact('metrics/metrics_dictionary.md', dictionary, workspaceRoot);
  generatedPaths.push('metrics/metrics_dictionary.md');

  return generatedPaths;
}

/**
 * HEAD OF REVENUE AGENT
 * Phase 3: Produces GTM strategy, channel plan, and experiment backlog
 */
export async function runHeadOfRevenue(contextObjective: string, workspaceRoot = process.cwd()): Promise<string[]> {
  // Read all context from previous phases
  const businessOverview = readDoc('company/business_overview.md', workspaceRoot)
    || readDoc('company/company_overview.md', workspaceRoot)
    || readDoc('MASTERPLAN.md', workspaceRoot);

  const researchDocs = readAllDocs([
    'analysis/market_opportunities.md',
    'analysis/competitors.md',
    'analysis/pain_points.md',
    'analysis/jtbd_framework.md',
    'analysis/current_solutions.md',
  ], workspaceRoot);

  const narrativeDocs = readAllDocs([
    'narrative/positioning.md',
    'narrative/messaging_framework.md',
  ], workspaceRoot);

  const icpDocs = readAllDocs([
    'icp/core_icp.md',
    'icp/adjacent_icp_1.md',
  ], workspaceRoot);

  const context = `## Business Context
${businessOverview}

## Research & Analysis
${researchDocs}

## Positioning & Messaging
${narrativeDocs}

## Ideal Customer Profiles
${icpDocs}

## Objective
${contextObjective}

Based on all this context, develop a comprehensive GTM strategy.`;

  const generatedPaths: string[] = [];

  // Generate GTM strategy
  console.log('[Head of Revenue] Generating gtm/strategy.md...');
  const strategy = await generateWithLLM({
    role: 'Head of Revenue',
    persona: AGENT_PERSONAS.headofrevenue,
    task: 'Create a comprehensive go-to-market strategy that synthesizes all the research, positioning, and ICP work into an actionable revenue growth plan.',
    context,
    outputFormat: OUTPUT_FORMATS.gtm_strategy,
  });
  writeArtifact('gtm/strategy.md', strategy, workspaceRoot);
  generatedPaths.push('gtm/strategy.md');

  // Generate channel plan
  console.log('[Head of Revenue] Generating gtm/channel_plan.md...');
  const channelPlan = await generateWithLLM({
    role: 'Head of Revenue',
    persona: AGENT_PERSONAS.headofrevenue,
    task: 'Create a detailed channel plan that specifies how to execute the GTM strategy across different acquisition channels.',
    context: context + `\n\n## GTM Strategy (just created)\n${strategy}`,
    outputFormat: OUTPUT_FORMATS.channel_plan,
  });
  writeArtifact('gtm/channel_plan.md', channelPlan, workspaceRoot);
  generatedPaths.push('gtm/channel_plan.md');

  // Generate experiment backlog
  console.log('[Head of Revenue] Generating gtm/experiment_backlog.md...');
  const experiments = await generateWithLLM({
    role: 'Head of Revenue',
    persona: AGENT_PERSONAS.headofrevenue,
    task: 'Create a prioritized backlog of GTM experiments that will help validate and optimize the strategy.',
    context: context + `\n\n## GTM Strategy\n${strategy}\n\n## Channel Plan\n${channelPlan}`,
    outputFormat: OUTPUT_FORMATS.experiment_backlog,
  });
  writeArtifact('gtm/experiment_backlog.md', experiments, workspaceRoot);
  generatedPaths.push('gtm/experiment_backlog.md');

  return generatedPaths;
}

// Backward-compatible sync wrappers for existing orchestrator
// These will log a warning and return empty arrays - the orchestrator should be updated to use async versions
export function runResearcherSync(contextObjective: string, workspaceRoot = process.cwd()): string[] {
  console.warn('[DEPRECATED] runResearcherSync called - use async runResearcher instead');
  return [];
}

export function runNarrativeSync(contextObjective: string, workspaceRoot = process.cwd()): string[] {
  console.warn('[DEPRECATED] runNarrativeSync called - use async runNarrative instead');
  return [];
}

export function runGrowthAnalystSync(workspaceRoot = process.cwd()): string[] {
  console.warn('[DEPRECATED] runGrowthAnalystSync called - use async runGrowthAnalyst instead');
  return [];
}

export function runHeadOfRevenueSync(contextObjective: string, workspaceRoot = process.cwd()): string[] {
  console.warn('[DEPRECATED] runHeadOfRevenueSync called - use async runHeadOfRevenue instead');
  return [];
}
