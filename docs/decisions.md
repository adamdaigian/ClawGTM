# ClawGTM Decisions

## 2026-02-06

- Step 1 storage baseline uses `node:sqlite` (`DatabaseSync`) for local SQLite support and a `PostgresAdapterStub` for production wiring parity.
- Token encryption at rest uses AES-256-GCM via `node:crypto` with a SHA-256 derived key from `CLAWGTM_MASTER_KEY` (or constructor input in tests). This keeps local development self-contained while preserving envelope encryption behavior.
- Agent write-scope is enforced against canonical artifact output paths declared in `clawgtm/agents.manifest.yaml`; writes outside allowed paths are rejected.
- Agent set is strict and includes `partnerships` disabled by default, matching the v1 spec.
- Output paths shared by multiple agents are allowed (for collaborative draft/final workflows), with Head of Revenue intended to publish final `gtm/*` artifacts in orchestration.
