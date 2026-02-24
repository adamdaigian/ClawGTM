import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadAgentManifest } from '../../../packages/clawgtm-core/src/agent-manifest.ts';
import { ArtifactRegistry } from '../../../packages/clawgtm-core/src/artifact-registry.ts';
import { AuditLog } from '../../../packages/clawgtm-core/src/audit-log.ts';
import { TaskEngine } from '../../../packages/clawgtm-core/src/task-engine.ts';
import { SqliteAdapter } from '../../../packages/clawgtm-core/src/db.ts';
import { MockSlackClient } from '../../../packages/clawgtm-slack/src/slack-client.ts';
import { SlackGateway } from '../../../packages/clawgtm-slack/src/slack-gateway.ts';
import { ThreadMappingStore } from '../../../packages/clawgtm-slack/src/thread-mapping-store.ts';
import {
  runGrowthAnalyst,
  runHeadOfRevenue,
  runNarrative,
  runResearcher,
  validateJtbdFramework,
} from './agent-runners.ts';

export interface OnboardingRunInput {
  objective: string;
  channelId: string;
  workspaceRoot?: string;
}

export interface OnboardingRunOutput {
  runId: string;
  taskIds: string[];
  blocked: boolean;
  summaryPath: string;
}

export async function runOnboardingWorkflow(input: OnboardingRunInput): Promise<OnboardingRunOutput> {
  const workspaceRoot = input.workspaceRoot ?? process.cwd();
  const runId = `run-${randomUUID()}`;
  const manifest = loadAgentManifest(path.resolve(workspaceRoot, 'clawgtm/agents.manifest.yaml'));

  const db = new SqliteAdapter();
  const audit = new AuditLog(db, path.resolve(workspaceRoot, '.clawgtm/audit.log.jsonl'));
  const registry = new ArtifactRegistry(db);
  const engine = new TaskEngine(audit, registry);
  const slack = new SlackGateway(
    new MockSlackClient(),
    new ThreadMappingStore(db),
    input.channelId,
  );

  const taskIds: string[] = [];
  let blocked = false;

  const researcherTaskId = `task-researcher-${randomUUID()}`;
  taskIds.push(researcherTaskId);
  engine.createTask(makeTask(researcherTaskId, 'headofrevenue', 'P0', input.objective, [
    'analysis/market_landscape.md',
    'analysis/competitive_matrix.md',
    'analysis/icp_summary.md',
    'analysis/jtbd_framework.md',
  ]));
  await slack.postTaskUpdate({
    channelId: input.channelId,
    agentId: 'headofrevenue',
    taskId: researcherTaskId,
    runId,
    text: 'Onboarding step 1/4: Researcher started.',
  });
  const researcherArtifacts = await runResearcher(input.objective, workspaceRoot);
  engine.completeTask({
    runId,
    agentId: 'researcher',
    result: makeSuccessResult(researcherTaskId, 'Research baseline complete', researcherArtifacts),
  });
  await slack.postTaskUpdate({
    channelId: input.channelId,
    agentId: 'researcher',
    taskId: researcherTaskId,
    runId,
    text: 'Researcher completed market landscape, ICP summary, and JTBD framework.',
  });

  const narrativeTaskId = `task-narrative-${randomUUID()}`;
  taskIds.push(narrativeTaskId);
  engine.createTask(makeTask(narrativeTaskId, 'headofrevenue', 'P0', input.objective, [
    'narrative/positioning.md',
    'narrative/messaging_framework.md',
    'narrative/value_props.md',
  ]));
  await slack.postTaskUpdate({
    channelId: input.channelId,
    agentId: 'headofrevenue',
    taskId: narrativeTaskId,
    runId,
    text: 'Onboarding step 2/4: Narrative started.',
  });

  const jtbd = validateJtbdFramework(workspaceRoot);
  if (!jtbd.valid) {
    blocked = true;
    engine.completeTask({
      runId,
      agentId: 'narrative',
      result: {
        task_id: narrativeTaskId,
        status: 'blocked',
        summary: 'Narrative blocked: JTBD framework missing required sections',
        artifacts: [],
        metrics_impact: [],
        risks: ['Narrative quality risk from missing JTBD context'],
        dependencies: [{ type: 'agent', description: `Researcher must provide sections: ${jtbd.missing.join(', ')}` }],
        next_actions: [{ owner: 'agent', action: 'Escalate to Head of Revenue for reprioritization', due: null }],
        review_required: true,
      },
    });
    await slack.postTaskUpdate({
      channelId: input.channelId,
      agentId: 'narrative',
      taskId: narrativeTaskId,
      runId,
      text: `Narrative blocked. Missing JTBD sections: ${jtbd.missing.join(', ')}`,
    });
  } else {
    const narrativeArtifacts = await runNarrative(input.objective, workspaceRoot);
    engine.completeTask({
      runId,
      agentId: 'narrative',
      result: makeSuccessResult(narrativeTaskId, 'Narrative framework complete', narrativeArtifacts),
    });
    await slack.postTaskUpdate({
      channelId: input.channelId,
      agentId: 'narrative',
      taskId: narrativeTaskId,
      runId,
      text: 'Narrative completed positioning, messaging framework, and value props.',
    });
  }

  const growthTaskId = `task-growth-${randomUUID()}`;
  taskIds.push(growthTaskId);
  engine.createTask(makeTask(growthTaskId, 'headofrevenue', 'P1', input.objective, [
    'metrics/north_star_tree.md',
    'metrics/metrics_dictionary.md',
  ]));
  await slack.postTaskUpdate({
    channelId: input.channelId,
    agentId: 'headofrevenue',
    taskId: growthTaskId,
    runId,
    text: 'Onboarding step 3/4: Growth Analyst started.',
  });
  const growthArtifacts = await runGrowthAnalyst(workspaceRoot);
  engine.completeTask({
    runId,
    agentId: 'growth_analyst',
    result: makeSuccessResult(growthTaskId, 'Metrics architecture complete', growthArtifacts),
  });

  const horTaskId = `task-hor-${randomUUID()}`;
  taskIds.push(horTaskId);
  engine.createTask(makeTask(horTaskId, 'headofrevenue', 'P0', input.objective, [
    'gtm/strategy.md',
    'gtm/channel_plan.md',
    'gtm/experiment_backlog.md',
  ]));
  await slack.postTaskUpdate({
    channelId: input.channelId,
    agentId: 'headofrevenue',
    taskId: horTaskId,
    runId,
    text: 'Onboarding step 4/4: Head of Revenue synthesis in progress.',
  });
  const horArtifacts = await runHeadOfRevenue(input.objective, workspaceRoot);
  engine.completeTask({
    runId,
    agentId: 'headofrevenue',
    result: makeSuccessResult(horTaskId, 'GTM strategy package complete', horArtifacts),
  });

  const summaryPath = writeRunSummary({
    runId,
    taskIds,
    blocked,
    workspaceRoot,
    objective: input.objective,
    manifestAgentCount: manifest.agents.length,
    artifacts: registry.list(),
    auditEvents: audit.list(),
  });

  await slack.postTaskUpdate({
    channelId: input.channelId,
    agentId: 'headofrevenue',
    taskId: horTaskId,
    runId,
    text: `Onboarding workflow complete. Summary: ${summaryPath}`,
  });

  return {
    runId,
    taskIds,
    blocked,
    summaryPath,
  };
}

function makeTask(
  taskId: string,
  requestedBy: 'headofrevenue' | 'human',
  priority: 'P0' | 'P1' | 'P2',
  objective: string,
  outputPaths: string[],
) {
  const due = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  return {
    task_id: taskId,
    requested_by: requestedBy,
    priority,
    objective,
    context: {
      company: 'company/company_overview.md',
      audience: 'personas/primary_icp.md',
      constraints: 'company/constraints.md',
    },
    inputs: {
      docs: ['company/product_overview.md', 'metrics/target_metrics.md'],
      data: ['metrics/target_metrics.md'],
    },
    success_criteria: {
      metric: 'onboarding_quality',
      target: 'complete',
      timeframe: '1d',
    },
    deliverables: {
      artifacts: outputPaths,
      output_paths: outputPaths,
    },
    due: {
      soft_due: due,
      hard_due: null,
    },
    approval_required: true,
  };
}

function makeSuccessResult(taskId: string, summary: string, artifactPaths: string[]) {
  return {
    task_id: taskId,
    status: 'success' as const,
    summary,
    artifacts: artifactPaths.map((artifactPath) => ({
      type: 'doc',
      path: artifactPath,
      description: `Generated artifact ${artifactPath}`,
    })),
    metrics_impact: [{ metric: 'pipeline_coverage', expected_delta: '+10%', confidence: 'med' as const }],
    risks: [],
    dependencies: [],
    next_actions: [{ owner: 'agent' as const, action: 'Proceed to next workflow step', due: null }],
    review_required: false,
  };
}

function writeRunSummary(input: {
  runId: string;
  taskIds: string[];
  blocked: boolean;
  workspaceRoot: string;
  objective: string;
  manifestAgentCount: number;
  artifacts: unknown[];
  auditEvents: unknown[];
}): string {
  const outputDir = path.resolve(input.workspaceRoot, '.clawgtm/runs');
  mkdirSync(outputDir, { recursive: true });
  const summaryPath = path.resolve(outputDir, `${input.runId}.json`);
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        run_id: input.runId,
        objective: input.objective,
        blocked: input.blocked,
        task_ids: input.taskIds,
        manifest_agents: input.manifestAgentCount,
        artifacts: input.artifacts,
        audit_events: input.auditEvents,
      },
      null,
      2,
    ),
    'utf8',
  );
  return summaryPath;
}
