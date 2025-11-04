# Production Configuration Summary

**Domain:** `atelier.jetzt`

## Generated Values

### Cookie Password
```
fLNR/064a1S9V/5vU2BJXPd2xQPPV9tm7k5+PWAn7DE=
```
**Use this for:** `WORKOS_COOKIE_PASSWORD` in Vercel

---

## Configuration Checklist

### ✅ Automated (Done)
- [x] Cookie password generated
- [ ] Convex production deployment (in progress)

### 👤 Manual Steps Required

#### 1. Google Cloud Console
**Redirect URIs to add:**
- `https://auth.workos.com/sso/callback`
- `https://atelier.jetzt/callback`

**After creating credentials, save:**
- Google Client ID
- Google Client Secret

#### 2. WorkOS Dashboard (Production)
**Redirect URI to add:**
- `https://atelier.jetzt/callback`

**Credentials to get:**
- Production API Key (`sk_live_...`)
- Production Client ID (`client_live_...`)

**Enable Google OAuth:**
- Use Google Client ID and Secret from Step 1

#### 3. Vercel Environment Variables (Production)
```bash
WORKOS_API_KEY=sk_live_...                    # From WorkOS
WORKOS_CLIENT_ID=client_live_...             # From WorkOS
WORKOS_REDIRECT_URI=https://atelier.jetzt/callback
WORKOS_COOKIE_PASSWORD=fLNR/064a1S9V/5vU2BJXPd2xQPPV9tm7k5+PWAn7DE=
NEXT_PUBLIC_CONVEX_URL=https://wooden-goshawk-619.convex.cloud  # Convex production deployment
```

---

## Next Steps

1. Wait for Convex deployment to complete (I'm running it now)
2. Configure Google OAuth (Step 1 above)
3. Configure WorkOS production (Step 2 above)
4. Set Vercel env vars (Step 3 above)
5. Test production deployment

