export const CLAWGTM_GROUPS = [
  'clawgtm-all',
  'clawgtm-admin',
  'clawgtm-sales',
  'clawgtm-marketing',
  'clawgtm-engineering',
  'clawgtm-revops',
] as const;

export type ClawGtmGroup = (typeof CLAWGTM_GROUPS)[number];

export interface ProvisionIdentityInput {
  agentSlug: string;
  roleName: string;
  displayName: string;
  groups: ClawGtmGroup[];
}

export interface IdentityRecord {
  agentSlug: string;
  email: string;
  displayName: string;
  slackDisplayName: string;
  groups: ClawGtmGroup[];
  enabled: boolean;
  providerUserId: string;
}

export interface IdentityProviderAdapter {
  readonly provider: 'google-workspace' | 'm365-stub';
  ensureGroups(groups: ClawGtmGroup[]): Promise<void>;
  provisionAgent(input: ProvisionIdentityInput): Promise<IdentityRecord>;
  disableAgent(agentSlug: string): Promise<void>;
  enableAgent(agentSlug: string): Promise<void>;
  removeAgentFromGroups(agentSlug: string): Promise<void>;
  getAgent(agentSlug: string): Promise<IdentityRecord | null>;
  listAgents(): Promise<IdentityRecord[]>;
}

export function assertGroupNames(groups: string[]): asserts groups is ClawGtmGroup[] {
  for (const group of groups) {
    if (!CLAWGTM_GROUPS.includes(group as ClawGtmGroup)) {
      throw new Error(`Unknown ClawGTM group: ${group}`);
    }
  }
}
