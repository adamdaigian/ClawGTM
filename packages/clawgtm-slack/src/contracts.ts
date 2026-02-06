export interface SlackThreadMapping {
  slack_channel_id: string;
  slack_thread_ts: string;
  slack_message_ts: string;
  agent_id: string;
  task_id: string;
  run_id: string;
}

export interface SlackPostInput {
  channelId: string;
  agentId: string;
  taskId: string;
  runId: string;
  text: string;
}

export interface SlackPostedMessage {
  channelId: string;
  ts: string;
  threadTs: string;
  text: string;
  metadata: {
    agent_id: string;
    task_id: string;
    run_id: string;
  };
}

export interface SlackReadMessage {
  ts: string;
  threadTs: string;
  text: string;
  userId: string;
}

export interface SlackUserInviteInput {
  email: string;
  displayName: string;
}

export interface SlackClient {
  postMessage(input: {
    channelId: string;
    text: string;
    threadTs?: string;
    metadata: {
      agent_id: string;
      task_id: string;
      run_id: string;
    };
  }): Promise<{ ts: string; threadTs: string }>;
  readThread(input: { channelId: string; threadTs: string }): Promise<SlackReadMessage[]>;
  deactivateUserByEmail(email: string): Promise<void>;
  inviteUser?(input: SlackUserInviteInput): Promise<void>;
}
