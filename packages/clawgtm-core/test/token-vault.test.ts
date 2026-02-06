import { describe, expect, it } from 'vitest';
import { EncryptedTokenVault } from '../src/token-vault.js';

describe('EncryptedTokenVault', () => {
  it('encrypts and decrypts tokens per agent/provider', () => {
    const vault = new EncryptedTokenVault('clawgtm-dev-master-key-1234');
    const record = vault.upsert('researcher', 'gmail', 'refresh-token-1');

    expect(record.encryptedToken).not.toContain('refresh-token-1');
    expect(vault.getDecrypted('researcher', 'gmail')).toBe('refresh-token-1');
  });

  it('revokes all provider tokens for an agent', () => {
    const vault = new EncryptedTokenVault('clawgtm-dev-master-key-1234');
    vault.upsert('bdr', 'gmail', 'one');
    vault.upsert('bdr', 'calendar', 'two');

    expect(vault.revoke('bdr')).toBe(2);
    expect(vault.listByAgent('bdr')).toHaveLength(0);
  });
});
