import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

export interface TokenRecord {
  agentSlug: string;
  provider: string;
  encryptedToken: string;
  createdAt: string;
}

export class EncryptedTokenVault {
  private readonly key: Buffer;
  private readonly records = new Map<string, TokenRecord>();

  constructor(masterKey: string) {
    if (!masterKey || masterKey.length < 16) {
      throw new Error('Master key must be at least 16 characters.');
    }
    this.key = createHash('sha256').update(masterKey).digest();
  }

  upsert(agentSlug: string, provider: string, plainToken: string): TokenRecord {
    const encryptedToken = this.encrypt(plainToken);
    const record: TokenRecord = {
      agentSlug,
      provider,
      encryptedToken,
      createdAt: new Date().toISOString(),
    };
    this.records.set(this.keyFor(agentSlug, provider), record);
    return record;
  }

  getDecrypted(agentSlug: string, provider: string): string | null {
    const record = this.records.get(this.keyFor(agentSlug, provider));
    if (!record) {
      return null;
    }
    return this.decrypt(record.encryptedToken);
  }

  revoke(agentSlug: string, provider?: string): number {
    if (provider) {
      return this.records.delete(this.keyFor(agentSlug, provider)) ? 1 : 0;
    }

    let revoked = 0;
    for (const key of this.records.keys()) {
      if (key.startsWith(`${agentSlug}:`)) {
        this.records.delete(key);
        revoked += 1;
      }
    }
    return revoked;
  }

  listByAgent(agentSlug: string): TokenRecord[] {
    return Array.from(this.records.values()).filter((record) => record.agentSlug === agentSlug);
  }

  private keyFor(agentSlug: string, provider: string): string {
    return `${agentSlug}:${provider}`;
  }

  private encrypt(plainText: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  private decrypt(payload: string): string {
    const [ivRaw, tagRaw, encryptedRaw] = payload.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      throw new Error('Invalid encrypted token payload.');
    }

    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
