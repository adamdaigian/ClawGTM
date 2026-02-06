# ClawGTM Identity (Step 4)

## Implemented adapters

- Google Workspace: `packages/clawgtm-identity/src/google-workspace.ts`
  - `mode: "mock"` for local dev with no credentials.
  - `mode: "real"` uses Google Admin SDK REST endpoints via `fetch` + bearer token provider.
- Microsoft 365: `packages/clawgtm-identity/src/m365-stub.ts`
  - Stub only in v0.1, same provisioning interface.

## Core interface

`IdentityProviderAdapter` supports:

- `ensureGroups(groups)`
- `provisionAgent(input)`
- `disableAgent(agentSlug)`
- `enableAgent(agentSlug)`
- `removeAgentFromGroups(agentSlug)`
- `getAgent(agentSlug)`
- `listAgents()`

## Google Workspace real-mode wiring

`GoogleWorkspaceAdapter` in real mode requires:

- `accessTokenProvider(): Promise<string>` that returns a valid Admin SDK token.
- Scopes at minimum:
  - `https://www.googleapis.com/auth/admin.directory.user`
  - `https://www.googleapis.com/auth/admin.directory.group`
  - `https://www.googleapis.com/auth/admin.directory.group.member`

Current real-mode endpoints:

- Create group: `POST /admin/directory/v1/groups`
- Create user: `POST /admin/directory/v1/users`
- Add member: `POST /admin/directory/v1/groups/{groupKey}/members`
- Remove member: `DELETE /admin/directory/v1/groups/{groupKey}/members/{memberKey}`
- Suspend/unsuspend user: `PATCH /admin/directory/v1/users/{userKey}`

## Manifest provisioning helper

`provisionAgentsFromManifest(adapter, manifest)` provisions all enabled agents and ensures canonical ClawGTM groups exist first.
