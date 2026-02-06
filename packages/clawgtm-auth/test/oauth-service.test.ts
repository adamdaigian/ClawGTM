import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createOAuthProviders } from '../src/providers.ts';
import { AgentOAuthService } from '../src/service.ts';
import { PersistentOAuthTokenStore } from '../src/token-store.ts';

describe('AgentOAuthService', () => {
  it('supports mock onboarding for gmail/calendar/slack and stores encrypted payloads', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'clawgtm-auth-'));
    const storagePath = path.join(dir, 'tokens.json');

    try {
      const store = new PersistentOAuthTokenStore({
        masterKey: 'clawgtm-master-key-for-tests-12345',
        storagePath,
      });
      const service = new AgentOAuthService({
        tokenStore: store,
        providers: createOAuthProviders({ mode: 'mock' }),
      });

      for (const provider of ['gmail', 'calendar', 'slack'] as const) {
        const start = await service.startAuth('researcher', provider);
        expect(start.authorization_url).toContain('mock-oauth.local');

        const token = await service.completeAuth({
          agentSlug: 'researcher',
          provider,
          code: 'abc123',
          state: start.state,
        });

        expect(token.refresh_token).toContain(`mock-refresh-${provider}`);
        expect(service.getStoredToken('researcher', provider)?.refresh_token).toContain(
          `mock-refresh-${provider}`,
        );
      }

      expect(service.revoke('researcher', 'gmail')).toBe(1);
      expect(service.getStoredToken('researcher', 'gmail')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
