import { describe, expect, it } from 'vitest';
import { SqliteAdapter } from '../../clawgtm-core/src/db.js';
import { MockSlackClient } from '../src/slack-client.js';
import { SlackGateway } from '../src/slack-gateway.js';
import { ThreadMappingStore } from '../src/thread-mapping-store.js';

describe('SlackGateway', () => {
  it('enforces one-task-one-thread and stores mapping rows', async () => {
    const db = new SqliteAdapter();
    const mappingStore = new ThreadMappingStore(db);
    const client = new MockSlackClient();
    const gateway = new SlackGateway(client, mappingStore, 'C-WAR-ROOM');

    const first = await gateway.postTaskUpdate({
      channelId: 'C-WAR-ROOM',
      agentId: 'researcher',
      taskId: 'task-001',
      runId: 'run-001',
      text: 'Initial research output posted',
    });

    const second = await gateway.postTaskUpdate({
      channelId: 'C-WAR-ROOM',
      agentId: 'narrative',
      taskId: 'task-001',
      runId: 'run-002',
      text: 'Narrative follow-up',
    });

    expect(first.threadTs).toBe(second.threadTs);
    expect(first.text).toContain('task_id=task-001');
    expect(first.text).toContain('run_id=run-001');

    const mappings = mappingStore.listByTask('task-001');
    expect(mappings).toHaveLength(2);
    expect(mappings[0]?.slack_thread_ts).toBe(mappings[1]?.slack_thread_ts);
  });

  it('rejects posts outside configured task channel', async () => {
    const mappingStore = new ThreadMappingStore();
    const client = new MockSlackClient();
    const gateway = new SlackGateway(client, mappingStore, 'C-WAR-ROOM');

    await expect(
      gateway.postTaskUpdate({
        channelId: 'C-OTHER',
        agentId: 'researcher',
        taskId: 'task-001',
        runId: 'run-001',
        text: 'Should fail',
      }),
    ).rejects.toThrow(/Slack post denied/);
  });
});
