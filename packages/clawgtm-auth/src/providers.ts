import { randomUUID } from 'node:crypto';
import type { OAuthProviderAdapter, OAuthProviderName, OAuthStartResult, OAuthTokenPayload } from './contracts.ts';

abstract class BaseOAuthProvider implements OAuthProviderAdapter {
  abstract readonly provider: OAuthProviderName;
  abstract readonly defaultScopes: string[];

  async startAuth(agentSlug: string): Promise<OAuthStartResult> {
    const state = randomUUID();

    return {
      provider: this.provider,
      authorization_url: this.buildAuthorizationUrl(state, agentSlug),
      state,
    };
  }

  async completeAuth(input: {
    agentSlug: string;
    code: string;
    state: string;
  }): Promise<OAuthTokenPayload> {
    if (!input.agentSlug || !input.code || !input.state) {
      throw new Error(`OAuth completion requires agentSlug, code, and state for ${this.provider}`);
    }

    return this.exchangeCode(input.code);
  }

  protected abstract buildAuthorizationUrl(state: string, agentSlug: string): string;
  protected abstract exchangeCode(code: string): Promise<OAuthTokenPayload>;
}

export class MockOAuthProvider extends BaseOAuthProvider {
  readonly provider: OAuthProviderName;
  readonly defaultScopes: string[];

  constructor(provider: OAuthProviderName, defaultScopes: string[]) {
    super();
    this.provider = provider;
    this.defaultScopes = defaultScopes;
  }

  protected buildAuthorizationUrl(state: string, agentSlug: string): string {
    return `https://mock-oauth.local/${this.provider}/authorize?state=${state}&agent=${agentSlug}`;
  }

  protected async exchangeCode(code: string): Promise<OAuthTokenPayload> {
    return {
      access_token: `mock-access-${this.provider}-${code}`,
      refresh_token: `mock-refresh-${this.provider}-${code}`,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      scope: this.defaultScopes.join(' '),
    };
  }
}

interface RealGoogleOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}

class RealGoogleOAuthProvider extends BaseOAuthProvider {
  readonly provider: OAuthProviderName;
  readonly defaultScopes: string[];
  private readonly options: RealGoogleOAuthOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(
    provider: OAuthProviderName,
    defaultScopes: string[],
    options: RealGoogleOAuthOptions,
  ) {
    super();
    this.provider = provider;
    this.defaultScopes = defaultScopes;
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  protected buildAuthorizationUrl(state: string): string {
    const query = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: this.defaultScopes.join(' '),
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
  }

  protected async exchangeCode(code: string): Promise<OAuthTokenPayload> {
    const body = new URLSearchParams({
      code,
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      redirect_uri: this.options.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Google OAuth token exchange failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    if (!payload.access_token || !payload.refresh_token || !payload.expires_in) {
      throw new Error('Google OAuth token exchange returned incomplete payload.');
    }

    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: new Date(Date.now() + payload.expires_in * 1000).toISOString(),
      scope: payload.scope ?? this.defaultScopes.join(' '),
    };
  }
}

interface RealSlackOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}

class RealSlackOAuthProvider extends BaseOAuthProvider {
  readonly provider: OAuthProviderName;
  readonly defaultScopes: string[];
  private readonly options: RealSlackOAuthOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(
    provider: OAuthProviderName,
    defaultScopes: string[],
    options: RealSlackOAuthOptions,
  ) {
    super();
    this.provider = provider;
    this.defaultScopes = defaultScopes;
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  protected buildAuthorizationUrl(state: string): string {
    const query = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      user_scope: this.defaultScopes.join(','),
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${query.toString()}`;
  }

  protected async exchangeCode(code: string): Promise<OAuthTokenPayload> {
    const body = new URLSearchParams({
      code,
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      redirect_uri: this.options.redirectUri,
    });

    const response = await this.fetchImpl('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Slack OAuth token exchange failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      authed_user?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };
      error?: string;
    };

    if (!payload.ok || !payload.authed_user?.access_token) {
      throw new Error(`Slack OAuth token exchange failed: ${payload.error ?? 'unknown'}`);
    }

    return {
      access_token: payload.authed_user.access_token,
      refresh_token: payload.authed_user.refresh_token ?? payload.authed_user.access_token,
      expires_at: new Date(Date.now() + (payload.authed_user.expires_in ?? 3600) * 1000).toISOString(),
      scope: payload.authed_user.scope ?? this.defaultScopes.join(','),
    };
  }
}

export interface OAuthProviderFactoryOptions {
  mode: 'mock' | 'real';
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  slackClientId?: string;
  slackClientSecret?: string;
  slackRedirectUri?: string;
  fetchImpl?: typeof fetch;
}

export function createOAuthProviders(options: OAuthProviderFactoryOptions): Record<OAuthProviderName, OAuthProviderAdapter> {
  if (options.mode === 'mock') {
    return {
      gmail: new MockOAuthProvider('gmail', ['https://www.googleapis.com/auth/gmail.send']),
      calendar: new MockOAuthProvider('calendar', ['https://www.googleapis.com/auth/calendar.events']),
      slack: new MockOAuthProvider('slack', ['chat:write', 'channels:history']),
    };
  }

  if (!options.googleClientId || !options.googleClientSecret || !options.googleRedirectUri) {
    throw new Error('Real OAuth mode requires Google OAuth client id/secret/redirect URI.');
  }

  if (!options.slackClientId || !options.slackClientSecret || !options.slackRedirectUri) {
    throw new Error('Real OAuth mode requires Slack OAuth client id/secret/redirect URI.');
  }

  return {
    gmail: new RealGoogleOAuthProvider(
      'gmail',
      ['https://www.googleapis.com/auth/gmail.send'],
      {
        clientId: options.googleClientId,
        clientSecret: options.googleClientSecret,
        redirectUri: options.googleRedirectUri,
        fetchImpl: options.fetchImpl,
      },
    ),
    calendar: new RealGoogleOAuthProvider(
      'calendar',
      ['https://www.googleapis.com/auth/calendar.events'],
      {
        clientId: options.googleClientId,
        clientSecret: options.googleClientSecret,
        redirectUri: options.googleRedirectUri,
        fetchImpl: options.fetchImpl,
      },
    ),
    slack: new RealSlackOAuthProvider(
      'slack',
      ['chat:write', 'channels:history'],
      {
        clientId: options.slackClientId,
        clientSecret: options.slackClientSecret,
        redirectUri: options.slackRedirectUri,
        fetchImpl: options.fetchImpl,
      },
    ),
  };
}
