export type OAuthProviderName = 'gmail' | 'calendar' | 'slack';

export interface OAuthTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
}

export interface OAuthStartResult {
  provider: OAuthProviderName;
  authorization_url: string;
  state: string;
}

export interface OAuthProviderAdapter {
  readonly provider: OAuthProviderName;
  readonly defaultScopes: string[];
  startAuth(agentSlug: string): Promise<OAuthStartResult>;
  completeAuth(input: {
    agentSlug: string;
    code: string;
    state: string;
  }): Promise<OAuthTokenPayload>;
}

export interface StoredOAuthToken {
  agent_slug: string;
  provider: OAuthProviderName;
  encrypted_payload: string;
  created_at: string;
  updated_at: string;
}
