# ClawGTM Approval Gates (Step 7)

## V1 default-gated actions

All external actions require approval by default:

- external email send
- external attendee calendar booking
- paid spend actions
- CRM writes (stub)
- Slack messages to external channels/workspaces

## Flow

- Propose: create approval request
- Approve/Reject: human decision
- Execute: action allowed only when approved

## CLI commands

Propose:

- `clawgtm approve propose --action external_email_send --agent bdr --task task-77 --run run-77 --target prospect@example.com`

Decision:

- `clawgtm approve decision --request <request_id> --decision approve --by human:ops`
- `clawgtm approve decision --request <request_id> --decision reject --by human:ops`

Execute:

- `clawgtm approve execute --request <request_id> --note "send approved email"`

## Storage and audit

- Approval requests persisted to `.clawgtm/approvals.json`
- Approval decision/execute events appended to unified audit log file `.clawgtm/audit.log.jsonl`
- Audit schema remains:
  - `timestamp`
  - `agent_id`
  - `task_id`
  - `run_id`
  - `action_type`
  - `target`
  - `artifact_refs[]`
  - `status`
  - `error_payload`
