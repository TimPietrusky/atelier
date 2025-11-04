# Production Go-Live Execution Plan

## What I Can Automate (🤖)

I can execute these steps for you right now:

### 1. Generate Secure Cookie Password

```bash
pnpm generate:cookie-password
# or
node scripts/generate-cookie-password.js
```

**Output:** Secure 32+ character password for `WORKOS_COOKIE_PASSWORD`

### 2. Deploy Convex to Production

```bash
npx convex deploy --prod
```

**Requirements:** You must be logged into Convex CLI (`npx convex login`)
**Output:** Production Convex deployment URL

### 3. Validate Environment Variables

```bash
pnpm check:production-env
# or
node scripts/check-production-env.js
```

**Requirements:** Environment variables must be set (either locally or in Vercel)
**Output:** Validation report showing what's configured correctly

---

## What You Need to Do (👤)

These steps require manual action in dashboards/consoles:

### Step 1: Google Cloud Console (OAuth Setup)

**Time:** ~10-15 minutes

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select project
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URIs:
   - `https://auth.workos.com/sso/callback`
   - `https://YOUR-PRODUCTION-DOMAIN.com/callback`
6. **Save Client ID and Client Secret** - you'll need these for WorkOS

### Step 2: WorkOS Dashboard (Production Configuration)

**Time:** ~5-10 minutes

1. Switch to **Production** environment
2. Get production credentials:
   - API Key (`sk_live_...`)
   - Client ID (`client_live_...`)
3. Add production redirect URI: `https://YOUR-PRODUCTION-DOMAIN.com/callback`
4. Enable Google OAuth provider:
   - Use credentials from Step 1
   - Enter Google Client ID and Secret

### Step 3: Vercel Dashboard (Environment Variables)

**Time:** ~5 minutes

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these for **Production** environment:
   - `WORKOS_API_KEY` (from WorkOS Step 2)
   - `WORKOS_CLIENT_ID` (from WorkOS Step 2)
   - `WORKOS_REDIRECT_URI` (your production callback URL)
   - `WORKOS_COOKIE_PASSWORD` (from automated script)
   - `NEXT_PUBLIC_CONVEX_URL` (from Convex deployment)
3. Redeploy application

### Step 4: Testing

**Time:** ~10 minutes

1. Visit production domain
2. Test Google OAuth login
3. Verify user syncs to Convex
4. Test provider credentials
5. Test image generation

---

## Execution Order

### Phase 1: Automated Setup (I can do this)

1. ✅ Generate cookie password
2. ✅ Deploy Convex to production (if you're logged in)

### Phase 2: Manual Configuration (You do this)

3. 👤 Configure Google OAuth (Step 1 above)
4. 👤 Configure WorkOS production (Step 2 above)
5. 👤 Configure Vercel env vars (Step 3 above)

### Phase 3: Verification (You do this)

6. 👤 Test production deployment (Step 4 above)

---

## Quick Start Commands

**To start the automated steps, tell me:**

- "Generate the cookie password"
- "Deploy Convex to production" (if you're logged in)

**Or run them yourself:**

```bash
# Generate cookie password
pnpm generate:cookie-password

# Deploy Convex (requires login)
npx convex deploy --prod

# Check environment variables (after setting in Vercel)
pnpm check:production-env
```

---

## What I Need From You

**Before I can help automate, please provide:**

1. **Your production domain** (e.g., `atelier.example.com`)

   - Used for redirect URIs and callback URLs

2. **Confirmation you're ready** to:
   - Access Google Cloud Console
   - Access WorkOS Dashboard (production)
   - Access Vercel Dashboard

**Once you provide the domain, I can:**

- Generate cookie password immediately
- Help deploy Convex (if you're logged in)
- Provide exact redirect URIs for configuration

---

## Questions?

- **"Can you deploy Convex?"** → Yes, if you're logged into Convex CLI
- **"Can you configure Google OAuth?"** → No, requires Google Cloud Console access
- **"Can you set Vercel env vars?"** → No, requires Vercel Dashboard access
- **"Can you test production?"** → No, requires manual browser testing

**I can help with:**

- Generating secure passwords
- Running deployment commands
- Validating configuration
- Troubleshooting errors
