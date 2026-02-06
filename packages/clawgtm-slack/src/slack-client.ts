import { randomUUID } from 'node:crypto';
import type { SlackClient, SlackReadMessage, SlackUserInviteInput } from './contracts.js';

interface RealSlackClientOptions {
  botToken: string;
  fetchImpl?: typeof fetch;
}

export class RealSlackClient implements SlackClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: RealSlackClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async postMessage(input: {
    channelId: string;
    text: string;
    threadTs?: string;
    metadata: {
      agent_id: string;
      task_id: string;
      run_id: string;
    };
  }): Promise<{ ts: string; threadTs: string }> {
    const payload: Record<string, unknown> = {
      channel: input.channelId,
      text: input.text,
      metadata: {
        event_type: 'clawgtm_task_update',
        event_payload: input.metadata,
      },
    };

    if (input.threadTs) {
      payload.thread_ts = input.threadTs;
    }

    const response = await this.callSlack('chat.postMessage', payload);
    return {
      ts: String(response.ts),
      threadTs: String(response.thread_ts ?? response.ts),
    };
  }

  async readThread(input: { channelId: string; threadTs: string }): Promise<SlackReadMessage[]> {
    const response = await this.callSlack('conversations.replies', {
      channel: input.channelId,
      ts: input.threadTs,
    });

    const messages = Array.isArray(response.messages) ? response.messages : [];
    return messages.map((message) => ({
      ts: String(message.ts ?? ''),
      threadTs: String(message.thread_ts ?? input.threadTs),
      text: String(message.text ?? ''),
      userId: String(message.user ?? ''),
    }));
  }

  async deactivateUserByEmail(email: string): Promise<void> {
    // TODO: Wire Slack SCIM/Enterprise API for user deactivation once scopes are configured.
    throw new Error(`Slack deactivate user not yet automated for ${email}. Manual deactivation required.`);
  }

  async inviteUser(input: SlackUserInviteInput): Promise<void> {
    const response = await this.callSlack('users.admin.invite', {
      email: input.email,
      real_name: input.displayName,
    });

    if (response.ok !== true) {
      throw new Error(`Slack invite failed for ${input.email}`);
    }
  }

  private async callSlack(method: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.fetchImpl(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API ${method} failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    if (body.ok !== true) {
      const error = String(body.error ?? 'unknown_error');
      throw new Error(`Slack API ${method} error: ${error}`);
    }

    return body;
  }
}

export class MockSlackClient implements SlackClient {
  private readonly messages: Array<{
    channelId: string;
    ts: string;
    threadTs: string;
    text: string;
    userId: string;
    metadata: { agent_id: string; task_id: string; run_id: string };
  }> = [];
  private readonly deactivatedEmails = new Set<string>();
  private readonly invitedEmails = new Set<string>();

  async postMessage(input: {
    channelId: string;
    text: string;
    threadTs?: string;
    metadata: {
      agent_id: string;
      task_id: string;
      run_id: string;
    };
  }): Promise<{ ts: string; threadTs: string }> {
    const ts = `${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const threadTs = input.threadTs ?? ts;
    this.messages.push({
      channelId: input.channelId,
      ts,
      threadTs,
      text: input.text,
      userId: `U-${input.metadata.agent_id}`,
      metadata: input.metadata,
    });

    return { ts, threadTs };
  }

  async readThread(input: { channelId: string; threadTs: string }): Promise<SlackReadMessage[]> {
    return this.messages
      .filter((message) => message.channelId === input.channelId && message.threadTs === input.threadTs)
      .map((message) => ({
        ts: message.ts,
        threadTs: message.threadTs,
        text: message.text,
        userId: message.userId,
      }));
  }

  async deactivateUserByEmail(email: string): Promise<void> {
    this.deactivatedEmails.add(email);
  }

  async inviteUser(input: SlackUserInviteInput): Promise<void> {
    this.invitedEmails.add(`${input.email}:${input.displayName}`);
  }

  getMessages(): Array<{ channelId: string; ts: string; threadTs: string; text: string }> {
    return this.messages.map((message) => ({
      channelId: message.channelId,
      ts: message.ts,
      threadTs: message.threadTs,
      text: message.text,
    }));
  }

  getInvites(): string[] {
    return Array.from(this.invitedEmails.values());
  }

  getDeactivatedEmails(): string[] {
    return Array.from(this.deactivatedEmails.values());
  }

  makeThreadTs(): string {
    return randomUUID();
  }
}
