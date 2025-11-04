# Production Go-Live Checklist

Complete step-by-step guide to deploy atelier to production with WorkOS social login.

**Legend:**

- 🤖 **Automated** - I can execute this for you
- 👤 **Manual** - You need to do this (dashboard/console access required)

---

## Quick Start: What I Need From You

**Before I can automate steps, I need:**

1. **Your production domain**: `atelier.jetzt` ✅
2. **Confirmation** you're ready to configure:
   - Google Cloud Console (OAuth credentials)
   - WorkOS Dashboard (production environment)
   - Vercel Dashboard (environment variables)

**What I can automate:**

- 🤖 Generate secure cookie password
- 🤖 Deploy Convex to production (if you're logged in)
- 🤖 Validate environment variables configuration
- 🤖 Check production setup

**What requires manual action:**

- 👤 Google Cloud Console setup (OAuth credentials)
- 👤 WorkOS Dashboard configuration
- 👤 Vercel environment variable entry
- 👤 Testing/verification

---

## Step 1: Deploy Convex to Production

🤖 **I can run this command for you**

### 1.1 Generate Production Deployment

**🤖 I can run this for you** - Just tell me when you're ready.

```bash
npx convex deploy --prod
```

**What this does:**

- Creates a production Convex deployment (separate from dev)
- Generates a production deployment URL (e.g., `https://your-project.convex.cloud`)
- Syncs your schema and functions to production

**⚠️ Requires:** You must be logged into Convex CLI (`npx convex login`)

### 1.2 Note Your Production Convex URL

After deployment, you'll see output like:

```
Production deployment: https://your-project-name.convex.cloud
```

**👤 Action Required:** Save this URL - you'll need it for Vercel environment variables.

### 1.3 Verify Production Deployment

**👤 Manual verification:**

- Go to [Convex Dashboard](https://dashboard.convex.dev)
- Select your production deployment
- Verify schema is synced (check `users`, `orgMemberships`, `providerCredentials` tables exist)

---

## Step 2: Configure Google OAuth

**👤 All steps require manual action** - Google Cloud Console access required.

### 2.1 Create Google Cloud Project

**👤 Manual:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Note your project name/number

### 2.2 Configure OAuth Consent Screen

**👤 Manual:**

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill in required fields:
   - **App name**: atelier (or your app name)
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. **Scopes**: Add `email`, `profile` (usually added by default)
6. **Test users** (if in testing): Add your email
7. **Publishing**: Submit for verification if going public (can skip for testing)

### 2.3 Create OAuth 2.0 Credentials

**👤 Manual:**

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. **Name**: atelier-web (or descriptive name)
5. **Authorized redirect URIs** - Add these:
   ```
   https://auth.workos.com/sso/callback
   https://atelier.jetzt/callback
   ```
   (Your domain: `atelier.jetzt`)
6. Click **Create**
7. **Copy both values**:
   - **Client ID** (starts with `...apps.googleusercontent.com`)
   - **Client Secret** (long random string)

**⚠️ CRITICAL**: Save these securely - you'll need them for WorkOS configuration in Step 3.

---

## Step 3: Configure WorkOS Production

**👤 All steps require manual action** - WorkOS Dashboard access required.

### 3.1 Switch to Production Environment

**👤 Manual:**

1. Go to [WorkOS Dashboard](https://dashboard.workos.com)
2. **Switch to Production environment** (top-right dropdown)
3. Verify you're in Production (not Development/Staging)

### 3.2 Get Production API Credentials

**👤 Manual:**

1. Navigate to **API Keys**
2. Copy your **Server-side API key** (starts with `sk_live_...`)
   - ⚠️ Use production key, NOT development key
3. Navigate to **AuthKit** → **Configuration**
4. Copy your **Client ID** (starts with `client_live_...`)
   - ⚠️ Must match production environment

**📋 Save these values** - you'll need them for Vercel environment variables in Step 4.

### 3.3 Configure Production Redirect URIs

**👤 Manual:**

1. In WorkOS Dashboard → **AuthKit** → **Redirect URIs**
2. Add your production callback URL:
   ```
   https://atelier.jetzt/callback
   ```
   (Your domain: `atelier.jetzt`)
3. Keep `http://localhost:3000/callback` for local development (if needed)
4. Click **Save**

### 3.4 Enable Google OAuth Provider

**👤 Manual:**

1. Navigate to **AuthKit** → **Social Login**
2. Find **Google** in the list
3. Click **Configure** or **Add Provider**
4. Select **"Your app's credentials"** (not WorkOS test credentials)
5. Enter the credentials from Step 2.3:
   - **Client ID**: Paste Google Client ID
   - **Client Secret**: Paste Google Client Secret
6. Click **Save** or **Enable**
7. Verify Google appears as **Enabled** with green checkmark

### 3.5 Verify AuthKit Settings

**👤 Manual verification:**

- **AuthKit** → **Configuration**:
  - ✅ AuthKit is **Enabled**
  - ✅ Client ID is production (`client_live_...`)
  - ✅ Redirect URIs include production URL

---

## Step 4: Configure Vercel Environment Variables

**👤 Manual + 🤖 Automated**

### 4.1 Generate Secure Cookie Password

**🤖 I can generate this for you:**

```bash
node scripts/generate-cookie-password.js
```

**Or manually:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**📋 Copy the output** - you'll paste it into Vercel as `WORKOS_COOKIE_PASSWORD`.

### 4.2 Access Vercel Project Settings

**👤 Manual:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**

### 4.3 Add Production Environment Variables

**👤 Manual - Add these variables for Production environment:**

```bash
# WorkOS Production Credentials
WORKOS_API_KEY=sk_live_...                    # From Step 3.2
WORKOS_CLIENT_ID=client_live_...             # From Step 3.2
WORKOS_REDIRECT_URI=https://atelier.jetzt/callback
WORKOS_COOKIE_PASSWORD=...                   # From Step 4.1

# Convex Production
NEXT_PUBLIC_CONVEX_URL=https://your-project-name.convex.cloud  # From Step 1.2
```

**⚠️ Important:**

- Select **Production** environment (not Preview/Development)
- Domain is `atelier.jetzt`
- Use values from previous steps

### 4.4 Verify Environment Variables

**🤖 I can validate this after you set them:**

```bash
# Check production environment variables
node scripts/check-production-env.js
```

**Required variables (all must be set for Production):**

- ✅ `WORKOS_API_KEY` (production key, starts with `sk_live_`)
- ✅ `WORKOS_CLIENT_ID` (production key, starts with `client_live_`)
- ✅ `WORKOS_REDIRECT_URI` (production callback URL)
- ✅ `WORKOS_COOKIE_PASSWORD` (32+ character secure string)
- ✅ `NEXT_PUBLIC_CONVEX_URL` (production Convex deployment URL)

**⚠️ CRITICAL CHECKS:**

- All WorkOS credentials are from **Production** environment (not dev)
- `WORKOS_REDIRECT_URI` matches your production domain
- `NEXT_PUBLIC_CONVEX_URL` is production Convex deployment (not dev)

### 4.5 Redeploy Application

**👤 Manual:**
After adding environment variables:

1. Go to **Deployments** tab
2. Click **...** on latest deployment → **Redeploy**
3. Or push a new commit to trigger automatic deployment
4. Wait for deployment to complete

---

## Step 5: Verify Production Deployment

**👤 All steps require manual testing**

### 5.1 Test Authentication Flow

1. Visit your production domain: `https://atelier.jetzt`
2. Should redirect to WorkOS login page
3. **Verify Google login button appears** (if configured correctly)
4. Test Google OAuth:
   - Click "Sign in with Google"
   - Complete Google OAuth flow
   - Should redirect back to your app
   - Should be authenticated and see `/workflow` page

### 5.2 Test User Sync to Convex

1. After logging in, verify user was created in Convex:
   - Go to [Convex Dashboard](https://dashboard.convex.dev)
   - Select production deployment
   - Go to **Data** → **users** table
   - Should see your user record with `workosUserId` and `email`

### 5.3 Test Provider Credentials

1. In production app, click **Settings** button
2. Add a RunPod API key
3. Verify credential appears with last 4 characters
4. Verify credential stored in Convex:
   - Go to Convex Dashboard → **Data** → **providerCredentials** table
   - Should see credential metadata (not the actual key - that's in WorkOS Vault)

### 5.4 Test Image Generation

1. Create an image node in workflow
2. Configure model and prompt
3. Click **Run**
4. Should use your RunPod credential from Vault
5. Image should generate successfully

---

## Step 6: Post-Launch Verification

### 6.1 Check Logs

**Vercel Logs:**

- Go to Vercel Dashboard → **Deployments** → Select deployment → **Functions** tab
- Check for any authentication errors
- Verify no "invalid_client" or "redirect_uri_mismatch" errors

**Convex Logs:**

- Go to Convex Dashboard → **Logs**
- Verify user creation mutations are working
- Check for any errors in credential storage

### 6.2 Monitor Errors

- Check browser console for client-side errors
- Monitor WorkOS Dashboard → **Logs** for auth issues
- Set up error tracking (Sentry, etc.) if needed

---

## Troubleshooting

### "Invalid client secret" Error

**Cause**: WorkOS API key and Client ID are from different environments

**Fix**:

- Verify both `WORKOS_API_KEY` and `WORKOS_CLIENT_ID` are from **Production** environment
- Check WorkOS Dashboard shows production environment (top-right)
- Redeploy Vercel after fixing environment variables

### "Redirect URI mismatch" Error

**Cause**: Callback URL not configured in WorkOS or Google

**Fix**:

- WorkOS Dashboard → AuthKit → Redirect URIs: Add production callback URL
- Google Cloud Console → Credentials → Authorized redirect URIs: Add `https://auth.workos.com/sso/callback` and production callback URL
- Wait 1-2 minutes for changes to propagate

### Google OAuth Button Not Appearing

**Cause**: Google provider not enabled or misconfigured in WorkOS

**Fix**:

- WorkOS Dashboard → AuthKit → Social Login → Verify Google is **Enabled**
- Check Google credentials are correct (Client ID and Secret)
- Verify OAuth consent screen is configured in Google Cloud Console

### Convex Errors / User Not Syncing

**Cause**: Wrong Convex URL or deployment not synced

**Fix**:

- Verify `NEXT_PUBLIC_CONVEX_URL` points to production deployment
- Check Convex Dashboard → verify schema is synced
- Verify Convex functions (`syncUser`, `providerCredentials`) are deployed

### Cookie/Session Issues

**Cause**: Cookie password mismatch or domain issues

**Fix**:

- Verify `WORKOS_COOKIE_PASSWORD` is set correctly in Vercel
- Check cookie domain settings match your production domain
- Clear browser cookies and retry

---

## Summary Checklist

**Before going live, verify:**

- [ ] Convex deployed to production and URL saved
- [ ] Google OAuth credentials created and saved
- [ ] Google redirect URIs configured (WorkOS callback + production callback)
- [ ] WorkOS production API key and Client ID obtained
- [ ] WorkOS production redirect URI configured
- [ ] Google OAuth provider enabled in WorkOS production dashboard
- [ ] All production environment variables set in Vercel
- [ ] Vercel deployment redeployed with new env vars
- [ ] Production site accessible and redirects to WorkOS login
- [ ] Google login button appears on WorkOS login page
- [ ] Google OAuth flow completes successfully
- [ ] User synced to Convex production database
- [ ] Provider credentials can be added and work correctly

---

## Important Notes

1. **Separate Environments**: Keep dev and production credentials separate. Never mix them.

2. **Security**:

   - Never commit production credentials to git
   - Use Vercel environment variables (never hardcode)
   - Rotate `WORKOS_COOKIE_PASSWORD` periodically

3. **Testing**: Test thoroughly in production before announcing to users.

4. **Monitoring**: Set up error tracking and monitor logs for the first few days after launch.

5. **Backup**: Keep a record of all production credentials in a secure password manager.
