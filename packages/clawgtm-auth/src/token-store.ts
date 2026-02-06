import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EncryptedTokenVault } from '../../clawgtm-core/src/token-vault.ts';
import type { OAuthProviderName, OAuthTokenPayload, StoredOAuthToken } from './contracts.ts';

interface TokenStoreDocument {
  tokens: StoredOAuthToken[];
}

export class PersistentOAuthTokenStore {
  private readonly vault: EncryptedTokenVault;
  private readonly storagePath: string;

  constructor(options: { masterKey: string; storagePath: string }) {
    this.vault = new EncryptedTokenVault(options.masterKey);
    this.storagePath = path.resolve(options.storagePath);
    this.ensureFile();
  }

  upsert(agentSlug: string, provider: OAuthProviderName, payload: OAuthTokenPayload): StoredOAuthToken {
    const encryptedPayload = this.vault.upsert(
      agentSlug,
      provider,
      JSON.stringify(payload),
    ).encryptedToken;

    const document = this.readDocument();
    const now = new Date().toISOString();
    const existing = document.tokens.find(
      (token) => token.agent_slug === agentSlug && token.provider === provider,
    );

    if (existing) {
      existing.encrypted_payload = encryptedPayload;
      existing.updated_at = now;
      this.writeDocument(document);
      return { ...existing };
    }

    const stored: StoredOAuthToken = {
      agent_slug: agentSlug,
      provider,
      encrypted_payload: encryptedPayload,
      created_at: now,
      updated_at: now,
    };

    document.tokens.push(stored);
    this.writeDocument(document);
    return { ...stored };
  }

  get(agentSlug: string, provider: OAuthProviderName): OAuthTokenPayload | null {
    const document = this.readDocument();
    const existing = document.tokens.find(
      (token) => token.agent_slug === agentSlug && token.provider === provider,
    );

    if (!existing) {
      return null;
    }

    const decrypted = this.vault.getDecrypted(agentSlug, provider);
    if (!decrypted) {
      throw new Error(`Encrypted token missing for ${agentSlug}/${provider}`);
    }

    return JSON.parse(decrypted) as OAuthTokenPayload;
  }

  revoke(agentSlug: string, provider?: OAuthProviderName): number {
    const document = this.readDocument();
    const before = document.tokens.length;

    if (provider) {
      document.tokens = document.tokens.filter(
        (token) => !(token.agent_slug === agentSlug && token.provider === provider),
      );
      this.vault.revoke(agentSlug, provider);
    } else {
      document.tokens = document.tokens.filter((token) => token.agent_slug !== agentSlug);
      this.vault.revoke(agentSlug);
    }

    this.writeDocument(document);
    return before - document.tokens.length;
  }

  listByAgent(agentSlug: string): StoredOAuthToken[] {
    const document = this.readDocument();
    return document.tokens
      .filter((token) => token.agent_slug === agentSlug)
      .map((token) => ({ ...token }));
  }

  private ensureFile(): void {
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
    try {
      readFileSync(this.storagePath, 'utf8');
    } catch {
      writeFileSync(this.storagePath, JSON.stringify({ tokens: [] }, null, 2), 'utf8');
    }
  }

  private readDocument(): TokenStoreDocument {
    const raw = readFileSync(this.storagePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TokenStoreDocument>;
    return {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
    };
  }

  private writeDocument(document: TokenStoreDocument): void {
    writeFileSync(this.storagePath, JSON.stringify(document, null, 2), 'utf8');
  }
}
