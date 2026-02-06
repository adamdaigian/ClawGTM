#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { createCliContext } from './context.ts';
import { OAuthStateStore } from './oauth-state-store.ts';
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

export async function runCli(args: string[]): Promise<void> {
  const command = args[0];

  if (command === 'auth') {
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
    return;
  }

  throw new Error('Usage: clawgtm <auth> ...');
}

const argv1 = process.argv[1];
if (argv1 && import.meta.url === pathToFileURL(argv1).href) {
  runCli(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
