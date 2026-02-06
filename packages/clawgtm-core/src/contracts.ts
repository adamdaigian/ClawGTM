export type TaskPriority = 'P0' | 'P1' | 'P2';
export type RequestedBy = AgentName | 'human';
export type AgentName =
  | 'headofrevenue'
  | 'researcher'
  | 'narrative'
  | 'vibe_marketer'
  | 'performance_marketer'
  | 'aeo_geo'
  | 'growth_analyst'
  | 'gtm_engineer'
  | 'bdr'
  | 'revops'
  | 'partnerships';

export interface Task {
  task_id: string;
  requested_by: RequestedBy;
  priority: TaskPriority;
  objective: string;
  context: {
    company: string;
    audience: string;
    constraints: string;
  };
  inputs: {
    docs: string[];
    data: string[];
  };
  success_criteria: {
    metric: string;
    target: string | number;
    timeframe: string;
  };
  deliverables: {
    artifacts: string[];
    output_paths: string[];
  };
  due: {
    soft_due: string;
    hard_due: string | null;
  };
  approval_required: boolean;
}

export type ResultStatus = 'success' | 'blocked' | 'needs_review';
export type Confidence = 'low' | 'med' | 'high';
export type DependencyType = 'agent' | 'human' | 'system';
export type NextActionOwner = 'agent' | 'human';

export interface Result {
  task_id: string;
  status: ResultStatus;
  summary: string;
  artifacts: Array<{
    type: string;
    path: string;
    description: string;
  }>;
  metrics_impact: Array<{
    metric: string;
    expected_delta: string;
    confidence: Confidence;
  }>;
  risks: string[];
  dependencies: Array<{
    type: DependencyType;
    description: string;
  }>;
  next_actions: Array<{
    owner: NextActionOwner;
    action: string;
    due: string | null;
  }>;
  review_required: boolean;
}

export function validateTask(task: Task): void {
  if (!task.task_id) throw new Error('Task.task_id is required.');
  if (!isRequestedBy(task.requested_by)) throw new Error('Task.requested_by is invalid.');
  if (!isTaskPriority(task.priority)) throw new Error('Task.priority is invalid.');
  if (!task.objective) throw new Error('Task.objective is required.');
  if (!task.context.company || !task.context.audience || !task.context.constraints) {
    throw new Error('Task.context must include company, audience, constraints pointers.');
  }
  if (!Array.isArray(task.inputs.docs) || !Array.isArray(task.inputs.data)) {
    throw new Error('Task.inputs.docs and Task.inputs.data must be arrays.');
  }
  if (!task.success_criteria.metric || task.success_criteria.target === undefined) {
    throw new Error('Task.success_criteria requires metric and target.');
  }
  if (!Array.isArray(task.deliverables.artifacts) || !Array.isArray(task.deliverables.output_paths)) {
    throw new Error('Task.deliverables.artifacts and Task.deliverables.output_paths must be arrays.');
  }
  assertIsoDatetime(task.due.soft_due, 'Task.due.soft_due');
  if (task.due.hard_due !== null) {
    assertIsoDatetime(task.due.hard_due, 'Task.due.hard_due');
  }
}

export function validateResult(result: Result): void {
  if (!result.task_id) throw new Error('Result.task_id is required.');
  if (!isResultStatus(result.status)) throw new Error('Result.status is invalid.');
  if (!result.summary) throw new Error('Result.summary is required.');

  for (const artifact of result.artifacts) {
    if (!artifact.type || !artifact.path) {
      throw new Error('Result.artifacts entries require type and path.');
    }
  }

  for (const impact of result.metrics_impact) {
    if (!impact.metric || !impact.expected_delta || !isConfidence(impact.confidence)) {
      throw new Error('Result.metrics_impact entries are invalid.');
    }
  }

  for (const dependency of result.dependencies) {
    if (!isDependencyType(dependency.type) || !dependency.description) {
      throw new Error('Result.dependencies entries are invalid.');
    }
  }

  for (const action of result.next_actions) {
    if (!isNextActionOwner(action.owner) || !action.action) {
      throw new Error('Result.next_actions entries are invalid.');
    }
    if (action.due !== null) {
      assertIsoDatetime(action.due, 'Result.next_actions[].due');
    }
  }
}

function assertIsoDatetime(value: string, label: string): void {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${label} must be an ISO datetime string.`);
  }
}

function isTaskPriority(value: string): value is TaskPriority {
  return value === 'P0' || value === 'P1' || value === 'P2';
}

function isRequestedBy(value: string): value is RequestedBy {
  return value === 'human' || isAgentName(value);
}

function isAgentName(value: string): value is AgentName {
  return (
    value === 'headofrevenue' ||
    value === 'researcher' ||
    value === 'narrative' ||
    value === 'vibe_marketer' ||
    value === 'performance_marketer' ||
    value === 'aeo_geo' ||
    value === 'growth_analyst' ||
    value === 'gtm_engineer' ||
    value === 'bdr' ||
    value === 'revops' ||
    value === 'partnerships'
  );
}

function isResultStatus(value: string): value is ResultStatus {
  return value === 'success' || value === 'blocked' || value === 'needs_review';
}

function isConfidence(value: string): value is Confidence {
  return value === 'low' || value === 'med' || value === 'high';
}

function isDependencyType(value: string): value is DependencyType {
  return value === 'agent' || value === 'human' || value === 'system';
}

function isNextActionOwner(value: string): value is NextActionOwner {
  return value === 'agent' || value === 'human';
}
