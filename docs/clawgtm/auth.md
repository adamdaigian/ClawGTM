# ClawGTM OAuth Onboarding (Step 6)

## Providers and default scopes

- `gmail`: `https://www.googleapis.com/auth/gmail.send` (send-only)
- `calendar`: `https://www.googleapis.com/auth/calendar.events` (create-only)
- `slack`: `chat:write,channels:history` (post as user + optional read)

## CLI commands

Start OAuth for an agent:

- `clawgtm auth gmail --agent researcher`
- `clawgtm auth calendar --agent bdr`
- `clawgtm auth slack --agent narrative`

Complete OAuth after receiving the provider code:

- `clawgtm auth gmail --agent researcher --code <oauth_code> --state <state>`

Notes:

- Default mode is `mock`, so flows run locally without external credentials.
- Pass `--mode real` to use real provider endpoints.
- Pending OAuth state is saved to `.clawgtm/oauth_state.json` between start/complete runs.

## Encrypted token storage

- Tokens are encrypted at rest and persisted in `.clawgtm/tokens.enc.json`.
- Encryption key source: `CLAWGTM_MASTER_KEY`.
- Storage path override: `CLAWGTM_TOKEN_STORE_PATH`.

## Real mode environment variables

Google OAuth:

- `CLAWGTM_GOOGLE_CLIENT_ID`
- `CLAWGTM_GOOGLE_CLIENT_SECRET`
- `CLAWGTM_GOOGLE_REDIRECT_URI`

Slack OAuth:

- `CLAWGTM_SLACK_CLIENT_ID`
- `CLAWGTM_SLACK_CLIENT_SECRET`
- `CLAWGTM_SLACK_REDIRECT_URI`
