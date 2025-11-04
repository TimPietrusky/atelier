# Secure Provider Credential Management

## Executive Summary

**Goal**: Let every atelier user bring their own AI provider credentials (RunPod today, more later) without exposing secrets to the browser or storing them in env vars.

**Strategy**: Add WorkOS AuthKit for authenticated user/org identities, store provider secrets in WorkOS Vault, and proxy all provider requests through server routes that fetch and decrypt the relevant secret on demand.

**Scope**: Authentication, secrets storage, provider execution path, and the UX for onboarding/rotating credentials. No workflow engine or UI canvas changes.

**Effort**: ~2-3 weeks including auth rollout, Vault wiring, provider refactors, and UX polish.

**Impact**:

- ✅ Users can run workflows with their own keys (BYOK) in shared deployments
- ✅ Secrets never touch localStorage/sessionStorage; only stay in WorkOS Vault + in-memory during execution
- ✅ Provider stack becomes pluggable (RunPod now, Replicate/HuggingFace next)
- ✅ Path cleared for hosted storage (video, assets) once backend storage ships

**Compatibility**: Requires a server-side datastore (for Vault secret IDs + metadata) and WorkOS services; compatible with existing Next.js architecture.

---

## Problem Statement

Current credential handling blocks deployability and introduces risk:

- **Env var dependency**: Deployments need RUNPOD_API_KEY baked into the environment, preventing multi-tenant BYOK.
- **No user identity**: Without authentication we cannot scope secrets per user/org.
- **Browser persistence risk**: Storing secrets in localStorage/sessionStorage would leak keys if users forget to clear them or share machines.
- **Limited provider support**: Hardcoded env vars couple us to RunPod and make additional providers painful.

### Security Concerns

- Env vars end up in build logs/deployment configs.
- Users cannot rotate or revoke their keys within atelier, so leaked keys persist.
- No audit trail for secret usage.
- Future features (hosted assets/video) demand authenticated, server-side storage of user data.

## Goals

### Immediate – **This Story**

- ✅ Authenticate users via WorkOS AuthKit (email/passkey/magic link) and issue HttpOnly session cookies.
- ✅ Store provider credentials in WorkOS Vault, indexed by user/org + provider.
- ✅ Refactor provider execution to resolve secrets server-side and proxy outbound requests.
- ✅ Ship onboarding/settings UI for managing provider credentials (create, rotate, revoke, view status).
- ✅ Ensure no secrets touch client storage or logs.

### Future (Keep in Mind, Not Now)

- ✅ Support multiple providers (fal, replicate, OpenAI) with the same secret pattern.
- ✅ Integrate hosted asset storage (e.g., R2) using authenticated backend APIs.
- ✅ Organization-level billing/usage dashboards leveraging WorkOS Directory Sync.
- ✅ Granular scopes (project-level API keys) and audit exports.

## Proposed Architecture

### Authentication Layer (WorkOS AuthKit)

- Add AuthKit middleware to Next.js App Router for login, logout, session refresh.
- Persist user + organization identifiers in an application database (minimal table).
- Gate existing APIs (`/api/generate-image`, workflow persistence) behind session checks.

### Secrets Management (WorkOS Vault)

- **Create**: When user submits a provider key, backend calls Vault `store` with context `{ userId, orgId, providerId }`; Vault returns a `secretId`.
- **Persist**: Save `secretId`, provider metadata (providerId, last4, createdAt, lastUsedAt, status) in our DB—never the plaintext key.
- **Retrieve**: Provider execution path requests Vault `retrieve` with the same context; decrypts to runtime memory only.
- **Rotate/Revoke**: New submissions overwrite stored metadata; revocation deletes the Vault entry and marks provider unusable.
- **Audit**: Vault logs every access; we can capture lightweight usage records (provider, timestamp, workflowId).

### Provider Execution Flow

1. Client requests `/api/run/<provider>` (e.g., existing `/api/generate-image`).
2. Route validates session, loads provider credential metadata, fetches plaintext key via Vault, and builds provider SDK client.
3. Perform provider call; on success/failure log usage metadata (no secret) and update `lastUsedAt`.
4. Response includes run results but never the secret.

### Data Model

| Field                                    | Purpose                                           |
| ---------------------------------------- | ------------------------------------------------- |
| `id`                                     | Internal row id                                   |
| `userId`                                 | AuthKit user id                                   |
| `orgId`                                  | AuthKit org id (optional)                         |
| `providerId`                             | `runpod`, `replicate`, etc.                       |
| `vaultSecretId`                          | Opaque string from Vault                          |
| `name`                                   | User-provided label (e.g., "My RunPod")           |
| `lastFour`                               | Last four characters of submitted key for display |
| `createdAt` / `updatedAt` / `lastUsedAt` | Tracking + audit                                  |
| `status`                                 | `active`, `revoked`, `error`                      |

The table lives in our existing database (e.g., Planetscale). Prisma schema update scoped to this story.

### Client UX

- **Provider Onboarding Checklist**: After login, show provider setup card when no active credentials exist.
- **Credential Modal**: Secure form posts to `/api/providers/:provider/credentials` (CSRF-protected). Client never holds plaintext longer than the submission lifecycle.
- **Status Surface**: List of configured providers with last used timestamp, ability to rotate (re-enter key), revoke, or set default.
- **Workflow Guardrails**: When running a node without configured provider credentials, prompt user to add the key first.

## Implementation Plan

### Phase 1: Authentication & Foundation

1. Integrate WorkOS AuthKit into Next.js (middleware, callback routes).
2. Create basic `users` and `orgMemberships` tables seeded from AuthKit profile data.
3. Protect existing API routes and workflow persistence behind session validation.

### Phase 2: Vault & Credential APIs

1. Add `provider_credentials` table (fields listed above).
2. Build API routes:
   - `POST /api/providers/:provider/credentials` → store via Vault, persist metadata.
   - `POST /api/providers/:provider/rotate` → create new secret, update metadata, revoke old.
   - `DELETE /api/providers/:provider/credentials` → delete Vault secret, mark metadata revoked.
   - `GET /api/providers` → list metadata (no secrets).
3. Implement server utilities for Vault interactions (store, retrieve, delete) with structured logging.

### Phase 3: Provider Execution Refactor

1. Update `lib/providers/runpod.ts` to accept a `ProviderCredential` resolver instead of env var.
2. Adjust `/api/generate-image/route.ts` to load the requester’s credential from DB, fetch the plaintext from Vault, and invoke RunPod.
3. Add caching layer (memory cache keyed by `userId+providerId`) with short TTL + revocation triggers to limit Vault round-trips.
4. Define interface for future providers so new adapters can reuse resolver.

### Phase 4: Client UX & Guardrails

1. Add “Provider Accounts” settings screen and onboarding banner.
2. Implement credential forms (submit → success, error states, validation).
3. Wire workflow run flow to check for active credentials and surface call-to-action if missing.
4. Add rotation/revocation flows with confirmations and toasts.

### Phase 5: Auditing & Observability

1. Log credential usage (provider, userId, workflowId, executionId, timestamp) without storing the key.
2. Add admin-only view to inspect credential status + last run.
3. Update `docs/context.md` with new auth + provider rules.

## User Stories

### US1: Configure Provider Credentials

**As a user**, I can authenticate, enter my RunPod API key once, and see that atelier is ready to run workflows with my key.

**Acceptance**:

- [ ] Logging in redirects me to a setup checklist if no credentials exist.
- [ ] Submitting the key results in success state; only masked details shown (e.g., last four characters).
- [ ] My credential status shows “Active” with last updated timestamp.

### US2: Run Workflows with My Key

**As a user**, when I run an image workflow, the server uses my stored key without prompting again.

**Acceptance**:

- [ ] `/api/generate-image` rejects unauthenticated requests.
- [ ] Provider call succeeds using the decrypted Vault secret tied to my account.
- [ ] No key material appears in the browser network inspector or logs.

### US3: Rotate or Revoke a Key

**As a user**, I can rotate or revoke my RunPod key from settings, and atelier immediately stops using the old key.

**Acceptance**:

- [ ] Rotation requires re-entering the new key and updates last four + timestamps.
- [ ] Revocation removes the Vault secret and blocks future runs until a new key is provided.
- [ ] Attempting to run without an active credential surfaces a prompt to add one.

### US4: Prepare for Additional Providers

**As a product**, we can add providers like Replicate without redesigning credential storage.

**Acceptance**:

- [ ] Credential APIs accept generic `providerId` values.
- [ ] Provider resolver returns the correct secret for any registered provider.
- [ ] UI supports multiple credential cards with independent states.

## Acceptance Criteria

### Security & Compliance

- [ ] Secrets exist only in WorkOS Vault and transient server memory.
- [ ] No secrets stored or cached on the client.
- [ ] All credential API routes require CSRF protection and session validation.
- [ ] Vault operations are contextualized by user/org for cryptographic isolation.

### Backend

- [ ] WorkOS AuthKit integrated; session guard applied to protected routes.
- [ ] `provider_credentials` table created with Prisma migration.
- [ ] Vault utility handles store/retrieve/delete with structured error handling.
- [ ] Provider adapters fetch secrets from Vault and never fall back to env vars.

### Frontend

- [ ] Provider onboarding flow blocks workflow execution until a credential is configured (with dismissible guidance for demo accounts if needed).
- [ ] Settings UI displays credential metadata (status, last used, last updated) without exposing secrets.
- [ ] Rotation/revocation flows confirm destructive actions and surface success/error toasts.

### Observability

- [ ] Credential usage logged with correlation IDs (userId, workflowId, executionId).
- [ ] Errors (missing credential, Vault failure) return actionable messages without leaking sensitive data.
- [ ] Monitoring/alerts for Vault availability added to ops checklist.

## Technical Design Notes

- **Vault Client**: Use WorkOS Vault SDK; initialize with server-side WorkOS API key. Wrap in helper functions to enforce context structure.
- **Session Propagation**: Use AuthKit’s session cookie; server routes read `req.user` (or equivalent) populated by middleware.
- **Caching**: Keep decrypted key in memory (per Node.js instance) for <=5 minutes, keyed by `{ userId, providerId, vaultSecretId }`; purge cache on rotation/revocation.
- **Secrets Metadata**: When storing, compute lastFour in backend and persist hashed variant for constant-time comparisons.
- **Error Handling**: Vault access failures should translate to 503 with retry guidance; invalid credentials flagged as `status = error` to prompt user rotation.
- **Testing Strategy**:
  - Unit: Vault helper mocks, provider resolver logic, guards.
  - Integration: Auth flow, credential CRUD, provider runs with mocked provider SDK.
  - End-to-end: Cypress/Playwright scenario covering login → credential setup → run → rotation.

## Decision Log

1. **Use WorkOS AuthKit**

   - _Rationale_: Provides auth, session management, and org support out of the box, aligning with future enterprise needs.
   - _Alternatives_: NextAuth (lacks enterprise features), custom auth (higher maintenance).

2. **Use WorkOS Vault Instead of DIY KMS**

   - _Rationale_: Built-in envelope encryption, per-context key isolation, BYOK, audit logs.
   - _Alternatives_: AWS KMS + custom storage; more operational overhead.

3. **Proxy Provider Calls Server-Side**

   - _Rationale_: Keeps secrets off the client, allows standardized logging, and supports multi-provider routing.
   - _Alternatives_: Direct client calls with stored keys (reject due to security).

4. **Cache Decrypted Keys Briefly**
   - _Rationale_: Reduce Vault round-trips while keeping exposure short-lived.
   - _Trade-off_: Need revocation hooks to invalidate cache.

## Open Questions

1. **Org vs User Scope**: Do we store one credential per user or allow organization-wide credentials with shared access? (Default: user-level; support org-level later.)
2. **Multi-Environment Strategy**: How do we handle staging vs production WorkOS projects and key separation?
3. **Usage Limits & Billing**: Do we need to enforce per-user rate limits or usage quotas once multiple providers are available?
4. **Anonymous Usage**: Should there be a “demo mode” with shared credentials for onboarding without auth? If yes, keep separate from Vault flow.

## Related Documents

- `docs/context.md` – Update with new auth + provider rules after implementation.
- `lib/providers/runpod.ts` – Will change to load per-user secrets.
- `app/api/generate-image/route.ts` – Entry point for provider execution.
- WorkOS docs: AuthKit + Vault SDKs.
