import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PersistentOAuthTokenStore } from '../src/token-store.ts';

describe('PersistentOAuthTokenStore', () => {
  it('persists encrypted refresh token payloads at rest', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'clawgtm-auth-store-'));
    const storagePath = path.join(dir, 'tokens.json');

    try {
      const store = new PersistentOAuthTokenStore({
        masterKey: 'clawgtm-master-key-for-tests-12345',
        storagePath,
      });

      store.upsert('bdr', 'gmail', {
        access_token: 'a',
        refresh_token: 'r-super-secret',
        expires_at: '2026-02-06T00:00:00.000Z',
        scope: 'gmail.send',
      });

      const rawFile = readFileSync(storagePath, 'utf8');
      expect(rawFile).not.toContain('r-super-secret');

      const token = store.get('bdr', 'gmail');
      expect(token?.refresh_token).toBe('r-super-secret');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
