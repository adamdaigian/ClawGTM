import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function writeArtifact(relativePath: string, content: string, workspaceRoot = process.cwd()): void {
  const absolute = path.resolve(workspaceRoot, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function readDoc(relativePath: string, workspaceRoot = process.cwd()): string {
  return readFileSync(path.resolve(workspaceRoot, relativePath), 'utf8');
}

export function runResearcher(contextObjective: string, workspaceRoot = process.cwd()): string[] {
  const generated = [
    {
      path: 'analysis/market_landscape.md',
      content: `# Market Landscape\n\nObjective alignment: ${contextObjective}\n\n- Market tailwinds\n- Buyer pressure\n- Category dynamics\n`,
    },
    {
      path: 'analysis/competitive_matrix.md',
      content: `# Competitive Matrix\n\n| Competitor | Positioning | Weakness |\n| --- | --- | --- |\n| Incumbent A | Broad suite | Slow onboarding |\n| Challenger B | Lower price | Weaker analytics |\n`,
    },
    {
      path: 'analysis/icp_summary.md',
      content: `# ICP Summary\n\n- Core buyer\n- Evaluation criteria\n- Channel preference\n`,
    },
    {
      path: 'analysis/jtbd_framework.md',
      content: `# JTBD Framework\n\n## Job (primary job statement)\nHelp revenue leaders turn strategy into repeatable pipeline growth.\n\n## Situation (triggering context)\nGrowth has stalled while GTM activity is fragmented across teams and tools.\n\n## Desired outcome\nA coordinated GTM motion that improves qualified pipeline velocity and conversion quality.\n\n## Current solutions\nManual planning docs, disconnected campaign tooling, and ad hoc sales playbooks.\n\n## Frictions\nInconsistent messaging, unclear ownership, and lagging feedback loops.\n\n## Emotional & social jobs\nLeaders need confidence, team alignment, and internal credibility with exec peers.\n\n## Purchase triggers\nMissed quarterly targets, rising CAC, and mounting pressure to show efficient growth.\n\n## Success criteria\nHigher pipeline coverage, faster experiment cycles, and stronger stage conversion.\n\n## Switching forces\n- Push: Existing GTM process is too slow and inconsistent.\n- Pull: A coordinated autonomous team improves speed and consistency.\n- Anxiety: Concern about model quality and external messaging risk.\n- Habit: Teams default to old planning rituals and spreadsheet workflows.\n`,
    },
  ];

  for (const artifact of generated) {
    writeArtifact(artifact.path, artifact.content, workspaceRoot);
  }
  return generated.map((artifact) => artifact.path);
}

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

  const missing = requiredSections.filter((heading) => !content.includes(heading));
  return { valid: missing.length === 0, missing };
}

export function runNarrative(contextObjective: string, workspaceRoot = process.cwd()): string[] {
  const generated = [
    {
      path: 'narrative/positioning.md',
      content: `# Positioning\n\nClawGTM positions the business as the fastest path from insight to GTM execution.\n\nObjective alignment: ${contextObjective}\n`,
    },
    {
      path: 'narrative/messaging_framework.md',
      content: '# Messaging Framework\n\n## Core message\nClear value narrative tied to measurable revenue impact.\n',
    },
    {
      path: 'narrative/value_props.md',
      content: '# Value Propositions\n\n- Faster decision-to-execution loop\n- Stronger GTM consistency\n- Better conversion quality\n',
    },
  ];
  for (const artifact of generated) {
    writeArtifact(artifact.path, artifact.content, workspaceRoot);
  }
  return generated.map((artifact) => artifact.path);
}

export function runGrowthAnalyst(workspaceRoot = process.cwd()): string[] {
  const generated = [
    {
      path: 'metrics/north_star_tree.md',
      content: '# North Star Tree\n\nNorth Star: Qualified Pipeline Created\n\n- Leading indicators\n- Conversion indicators\n- Efficiency indicators\n',
    },
    {
      path: 'metrics/metrics_dictionary.md',
      content: '# Metrics Dictionary\n\n- Qualified pipeline\n- Win rate\n- Sales cycle\n- CAC payback\n',
    },
  ];
  for (const artifact of generated) {
    writeArtifact(artifact.path, artifact.content, workspaceRoot);
  }
  return generated.map((artifact) => artifact.path);
}

export function runHeadOfRevenue(contextObjective: string, workspaceRoot = process.cwd()): string[] {
  const generated = [
    {
      path: 'gtm/strategy.md',
      content: `# GTM Strategy\n\nObjective: ${contextObjective}\n\n- ICP focus\n- Narrative strategy\n- Execution sequencing\n`,
    },
    {
      path: 'gtm/channel_plan.md',
      content: '# Channel Plan\n\n- Organic social\n- Founder-led outbound\n- Partner co-marketing\n',
    },
    {
      path: 'gtm/experiment_backlog.md',
      content: '# Experiment Backlog\n\n1. Reposition homepage for ICP problem language\n2. Outbound sequence variant by JTBD segment\n3. Webinar partnership pilot\n',
    },
  ];
  for (const artifact of generated) {
    writeArtifact(artifact.path, artifact.content, workspaceRoot);
  }
  return generated.map((artifact) => artifact.path);
}
