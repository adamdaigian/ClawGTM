# ClawGTM Contracts (v0.1)

## Task schema

- `task_id: string`
- `requested_by: agent_name|human`
- `priority: P0|P1|P2`
- `objective: string`
- `context: {company, audience, constraints}` pointers
- `inputs: {docs: string[], data: string[]}`
- `success_criteria: {metric: string, target: string|number, timeframe: string}`
- `deliverables: {artifacts: string[], output_paths: string[]}`
- `due: {soft_due: iso_datetime, hard_due: iso_datetime|null}`
- `approval_required: boolean`

## Result schema

- `task_id: string`
- `status: success|blocked|needs_review`
- `summary: string`
- `artifacts: [{type, path, description}]`
- `metrics_impact: [{metric, expected_delta, confidence: low|med|high}]`
- `risks: string[]`
- `dependencies: [{type: agent|human|system, description}]`
- `next_actions: [{owner: agent|human, action: string, due: iso_datetime|null}]`
- `review_required: boolean`

## Audit log entry schema

- `timestamp`
- `agent_id`
- `task_id`
- `run_id`
- `action_type`
- `target`
- `artifact_refs[]`
- `status`
- `error_payload (nullable)`

## Artifact registry schema

- `artifact_id`
- `task_id`
- `run_id`
- `agent_id`
- `type`
- `path`
- `created_at`
- `description`
