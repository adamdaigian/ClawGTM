import { describe, expect, it } from 'vitest';
import { GoogleWorkspaceAdapter } from '../src/google-workspace.js';

describe('GoogleWorkspaceAdapter (mock mode)', () => {
  it('provisions, disables, enables, and clears groups', async () => {
    const adapter = new GoogleWorkspaceAdapter({
      orgDomain: 'example.com',
      mode: 'mock',
    });

    await adapter.ensureGroups(['clawgtm-all', 'clawgtm-marketing']);
    const created = await adapter.provisionAgent({
      agentSlug: 'researcher',
      roleName: 'Researcher',
      displayName: 'ClawGTM — Researcher',
      groups: ['clawgtm-all', 'clawgtm-marketing'],
    });

    expect(created.email).toBe('researcher@example.com');
    expect(created.enabled).toBe(true);

    await adapter.disableAgent('researcher');
    expect((await adapter.getAgent('researcher'))?.enabled).toBe(false);

    await adapter.enableAgent('researcher');
    expect((await adapter.getAgent('researcher'))?.enabled).toBe(true);

    await adapter.removeAgentFromGroups('researcher');
    expect((await adapter.getAgent('researcher'))?.groups).toEqual([]);
  });
});
