import type { DBAdapter } from '../../clawgtm-core/src/db.ts';
import type { SlackThreadMapping } from './contracts.ts';

export class ThreadMappingStore {
  private readonly rows: SlackThreadMapping[] = [];
  private readonly db?: DBAdapter;

  constructor(db?: DBAdapter) {
    this.db = db;
    if (db) {
      db.execute(
        'CREATE TABLE IF NOT EXISTS clawgtm_slack_thread_map (slack_channel_id TEXT NOT NULL, slack_thread_ts TEXT NOT NULL, slack_message_ts TEXT NOT NULL, agent_id TEXT NOT NULL, task_id TEXT NOT NULL, run_id TEXT NOT NULL)',
      );
    }
  }

  record(mapping: SlackThreadMapping): void {
    this.rows.push(mapping);
    if (!this.db) {
      return;
    }

    this.db.execute(
      'INSERT INTO clawgtm_slack_thread_map (slack_channel_id, slack_thread_ts, slack_message_ts, agent_id, task_id, run_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        mapping.slack_channel_id,
        mapping.slack_thread_ts,
        mapping.slack_message_ts,
        mapping.agent_id,
        mapping.task_id,
        mapping.run_id,
      ],
    );
  }

  findThreadForTask(channelId: string, taskId: string): string | null {
    const existing = this.rows.find(
      (row) => row.slack_channel_id === channelId && row.task_id === taskId,
    );
    return existing?.slack_thread_ts ?? null;
  }

  listByTask(taskId: string): SlackThreadMapping[] {
    return this.rows.filter((row) => row.task_id === taskId).map((row) => ({ ...row }));
  }

  list(): SlackThreadMapping[] {
    return this.rows.map((row) => ({ ...row }));
  }
}
