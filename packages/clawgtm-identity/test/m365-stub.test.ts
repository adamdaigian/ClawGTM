import { describe, expect, it } from 'vitest';
import { M365StubAdapter } from '../src/m365-stub.js';

describe('M365StubAdapter', () => {
  it('supports the same provisioning contract', async () => {
    const adapter = new M365StubAdapter({ orgDomain: 'example.com' });

    await adapter.ensureGroups(['clawgtm-all', 'clawgtm-sales']);
    await adapter.provisionAgent({
      agentSlug: 'bdr',
      roleName: 'BDR',
      displayName: 'ClawGTM — BDR',
      groups: ['clawgtm-all', 'clawgtm-sales'],
    });

    expect((await adapter.getAgent('bdr'))?.email).toBe('bdr@example.com');

    await adapter.disableAgent('bdr');
    expect((await adapter.getAgent('bdr'))?.enabled).toBe(false);
  });
});
