import type { AgentManifest } from '../../clawgtm-core/src/agent-manifest.js';
import { CLAWGTM_GROUPS, type IdentityProviderAdapter, type IdentityRecord } from './contracts.js';

export interface ProvisioningResult {
  provisioned: IdentityRecord[];
}

export async function provisionAgentsFromManifest(
  adapter: IdentityProviderAdapter,
  manifest: AgentManifest,
): Promise<ProvisioningResult> {
  await adapter.ensureGroups([...CLAWGTM_GROUPS]);

  const provisioned: IdentityRecord[] = [];
  for (const agent of manifest.agents) {
    if (!agent.enabled) {
      continue;
    }

    const record = await adapter.provisionAgent({
      agentSlug: agent.slug,
      roleName: agent.role_name,
      displayName: agent.display_name,
      groups: agent.groups,
    });
    provisioned.push(record);
  }

  return { provisioned };
}
