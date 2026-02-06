import type { OAuthProviderAdapter, OAuthProviderName, OAuthStartResult, OAuthTokenPayload } from './contracts.ts';
import { PersistentOAuthTokenStore } from './token-store.ts';

export interface OAuthServiceOptions {
  tokenStore: PersistentOAuthTokenStore;
  providers: Record<OAuthProviderName, OAuthProviderAdapter>;
}

export class AgentOAuthService {
  private readonly options: OAuthServiceOptions;

  constructor(options: OAuthServiceOptions) {
    this.options = options;
  }

  async startAuth(agentSlug: string, provider: OAuthProviderName): Promise<OAuthStartResult> {
    return this.provider(provider).startAuth(agentSlug);
  }

  async completeAuth(input: {
    agentSlug: string;
    provider: OAuthProviderName;
    code: string;
    state: string;
  }): Promise<OAuthTokenPayload> {
    const providerAdapter = this.provider(input.provider);
    const tokenPayload = await providerAdapter.completeAuth({
      agentSlug: input.agentSlug,
      code: input.code,
      state: input.state,
    });

    this.options.tokenStore.upsert(input.agentSlug, input.provider, tokenPayload);
    return tokenPayload;
  }

  getStoredToken(agentSlug: string, provider: OAuthProviderName): OAuthTokenPayload | null {
    return this.options.tokenStore.get(agentSlug, provider);
  }

  revoke(agentSlug: string, provider?: OAuthProviderName): number {
    return this.options.tokenStore.revoke(agentSlug, provider);
  }

  private provider(name: OAuthProviderName): OAuthProviderAdapter {
    const provider = this.options.providers[name];
    if (!provider) {
      throw new Error(`OAuth provider unavailable: ${name}`);
    }
    return provider;
  }
}
