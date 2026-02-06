import { rmSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MockSlackClient } from '../src/slack-client.js';
import { provisionSlackUsers } from '../src/slack-provisioning.js';

describe('Slack user provisioning', () => {
  it('falls back to manual invite artifact when automation is disabled', async () => {
    const outputPath = 'artifacts/slack/manual_invites.test.md';
    rmSync(outputPath, { force: true });

    const client = new MockSlackClient();
    const result = await provisionSlackUsers(
      client,
      [
        {
          agentSlug: 'researcher',
          email: 'researcher@example.com',
          displayName: 'ClawGTM — Researcher',
          slackDisplayName: 'ClawGTM — Researcher',
          groups: ['clawgtm-all', 'clawgtm-marketing'],
          enabled: true,
          providerUserId: 'user-1',
        },
      ],
      {
        allowAutomatedInvites: false,
        manualInviteArtifactPath: outputPath,
        workspaceName: 'ClawGTM',
      },
    );

    expect(result.invited).toEqual([]);
    expect(result.manualInviteArtifactPath).toContain('manual_invites.test.md');
  });

  it('uses automated invite path when client supports it', async () => {
    const client = new MockSlackClient();
    const result = await provisionSlackUsers(
      client,
      [
        {
          agentSlug: 'bdr',
          email: 'bdr@example.com',
          displayName: 'ClawGTM — BDR',
          slackDisplayName: 'ClawGTM — BDR',
          groups: ['clawgtm-all', 'clawgtm-sales'],
          enabled: true,
          providerUserId: 'user-2',
        },
      ],
      {
        allowAutomatedInvites: true,
        manualInviteArtifactPath: 'artifacts/slack/manual_invites.test.md',
        workspaceName: 'ClawGTM',
      },
    );

    expect(result.invited).toEqual(['bdr@example.com']);
    expect(result.manualInviteArtifactPath).toBeNull();
  });
});
