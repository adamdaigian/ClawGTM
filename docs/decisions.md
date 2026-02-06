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
