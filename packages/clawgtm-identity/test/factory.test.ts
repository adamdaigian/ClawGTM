import { describe, expect, it } from 'vitest';
import { createIdentityAdapter } from '../src/factory.js';

describe('identity adapter factory', () => {
  it('creates provider-specific adapters', () => {
    const google = createIdentityAdapter({
      provider: 'google-workspace',
      orgDomain: 'example.com',
      mode: 'mock',
    });
    const m365 = createIdentityAdapter({
      provider: 'm365-stub',
      orgDomain: 'example.com',
    });

    expect(google.provider).toBe('google-workspace');
    expect(m365.provider).toBe('m365-stub');
  });
});
