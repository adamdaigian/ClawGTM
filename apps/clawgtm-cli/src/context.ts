import path from 'node:path';
import { createOAuthProviders } from '../../../packages/clawgtm-auth/src/providers.ts';
import { AgentOAuthService } from '../../../packages/clawgtm-auth/src/service.ts';
import { PersistentOAuthTokenStore } from '../../../packages/clawgtm-auth/src/token-store.ts';

export interface CliContext {
  oauth: AgentOAuthService;
}

export function createCliContext(mode: 'mock' | 'real'): CliContext {
  const tokenStore = new PersistentOAuthTokenStore({
    masterKey: process.env.CLAWGTM_MASTER_KEY ?? 'clawgtm-dev-insecure-master-key-change-me',
    storagePath: process.env.CLAWGTM_TOKEN_STORE_PATH ?? path.resolve('.clawgtm/tokens.enc.json'),
  });

  const providers = createOAuthProviders({
    mode,
    googleClientId: process.env.CLAWGTM_GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.CLAWGTM_GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.CLAWGTM_GOOGLE_REDIRECT_URI,
    slackClientId: process.env.CLAWGTM_SLACK_CLIENT_ID,
    slackClientSecret: process.env.CLAWGTM_SLACK_CLIENT_SECRET,
    slackRedirectUri: process.env.CLAWGTM_SLACK_REDIRECT_URI,
  });

  return {
    oauth: new AgentOAuthService({ tokenStore, providers }),
  };
}
