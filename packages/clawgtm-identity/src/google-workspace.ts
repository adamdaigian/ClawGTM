import { randomUUID } from 'node:crypto';
import {
  type ClawGtmGroup,
  type IdentityProviderAdapter,
  type IdentityRecord,
  type ProvisionIdentityInput,
  assertGroupNames,
} from './contracts.js';

interface GoogleWorkspaceAdapterOptions {
  orgDomain: string;
  mode: 'mock' | 'real';
  accessTokenProvider?: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

export class GoogleWorkspaceAdapter implements IdentityProviderAdapter {
  readonly provider = 'google-workspace' as const;

  private readonly records = new Map<string, IdentityRecord>();
  private readonly knownGroups = new Set<ClawGtmGroup>();
  private readonly orgDomain: string;
  private readonly mode: 'mock' | 'real';
  private readonly accessTokenProvider?: () => Promise<string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GoogleWorkspaceAdapterOptions) {
    this.orgDomain = options.orgDomain;
    this.mode = options.mode;
    this.accessTokenProvider = options.accessTokenProvider;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async ensureGroups(groups: ClawGtmGroup[]): Promise<void> {
    assertGroupNames(groups);
    for (const group of groups) {
      if (this.mode === 'mock') {
        this.knownGroups.add(group);
        continue;
      }
      await this.createGoogleGroup(group);
      this.knownGroups.add(group);
    }
  }

  async provisionAgent(input: ProvisionIdentityInput): Promise<IdentityRecord> {
    assertGroupNames(input.groups);
    const email = `${input.agentSlug}@${this.orgDomain}`;
    const slackDisplayName = input.displayName;

    if (this.mode === 'mock') {
      const record: IdentityRecord = {
        agentSlug: input.agentSlug,
        email,
        displayName: input.displayName,
        slackDisplayName,
        groups: [...input.groups],
        enabled: true,
        providerUserId: randomUUID(),
      };
      this.records.set(input.agentSlug, record);
      return { ...record, groups: [...record.groups] };
    }

    const providerUserId = await this.createGoogleUser(email, input.roleName, input.displayName);
    for (const group of input.groups) {
      await this.addUserToGoogleGroup(email, group);
    }

    const record: IdentityRecord = {
      agentSlug: input.agentSlug,
      email,
      displayName: input.displayName,
      slackDisplayName,
      groups: [...input.groups],
      enabled: true,
      providerUserId,
    };

    this.records.set(input.agentSlug, record);
    return { ...record, groups: [...record.groups] };
  }

  async disableAgent(agentSlug: string): Promise<void> {
    const current = this.requireAgent(agentSlug);
    if (this.mode === 'real') {
      await this.patchGoogleUserSuspension(current.email, true);
    }
    this.records.set(agentSlug, { ...current, enabled: false });
  }

  async enableAgent(agentSlug: string): Promise<void> {
    const current = this.requireAgent(agentSlug);
    if (this.mode === 'real') {
      await this.patchGoogleUserSuspension(current.email, false);
    }
    this.records.set(agentSlug, { ...current, enabled: true });
  }

  async removeAgentFromGroups(agentSlug: string): Promise<void> {
    const current = this.requireAgent(agentSlug);
    if (this.mode === 'real') {
      for (const group of current.groups) {
        await this.removeGoogleGroupMember(current.email, group);
      }
    }
    this.records.set(agentSlug, { ...current, groups: [] });
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

  private async createGoogleGroup(group: ClawGtmGroup): Promise<void> {
    const payload = {
      email: `${group}@${this.orgDomain}`,
      name: group,
      description: `ClawGTM group ${group}`,
    };

    const response = await this.googleFetch('https://admin.googleapis.com/admin/directory/v1/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Group may already exist.
    if (response.status !== 200 && response.status !== 201 && response.status !== 409) {
      throw new Error(`Google group creation failed (${response.status}) for ${group}`);
    }
  }

  private async createGoogleUser(email: string, roleName: string, displayName: string): Promise<string> {
    const response = await this.googleFetch('https://admin.googleapis.com/admin/directory/v1/users', {
      method: 'POST',
      body: JSON.stringify({
        primaryEmail: email,
        name: {
          givenName: 'ClawGTM',
          familyName: roleName,
        },
        password: randomUUID(),
        changePasswordAtNextLogin: false,
        suspended: false,
        includeInGlobalAddressList: true,
        orgUnitPath: '/',
        aliases: [],
        phones: [],
        addresses: [],
        externalIds: [{ type: 'organization', value: displayName }],
      }),
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Google user creation failed (${response.status}) for ${email}`);
    }

    const payload = (await response.json()) as { id?: string };
    return payload.id ?? email;
  }

  private async addUserToGoogleGroup(email: string, group: ClawGtmGroup): Promise<void> {
    const groupEmail = `${group}@${this.orgDomain}`;
    const response = await this.googleFetch(
      `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role: 'MEMBER' }),
      },
    );

    if (response.status !== 200 && response.status !== 201 && response.status !== 409) {
      throw new Error(`Google group membership failed (${response.status}) for ${email} -> ${groupEmail}`);
    }
  }

  private async removeGoogleGroupMember(email: string, group: ClawGtmGroup): Promise<void> {
    const groupEmail = `${group}@${this.orgDomain}`;
    const response = await this.googleFetch(
      `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members/${encodeURIComponent(email)}`,
      {
        method: 'DELETE',
      },
    );

    if (response.status !== 200 && response.status !== 204 && response.status !== 404) {
      throw new Error(`Google member removal failed (${response.status}) for ${email} -> ${groupEmail}`);
    }
  }

  private async patchGoogleUserSuspension(email: string, suspended: boolean): Promise<void> {
    const response = await this.googleFetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ suspended }),
      },
    );

    if (response.status !== 200) {
      throw new Error(`Google user suspend toggle failed (${response.status}) for ${email}`);
    }
  }

  private async googleFetch(url: string, init: RequestInit): Promise<Response> {
    if (!this.accessTokenProvider) {
      throw new Error('GoogleWorkspaceAdapter real mode requires accessTokenProvider.');
    }

    const token = await this.accessTokenProvider();
    return this.fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}
