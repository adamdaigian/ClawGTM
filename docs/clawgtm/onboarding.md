# ClawGTM Onboarding Flow (Step 8)

ClawGTM onboarding is intentionally different from OpenClaw onboarding.

OpenClaw onboarding connects infrastructure and channels.
ClawGTM onboarding connects business strategy to agent execution.

## Experience

1. Capture business context and growth objective.
2. Write canonical input docs (`company/*`, `personas/*`, `metrics/target_metrics.md`).
3. Run Head-of-Revenue orchestration across specialist agents in sequence.
4. Post step updates into a single task-thread discipline Slack channel.
5. Persist task results, audit events, and artifact links to the run summary.

## Commands

Capture context only:

```bash
clawgtm onboard context \
  --company-name "Acme" \
  --service-summary "AI sales assistant" \
  --objective "Increase qualified pipeline by 30%" \
  --icp "VP Sales at B2B SaaS"
```

Run onboarding only:

```bash
clawgtm onboard run --objective "Increase qualified pipeline by 30%" --channel C-WAR-ROOM
```

Do both in one command:

```bash
clawgtm onboard full \
  --company-name "Acme" \
  --service-summary "AI sales assistant" \
  --objective "Increase qualified pipeline by 30%" \
  --icp "VP Sales at B2B SaaS" \
  --channel C-WAR-ROOM
```

## Required onboarding sequence

1. Researcher: `analysis/market_landscape.md`, `analysis/competitive_matrix.md`, `analysis/icp_summary.md`, `analysis/jtbd_framework.md`
2. Narrative: `narrative/positioning.md`, `narrative/messaging_framework.md`, `narrative/value_props.md` (blocked if JTBD is missing/insufficient)
3. Growth Analyst: `metrics/north_star_tree.md`, `metrics/metrics_dictionary.md`
4. Head of Revenue: `gtm/strategy.md`, `gtm/channel_plan.md`, `gtm/experiment_backlog.md`

## Outputs

- Input docs under `company/`, `personas/`, `metrics/`
- Generated artifacts under `analysis/`, `narrative/`, `gtm/`, `metrics/`
- Run summary JSON: `.clawgtm/runs/<run_id>.json`
- Unified audit log JSONL: `.clawgtm/audit.log.jsonl`
