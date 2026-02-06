import { randomUUID } from 'node:crypto';
import {
  type ClawGtmGroup,
  type IdentityProviderAdapter,
  type IdentityRecord,
  type ProvisionIdentityInput,
  assertGroupNames,
} from './contracts.js';

interface M365StubAdapterOptions {
  orgDomain: string;
}

// Stub implementation with the same interface as real providers.
// TODO: Wire Microsoft Graph user/group endpoints.
export class M365StubAdapter implements IdentityProviderAdapter {
  readonly provider = 'm365-stub' as const;

  private readonly records = new Map<string, IdentityRecord>();
  private readonly knownGroups = new Set<ClawGtmGroup>();

  constructor(private readonly options: M365StubAdapterOptions) {}

  async ensureGroups(groups: ClawGtmGroup[]): Promise<void> {
    assertGroupNames(groups);
    for (const group of groups) {
      this.knownGroups.add(group);
    }
  }

  async provisionAgent(input: ProvisionIdentityInput): Promise<IdentityRecord> {
    assertGroupNames(input.groups);
    const record: IdentityRecord = {
      agentSlug: input.agentSlug,
      email: `${input.agentSlug}@${this.options.orgDomain}`,
      displayName: input.displayName,
      slackDisplayName: input.displayName,
      groups: [...input.groups],
      enabled: true,
      providerUserId: randomUUID(),
    };
    this.records.set(input.agentSlug, record);
    return { ...record, groups: [...record.groups] };
  }

  async disableAgent(agentSlug: string): Promise<void> {
    const record = this.requireAgent(agentSlug);
    this.records.set(agentSlug, { ...record, enabled: false });
  }

  async enableAgent(agentSlug: string): Promise<void> {
    const record = this.requireAgent(agentSlug);
    this.records.set(agentSlug, { ...record, enabled: true });
  }

  async removeAgentFromGroups(agentSlug: string): Promise<void> {
    const record = this.requireAgent(agentSlug);
    this.records.set(agentSlug, { ...record, groups: [] });
  }

  async getAgent(agentSlug: string): Promise<IdentityRecord | null> {
    const record = this.records.get(agentSlug);
    if (!record) {
      return null;
    }
    return { ...record, groups: [...record.groups] };
  }

  async listAgents(): Promise<IdentityRecord[]> {
    return Array.from(this.records.values()).map((record) => ({
      ...record,
      groups: [...record.groups],
    }));
  }

  private requireAgent(agentSlug: string): IdentityRecord {
    const record = this.records.get(agentSlug);
    if (!record) {
      throw new Error(`Agent not provisioned: ${agentSlug}`);
    }
    return record;
  }
}
