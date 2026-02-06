import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { IdentityRecord } from '../../clawgtm-identity/src/contracts.js';
import type { SlackClient, SlackUserInviteInput } from './contracts.js';

export interface SlackProvisioningResult {
  invited: string[];
  manualInviteArtifactPath: string | null;
}

export async function provisionSlackUsers(
  client: SlackClient,
  identities: IdentityRecord[],
  options: {
    allowAutomatedInvites: boolean;
    manualInviteArtifactPath: string;
    workspaceName: string;
  },
): Promise<SlackProvisioningResult> {
  const inviteInputs: SlackUserInviteInput[] = identities.map((identity) => ({
    email: identity.email,
    displayName: identity.slackDisplayName,
  }));

  if (options.allowAutomatedInvites && client.inviteUser) {
    try {
      for (const inviteInput of inviteInputs) {
        await client.inviteUser(inviteInput);
      }
      return {
        invited: inviteInputs.map((input) => input.email),
        manualInviteArtifactPath: null,
      };
    } catch {
      // Fall back to manual invite instructions artifact.
    }
  }

  const artifactPath = generateManualSlackInvitesArtifact(
    inviteInputs,
    options.manualInviteArtifactPath,
    options.workspaceName,
  );

  return {
    invited: [],
    manualInviteArtifactPath: artifactPath,
  };
}

export function generateManualSlackInvitesArtifact(
  invites: SlackUserInviteInput[],
  outputPath: string,
  workspaceName: string,
): string {
  const absolutePath = path.resolve(outputPath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });

  const lines = [
    '# Slack Manual Invite List',
    '',
    `Workspace: ${workspaceName}`,
    '',
    '## Steps',
    '1. Open Slack Admin > Manage members > Invite people.',
    '2. Add each email from the table below with the specified display name.',
    '3. Confirm each invited user appears active before enabling external actions.',
    '',
    '## Invites',
    '| Email | Display Name |',
    '| --- | --- |',
    ...invites.map((invite) => `| ${invite.email} | ${invite.displayName} |`),
    '',
  ];

  writeFileSync(absolutePath, lines.join('\n'), 'utf8');
  return absolutePath;
}
