import { AuditLog } from './audit-log.ts';
import { ArtifactRegistry } from './artifact-registry.ts';
import { type Result, type Task, validateResult, validateTask } from './contracts.ts';

export interface CompleteTaskInput {
  runId: string;
  agentId: string;
  result: Result;
}

export class TaskEngine {
  private readonly tasks = new Map<string, Task>();
  private readonly results = new Map<string, Result>();
  private readonly auditLog: AuditLog;
  private readonly artifactRegistry: ArtifactRegistry;

  constructor(auditLog: AuditLog, artifactRegistry: ArtifactRegistry) {
    this.auditLog = auditLog;
    this.artifactRegistry = artifactRegistry;
  }

  createTask(task: Task): void {
    validateTask(task);
    if (this.tasks.has(task.task_id)) {
      throw new Error(`Task ${task.task_id} already exists.`);
    }

    this.tasks.set(task.task_id, task);
    this.auditLog.append({
      timestamp: new Date().toISOString(),
      agent_id: task.requested_by,
      task_id: task.task_id,
      run_id: 'n/a',
      action_type: 'task.create',
      target: task.objective,
      artifact_refs: [],
      status: 'success',
      error_payload: null,
    });
  }

  completeTask(input: CompleteTaskInput): Result {
    const { result, runId, agentId } = input;
    validateResult(result);
    if (!this.tasks.has(result.task_id)) {
      throw new Error(`Task ${result.task_id} does not exist.`);
    }

    this.results.set(result.task_id, result);

    const refs: string[] = [];
    for (const artifact of result.artifacts) {
      const record = this.artifactRegistry.register({
        task_id: result.task_id,
        run_id: runId,
        agent_id: agentId,
        type: artifact.type,
        path: artifact.path,
        description: artifact.description,
      });
      refs.push(record.artifact_id);
    }

    this.auditLog.append({
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      task_id: result.task_id,
      run_id: runId,
      action_type: 'task.complete',
      target: result.summary,
      artifact_refs: refs,
      status: result.status,
      error_payload: null,
    });

    return result;
  }

  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) ?? null;
  }

  getResult(taskId: string): Result | null {
    return this.results.get(taskId) ?? null;
  }

  listTasks(): Task[] {
    return Array.from(this.tasks.values()).map((task) => ({ ...task }));
  }
}
