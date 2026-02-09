import { randomUUID } from 'node:crypto';
import type { DBAdapter } from './db.ts';

export interface ArtifactRecord {
  artifact_id: string;
  task_id: string;
  run_id: string;
  agent_id: string;
  type: string;
  path: string;
  created_at: string;
  description: string;
}

export class ArtifactRegistry {
  private readonly records: ArtifactRecord[] = [];
  private readonly db?: DBAdapter;

  constructor(db?: DBAdapter) {
    this.db = db;
    if (db) {
      db.execute(
        'CREATE TABLE IF NOT EXISTS clawgtm_artifact_registry (artifact_id TEXT PRIMARY KEY, task_id TEXT, run_id TEXT, agent_id TEXT, type TEXT, path TEXT, created_at TEXT, description TEXT)',
      );
    }
  }

  register(input: Omit<ArtifactRecord, 'artifact_id' | 'created_at'>): ArtifactRecord {
    const record: ArtifactRecord = {
      artifact_id: randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };

    this.records.push(record);

    if (this.db) {
      this.db.execute(
        'INSERT INTO clawgtm_artifact_registry (artifact_id, task_id, run_id, agent_id, type, path, created_at, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          record.artifact_id,
          record.task_id,
          record.run_id,
          record.agent_id,
          record.type,
          record.path,
          record.created_at,
          record.description,
        ],
      );
    }

    return { ...record };
  }

  listByTask(taskId: string): ArtifactRecord[] {
    return this.records.filter((record) => record.task_id === taskId).map((record) => ({ ...record }));
  }

  list(): ArtifactRecord[] {
    return this.records.map((record) => ({ ...record }));
  }
}
