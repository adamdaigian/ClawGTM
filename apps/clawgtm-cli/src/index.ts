#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { captureBusinessContext } from '../../clawgtm-orchestrator/src/context-capture.ts';
import { runOnboardingWorkflow } from '../../clawgtm-orchestrator/src/onboarding-orchestrator.ts';
import { createCliContext } from './context.ts';
import { OAuthStateStore } from './oauth-state-store.ts';
import { runWizard } from './wizard.ts';
import type { OAuthProviderName } from '../../../packages/clawgtm-auth/src/contracts.ts';

function readFlag(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

function requireFlag(args: string[], name: string): string {
  const value = readFlag(args, name);
  if (!value) {
    throw new Error(`Missing required flag: ${name}`);
  }
  return value;
}

function isOAuthProvider(value: string): value is OAuthProviderName {
  return value === 'gmail' || value === 'calendar' || value === 'slack';
}

async function handleAuth(args: string[]): Promise<void> {
  const provider = args[1] ?? '';
  if (!isOAuthProvider(provider)) {
    throw new Error('Usage: clawgtm auth <gmail|calendar|slack> --agent <agent_slug> [--mode mock|real] [--code <code> --state <state>]');
  }

  const modeRaw = readFlag(args, '--mode') ?? 'mock';
  const mode = modeRaw === 'real' ? 'real' : 'mock';
  const agent = requireFlag(args, '--agent');
  const context = createCliContext(mode);
  const stateStore = new OAuthStateStore();

  const code = readFlag(args, '--code');
  const explicitState = readFlag(args, '--state');

  if (!code) {
    const start = await context.oauth.startAuth(agent, provider);
    stateStore.put({ agent, provider, state: start.state });
    console.log(JSON.stringify({
      step: 'start',
      provider,
      agent,
      mode,
      authorization_url: start.authorization_url,
      state: start.state,
      next: `Run: clawgtm auth ${provider} --agent ${agent} --mode ${mode} --code <oauth_code> --state ${start.state}`,
    }, null, 2));
    return;
  }

  const pending = stateStore.take({ agent, provider });
  const state = explicitState ?? pending?.state;
  if (!state) {
    throw new Error(
      `No pending OAuth state found for ${provider}/${agent}. Run start first or pass --state.`,
    );
  }

  if (explicitState && pending && explicitState !== pending.state) {
    throw new Error('Provided --state does not match stored pending OAuth state.');
  }

  const token = await context.oauth.completeAuth({
    agentSlug: agent,
    provider,
    code,
    state,
  });

  console.log(JSON.stringify({
    step: 'complete',
    provider,
    agent,
    mode,
    stored: true,
    scope: token.scope,
    expires_at: token.expires_at,
  }, null, 2));
}

async function handleApprove(args: string[]): Promise<void> {
  const subcommand = args[1] ?? '';
  const modeRaw = readFlag(args, '--mode') ?? 'mock';
  const mode = modeRaw === 'real' ? 'real' : 'mock';
  const context = createCliContext(mode);

  if (subcommand === 'propose') {
    const request = context.approvals.propose({
      requestedBy: (readFlag(args, '--requested-by') === 'agent' ? 'agent' : 'human'),
      agentId: requireFlag(args, '--agent'),
      taskId: requireFlag(args, '--task'),
      runId: requireFlag(args, '--run'),
      actionType: requireFlag(args, '--action'),
      target: requireFlag(args, '--target'),
      payload: readFlag(args, '--payload') ?? '{}',
    });

    console.log(JSON.stringify({
      step: 'proposed',
      request_id: request.request_id,
      status: request.status,
    }, null, 2));
    return;
  }

  if (subcommand === 'decision') {
    const requestId = requireFlag(args, '--request');
    const decision = requireFlag(args, '--decision');
    const decidedBy = requireFlag(args, '--by');

    const updated =
      decision === 'approve'
        ? context.approvals.approve(requestId, decidedBy)
        : context.approvals.reject(requestId, decidedBy);

    console.log(JSON.stringify({
      step: 'decision',
      request_id: updated.request_id,
      status: updated.status,
      decision_by: updated.decision_by,
      decision_at: updated.decision_at,
    }, null, 2));
    return;
  }

  if (subcommand === 'execute') {
    const requestId = requireFlag(args, '--request');
    const outcome = await context.approvals.executeApproved(requestId, async () => ({
      executed: true,
      executed_at: new Date().toISOString(),
      note: readFlag(args, '--note') ?? 'approved external action executed in mock mode',
    }));

    console.log(JSON.stringify({
      step: 'execute',
      request_id: requestId,
      status: context.approvals.get(requestId)?.status,
      outcome,
    }, null, 2));
    return;
  }

  throw new Error(
    'Usage: clawgtm approve <propose|decision|execute> ...\n' +
      '  propose: --action --agent --task --run --target [--payload] [--requested-by]\n' +
      '  decision: --request --decision <approve|reject> --by <owner>\n' +
      '  execute: --request [--note]',
  );
}

async function handleOnboard(args: string[]): Promise<void> {
  const subcommand = args[1] ?? '';

  // No subcommand = run the interactive wizard
  if (!subcommand || subcommand.startsWith('--')) {
    const skipInfra = args.includes('--skip-infra');
    const skipOAuth = args.includes('--skip-oauth');
    const mock = args.includes('--mock');
    const workspaceRoot = readFlag(args, '--workspace-root') ?? process.cwd();
    
    await runWizard({ skipInfra, skipOAuth, mock, workspaceRoot });
    return;
  }

  if (subcommand === 'context' || subcommand === 'full') {
    const workspaceRoot = readFlag(args, '--workspace-root') ?? process.cwd();
    const contextResult = captureBusinessContext({
      companyName: requireFlag(args, '--company-name'),
      serviceSummary: requireFlag(args, '--service-summary'),
      objective: requireFlag(args, '--objective'),
      icp: requireFlag(args, '--icp'),
      constraints: readFlag(args, '--constraints') ?? 'No autonomous external actions without approval.',
      pricing: readFlag(args, '--pricing') ?? 'TBD',
      targetMetrics: readFlag(args, '--target-metrics') ?? 'Define north-star + leading indicators.',
    }, workspaceRoot);

    console.log(JSON.stringify({
      step: 'context-captured',
      written_files: contextResult.writtenFiles,
    }, null, 2));

    if (subcommand === 'context') {
      return;
    }
  }

  if (subcommand === 'run' || subcommand === 'full') {
    const result = await runOnboardingWorkflow({
      objective: requireFlag(args, '--objective'),
      channelId: readFlag(args, '--channel') ?? 'C-CLAWGTM-WAR-ROOM',
      workspaceRoot: readFlag(args, '--workspace-root') ?? process.cwd(),
    });

    console.log(JSON.stringify({
      step: 'onboarding-complete',
      run_id: result.runId,
      task_ids: result.taskIds,
      blocked: result.blocked,
      summary_path: result.summaryPath,
    }, null, 2));
    return;
  }

  throw new Error(
    'Usage: clawgtm onboard [--skip-infra] [--skip-oauth] [--mock] [--workspace-root <path>]\n' +
      '       clawgtm onboard <context|run|full> ...\n' +
      '\n' +
      '  No subcommand: Run interactive wizard\n' +
      '  context/full flags: --company-name --service-summary --objective --icp [--constraints] [--pricing] [--target-metrics] [--workspace-root]\n' +
      '  run/full flags: --objective [--channel] [--workspace-root]',
  );
}

export async function runCli(args: string[]): Promise<void> {
  const command = args[0];

  if (command === 'auth') {
    await handleAuth(args);
    return;
  }

  if (command === 'approve') {
    await handleApprove(args);
    return;
  }

  if (command === 'onboard') {
    await handleOnboard(args);
    return;
  }

  throw new Error('Usage: clawgtm <auth|approve|onboard> ...');
}

const argv1 = process.argv[1];
if (argv1 && import.meta.url === pathToFileURL(argv1).href) {
  runCli(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
