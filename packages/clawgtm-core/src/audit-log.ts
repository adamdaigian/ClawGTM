import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { DBAdapter } from './db.ts';

export interface AuditLogEntry {
  timestamp: string;
  agent_id: string;
  task_id: string;
  run_id: string;
  action_type: string;
  target: string;
  artifact_refs: string[];
  status: string;
  error_payload: string | null;
}

export class AuditLog {
  private readonly entries: AuditLogEntry[] = [];
  private readonly filePath: string | null;
  private readonly db?: DBAdapter;

  constructor(db?: DBAdapter, filePath?: string) {
    this.db = db;
    this.filePath = filePath ? path.resolve(filePath) : null;
    if (this.filePath) {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
    }

    if (db) {
      db.execute(
        'CREATE TABLE IF NOT EXISTS clawgtm_audit_log (timestamp TEXT, agent_id TEXT, task_id TEXT, run_id TEXT, action_type TEXT, target TEXT, artifact_refs TEXT, status TEXT, error_payload TEXT)',
      );
    }
  }

  append(entry: AuditLogEntry): void {
    this.entries.push(entry);
    if (this.db) {
      this.db.execute(
        'INSERT INTO clawgtm_audit_log (timestamp, agent_id, task_id, run_id, action_type, target, artifact_refs, status, error_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          entry.timestamp,
          entry.agent_id,
          entry.task_id,
          entry.run_id,
          entry.action_type,
          entry.target,
          JSON.stringify(entry.artifact_refs),
          entry.status,
          entry.error_payload,
        ],
      );
    }

    if (this.filePath) {
      appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
    }
  }

  list(): AuditLogEntry[] {
    return this.entries.map((entry) => ({ ...entry, artifact_refs: [...entry.artifact_refs] }));
  }
}
