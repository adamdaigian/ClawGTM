import type { SlackClient, SlackPostInput, SlackPostedMessage, SlackReadMessage } from './contracts.js';
import { ThreadMappingStore } from './thread-mapping-store.js';

export class SlackGateway {
  constructor(
    private readonly client: SlackClient,
    private readonly mappingStore: ThreadMappingStore,
    private readonly configuredChannelId: string,
  ) {}

  async postTaskUpdate(input: SlackPostInput): Promise<SlackPostedMessage> {
    if (input.channelId !== this.configuredChannelId) {
      throw new Error(
        `Slack post denied. Expected configured task channel ${this.configuredChannelId}, received ${input.channelId}`,
      );
    }

    const threadTs =
      this.mappingStore.findThreadForTask(this.configuredChannelId, input.taskId) ?? undefined;

    const footer = `\n\n(task_id=${input.taskId} run_id=${input.runId})`;
    const posted = await this.client.postMessage({
      channelId: input.channelId,
      threadTs,
      text: `${input.text}${footer}`,
      metadata: {
        agent_id: input.agentId,
        task_id: input.taskId,
        run_id: input.runId,
      },
    });

    this.mappingStore.record({
      slack_channel_id: input.channelId,
      slack_thread_ts: posted.threadTs,
      slack_message_ts: posted.ts,
      agent_id: input.agentId,
      task_id: input.taskId,
      run_id: input.runId,
    });

    return {
      channelId: input.channelId,
      ts: posted.ts,
      threadTs: posted.threadTs,
      text: `${input.text}${footer}`,
      metadata: {
        agent_id: input.agentId,
        task_id: input.taskId,
        run_id: input.runId,
      },
    };
  }

  async readTaskThread(taskId: string): Promise<SlackReadMessage[]> {
    const threadTs = this.mappingStore.findThreadForTask(this.configuredChannelId, taskId);
    if (!threadTs) {
      return [];
    }
    return this.client.readThread({ channelId: this.configuredChannelId, threadTs });
  }
}
