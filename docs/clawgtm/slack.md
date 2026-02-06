# ClawGTM Slack Module (Step 5)

## Capabilities

- Posting and reading task updates via a Slack client abstraction.
- Thread discipline enforcement: one task uses one thread in a configured channel.
- Message footer and metadata include `task_id` and `run_id` on every post.
- Mapping table persistence for:
  - `slack_channel_id`
  - `slack_thread_ts`
  - `slack_message_ts`
  - `agent_id`
  - `task_id`
  - `run_id`
- Slack user provisioning flow:
  - Automated invites when `inviteUser` is available and permitted.
  - Manual invite artifact generation fallback when automation is not available.

## Files

- Gateway: `packages/clawgtm-slack/src/slack-gateway.ts`
- Mapping store: `packages/clawgtm-slack/src/thread-mapping-store.ts`
- Clients: `packages/clawgtm-slack/src/slack-client.ts`
- Provisioning: `packages/clawgtm-slack/src/slack-provisioning.ts`

## Manual invite artifact

Fallback artifact example path:

- `artifacts/slack/manual_invites.md`

Artifact contains invite table and admin steps.
