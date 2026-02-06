import { describe, expect, it } from 'vitest';
import { loadAgentManifest } from '../../clawgtm-core/src/agent-manifest.js';
import { GoogleWorkspaceAdapter } from '../src/google-workspace.js';
import { provisionAgentsFromManifest } from '../src/provisioning.js';

describe('provisionAgentsFromManifest', () => {
  it('provisions only enabled agents from manifest', async () => {
    const manifest = loadAgentManifest('clawgtm/agents.manifest.yaml');
    const adapter = new GoogleWorkspaceAdapter({ orgDomain: 'example.com', mode: 'mock' });

    const result = await provisionAgentsFromManifest(adapter, manifest);

    expect(result.provisioned.some((record) => record.agentSlug === 'partnerships')).toBe(false);
    expect(result.provisioned).toHaveLength(10);
  });
});
