# ClawGTM Decisions

## 2026-02-06

- Step 1 storage baseline uses `node:sqlite` (`DatabaseSync`) for local SQLite support and a `PostgresAdapterStub` for production wiring parity.
- Token encryption at rest uses AES-256-GCM via `node:crypto` with a SHA-256 derived key from `CLAWGTM_MASTER_KEY` (or constructor input in tests). This keeps local development self-contained while preserving envelope encryption behavior.
- Agent write-scope is enforced against canonical artifact output paths declared in `clawgtm/agents.manifest.yaml`; writes outside allowed paths are rejected.
- Agent set is strict and includes `partnerships` disabled by default, matching the v1 spec.
- Output paths shared by multiple agents are allowed (for collaborative draft/final workflows), with Head of Revenue intended to publish final `gtm/*` artifacts in orchestration.
- Task and Result contracts are implemented as exact TypeScript interfaces plus runtime validators (no external schema runtime dependency) and mirrored in `docs/clawgtm/contracts.md`.
- Audit log and artifact registry persist both in memory (fast local orchestration) and optionally to SQLite through the shared DB adapter.
- Step 4 uses Google Workspace as the primary identity provider with a dual-mode adapter: `mock` for local end-to-end runs and `real` for Admin SDK REST calls using an injected access token provider.
- Microsoft 365 remains a stub in v0.1 but implements the same `IdentityProviderAdapter` contract to keep provider swapping deterministic.
- Step 5 Slack collaboration is implemented with strict single-channel task thread discipline and persisted mapping rows keyed by channel/thread/message to agent/task/run.
- Slack user provisioning prefers automation (`inviteUser`) but always falls back to a durable manual-invite artifact when scopes or APIs are unavailable.
- Step 6 OAuth onboarding defaults to `mock` mode for local runnable flows and supports `real` mode for Google/Slack token exchange when env credentials are provided.
- OAuth start/complete state is persisted in `.clawgtm/oauth_state.json` so operators can run commands in separate terminal invocations without losing state.
- Step 7 approval gates are implemented as a hard propose -> decision -> execute state machine. `execute` is blocked unless status is `approved`.
- CLI approvals persist to `.clawgtm/approvals.json`, and every propose/decision/execute event is written to the unified audit log (`.clawgtm/audit.log.jsonl`).
- Step 8 onboarding is business-context-first: operators provide company/service/ICP/objective, and ClawGTM writes canonical input docs before orchestrating agent tasks.
- Onboarding orchestration runs a strict 4-step sequence (Researcher -> Narrative -> Growth Analyst -> Head of Revenue), with Narrative hard-blocked when JTBD structure is missing.
- ClawGTM onboarding emits a durable run summary (`.clawgtm/runs/<run_id>.json`) that links task IDs, registry artifacts, and audit events for replayability.
