# Landing Page + Auth + Waitlist (Vercel)

A focused plan to add a public landing page with a waitlist, introduce authentication, protect the app and API routes, and prepare a clean Vercel launch — aligned with our existing conventions.

---

## 🌐 Feature Map

### Marketing & Access

- Public landing page with value prop, screenshots, and CTA
- Waitlist form (email capture) with double opt-in
- Legal pages: Privacy, Terms
- Public status/health endpoint

### Auth & Gating

- Login (Auth.js/NextAuth) with OAuth (GitHub, Google) and optional passkeys later
- Early-access allowlist gate for the Studio
- Role: `visitor` (unauth), `user` (auth), optional `admin`

### Protected App

- Studio lives under `/(app)` and requires session
- All productive API routes require an authenticated session

### Operations

- Vercel deployment: staging + production
- Basic analytics (Vercel Analytics) and SEO metadata
- Rate limiting + captcha on public write endpoints (waitlist)

---

## 📖 User Story

### 1. Visitor discovers the site

- Lands on `/` (public). Sees what the project does, screenshots, and a clear CTA.
- Can join the waitlist via a small email form (client-side validation).
- Receives a confirmation email to complete double opt-in.

### 2. Signing in

- Clicks “Sign in” → `/login` (public). Chooses GitHub or Google.
- If early-access is enabled and the user is not allowlisted → sees “Early access only” message and a prompt to join the waitlist.
- If allowed → redirected to `/(app)` and the Studio loads.

### 3. Using the Studio

- If no provider is connected, the Connect Provider wizard appears (see `@001_init.md`).
- User runs workflows; outputs appear inline and in Media Manager.

### 4. Notifications & Launch

- We can send updates to the waitlist (e.g., GA announcement).
- Once GA, disable the allowlist gate so any authenticated user can access the Studio.

---

## 🏗️ Architecture & Routing

- Next.js App Router with route groups:
  - `app/(marketing)/(...)` → public marketing pages (`/`, `/privacy`, `/terms`, `/login`)
  - `app/(app)/(...)` → protected Studio (graph, chat, media)
- `middleware.ts` enforces auth on `/(app)` and pass-through on `/(marketing)`.
- API routes:
  - Public: `POST /api/waitlist`, `GET /api/health`
  - Protected: `POST /api/generate-image`, `POST /api/chat` (and any future execution endpoints)
- Runtime:
  - Marketing routes can run at the Edge where convenient
  - Execution/API routes run in Node (needed for SDK/provider libs)

---

## 🔐 Auth & Backend Protection

- Use Auth.js (NextAuth v5) for App Router; session stored in secure cookies.
- Providers: GitHub, Google to start; add passkeys later.
- Gatekeeping:
  - `allowlist` check on session (toggleable feature flag). If enabled, non-allowlisted users see a friendly message and waitlist CTA.
  - All productive API routes assert `session?.user?.id` and reject unauthenticated requests.
- Logging & privacy (see `conventions.md`):
  - Never log full base64 media or secrets; log only truncated previews and counts.
  - Sanitize server logs for request payloads.

---

## 📬 Waitlist (Data & Flow)

- Storage: Vercel Postgres (simple, reliable), table `waitlist_subscribers`:
  - `id` (uuid), `email` (lowercased, unique), `status` (`pending` | `confirmed`), `source` (`landing` | `invite`), `created_at` (timestamp), `confirmed_at` (timestamp), `ip_hash` (optional, for abuse signals)
- Endpoint: `POST /api/waitlist` (public)
  - Fields: `{ email, token? }`
  - Flow:
    - Submit email → create `pending` row if not existing; send confirmation email with token link.
    - Clicking confirmation link → `token` verifies → set `status=confirmed`, `confirmed_at`.
  - Abuse prevention: Upstash Ratelimit (IP-based), hCaptcha/Turnstile on client.
- Email: Resend (or another provider) for transactional emails.
  - Templates: Confirmation, Welcome/GA announcement.
- Admin needs (minimal, v1):
  - Export CSV from Vercel Postgres or a simple protected API (`GET /api/waitlist/export` for `admin`).

---

## 🧭 UI/UX Conventions (Marketing)

- Hero with clear value prop, single CTA (“Join the waitlist” or “Open Studio” when signed in).
- Feature highlights with short copy and product screenshots (pulled from `/public`).
- Footer with links: Privacy, Terms, GitHub repo (if public), Contact.
- Login entry point visible in the header; shows avatar when authenticated.
- When logged in, primary CTA becomes “Open Studio”.

---

## ⚙️ Implementation Notes (High-Level)

- Route groups:
  - `app/(marketing)/page.tsx` → landing
  - `app/(marketing)/login/page.tsx` → auth entry
  - `app/(marketing)/privacy/page.tsx`, `app/(marketing)/terms/page.tsx`
  - `app/(app)/page.tsx` → existing Studio surface; guard in `middleware.ts`
- Auth.js setup:
  - `app/api/auth/[...nextauth]/route.ts` (App Router handler)
  - Providers: GitHub, Google; session strategy: JWT (or DB-backed if we add profiles)
- Middleware guard:
  - If path starts with `/(app)`, require `session`; otherwise redirect to `/login?from=...`
- Waitlist endpoints:
  - `POST /api/waitlist` (create + send confirmation)
  - `GET  /api/waitlist/confirm?token=...` (confirm)
- Security:
  - Rate limit `POST /api/waitlist`
  - Validate email, strip dangerous input, store lowercase
  - Do not expose provider API keys to the browser; server-side adapters read keys from env or per-user secrets store (future)
- Observability:
  - Use Vercel Analytics on marketing pages; avoid adding noise to Studio runtime logs

---

## 🚀 Vercel Deployment Plan

- Environments: `staging` and `production` projects
- Env vars:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - OAuth client IDs/secrets (`GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
  - `DATABASE_URL` (Vercel Postgres)
  - Email provider keys (e.g., `RESEND_API_KEY`)
- Build targets:
  - Marketing routes eligible for edge; Studio & API routes use Node.js runtime as needed
- Domains:
  - Root → landing; app path under same domain (`/app`) to keep cookies simple
- Analytics & SEO:
  - Add Open Graph metadata, sitemap, robots; enable Vercel Analytics

---

## ✅ Acceptance Criteria

### Marketing & Waitlist

- [ ] Landing page at `/` with hero, features, screenshots, CTA
- [ ] Waitlist form with client validation, visual feedback
- [ ] Double opt-in via email; confirmed stored in Postgres
- [ ] Privacy and Terms pages reachable from footer

### Auth & Gating

- [ ] Login with GitHub and Google on `/login`
- [ ] `/(app)` routes require session via `middleware.ts`
- [ ] Early-access allowlist toggle; friendly lock screen when off-list
- [ ] All productive API routes reject unauthenticated requests

### Operations

- [ ] Rate limiting and captcha on `POST /api/waitlist`
- [ ] Logs sanitized (no base64/original media), following `conventions.md`
- [ ] Staging and production deployed on Vercel with required env vars

---

## 📌 Notes & Alignment with `conventions.md`

- Keep provider integrations in `lib/providers/*`; do not call raw endpoints from marketing or auth code.
- Persist Studio state on the client as before (Dexie/OPFS) — landing/auth adds no change to graph persistence.
- Execution endpoints remain server-side and require auth; sanitize logs as defined.
- Images used on the landing page live in `/public` and are small, optimized assets.

---

## 🧭 Rollout Strategy

1. Ship landing + waitlist first (no Studio access required)
2. Enable login and allowlist gate; onboard first users
3. Iterate on Studio while expanding allowlist
4. Announce GA to confirmed waitlist; disable allowlist gate

---

## ⚠️ Risks & Mitigations

- Spam signups → rate limit + captcha + email confirmation
- OAuth misconfig → test in staging, verify callback URLs
- Leaking keys in logs → sanitize by default and add code reviews
- Auth regressions → middleware unit tests and manual smoke tests on staging

---

## 🗺️ Open Questions (for later)

- Do we want a lightweight admin page for waitlist management, or keep SQL/CSV?
- Add passkey/passwordless auth now or post-GA?
- Should we support invite codes in addition to allowlist?
