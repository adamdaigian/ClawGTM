import { GoogleWorkspaceAdapter } from './google-workspace.js';
import { M365StubAdapter } from './m365-stub.js';
import type { IdentityProviderAdapter } from './contracts.js';

export type IdentityProviderName = 'google-workspace' | 'm365-stub';

interface CreateIdentityAdapterOptions {
  provider: IdentityProviderName;
  orgDomain: string;
  mode?: 'mock' | 'real';
  accessTokenProvider?: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

export function createIdentityAdapter(options: CreateIdentityAdapterOptions): IdentityProviderAdapter {
  if (options.provider === 'google-workspace') {
    return new GoogleWorkspaceAdapter({
      orgDomain: options.orgDomain,
      mode: options.mode ?? 'mock',
      accessTokenProvider: options.accessTokenProvider,
      fetchImpl: options.fetchImpl,
    });
  }

  return new M365StubAdapter({ orgDomain: options.orgDomain });
}
