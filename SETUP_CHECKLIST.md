# Secure Provider Credentials - Setup Checklist

## ✅ Completed Implementation

- [x] WorkOS AuthKit middleware configured
- [x] Callback route at `/callback`
- [x] Convex schema with users, orgMemberships, providerCredentials tables
- [x] Vault utilities for secret storage/retrieval
- [x] Credential API routes (GET, POST, DELETE)
- [x] Provider execution refactored to use Vault credentials
- [x] UI components (settings, onboarding banner)
- [x] Workflow guardrails

## 🔧 Required Setup Steps

### 1. Environment Variables
Add to `.env.local`:
```bash
WORKOS_API_KEY=sk_...          # From WorkOS dashboard
WORKOS_CLIENT_ID=client_...   # From WorkOS dashboard  
WORKOS_REDIRECT_URI=http://localhost:3000/callback
WORKOS_COOKIE_PASSWORD=...     # At least 32 characters - use a secure random string
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud  # From `npx convex dev`
```

**Generate a secure cookie password:**
```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. WorkOS Configuration
- [ ] Verify callback URL in WorkOS dashboard matches: `http://localhost:3000/callback`
- [ ] Create a Vault in WorkOS dashboard (if required - check WorkOS docs)
- [ ] Verify AuthKit is enabled for your WorkOS project

### 3. Convex Setup
- [ ] Run `npx convex dev` to initialize and get deployment URL
- [ ] Verify Convex functions are syncing (check terminal output)
- [ ] Confirm `convex/_generated/api.d.ts` is generated

### 4. Testing Flow
1. [ ] Start dev servers: `pnpm dev:all` (or run separately)
2. [ ] Visit `http://localhost:3000` - should redirect to WorkOS login
3. [ ] Authenticate via WorkOS
4. [ ] Should redirect back to app
5. [ ] Click "Settings" button in header
6. [ ] Add RunPod API key
7. [ ] Verify credential appears with last 4 chars
8. [ ] Create image node and run workflow
9. [ ] Should use your RunPod key (check logs - no key should appear)

## 🐛 Common Issues

**"Unauthorized" errors:**
- Check middleware is protecting routes correctly
- Verify WorkOS session cookies are being set

**"Vault error" or "WORKOS_VAULT_ID not set":**
- WorkOS Vault might not require a separate Vault ID - check if using organization-level vault
- Verify WorkOS API key has Vault permissions

**Convex errors:**
- Ensure `npx convex dev` is running
- Check `NEXT_PUBLIC_CONVEX_URL` is set correctly
- Verify Convex functions are deployed (check Convex dashboard)

**Type errors:**
- Run `npx convex dev` to regenerate types
- Restart TypeScript server in your editor

## 📝 Notes

- User records are created lazily when they add credentials (via API routes)
- Secrets are never logged or stored client-side
- Credential resolver caches keys for 5 minutes
- Workflow execution checks for credentials before running

