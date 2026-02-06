import type { DBAdapter } from './db.js';

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

  constructor(private readonly db?: DBAdapter) {
    if (db) {
      db.execute(
        'CREATE TABLE IF NOT EXISTS clawgtm_audit_log (timestamp TEXT, agent_id TEXT, task_id TEXT, run_id TEXT, action_type TEXT, target TEXT, artifact_refs TEXT, status TEXT, error_payload TEXT)',
      );
    }
  }

  append(entry: AuditLogEntry): void {
    this.entries.push(entry);
    if (!this.db) {
      return;
    }

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

  list(): AuditLogEntry[] {
    return this.entries.map((entry) => ({ ...entry, artifact_refs: [...entry.artifact_refs] }));
  }
}
