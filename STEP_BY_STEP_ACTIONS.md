# Step-by-Step Action Plan - Go Live with atelier.jetzt

## ✅ Completed Automatically

- [x] Cookie password generated: `fLNR/064a1S9V/5vU2BJXPd2xQPPV9tm7k5+PWAn7DE=`
- [x] Convex deployed to production: `https://wooden-goshawk-619.convex.cloud`
- [x] Documentation updated with domain `atelier.jetzt`

---

## Step 1: Configure Google OAuth (10-15 minutes)

### 1.1 Go to Google Cloud Console

1. Visit: https://console.cloud.google.com
2. Create a new project or select existing one
3. Note your project name

### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill in:
   - **App name**: `atelier`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. **Scopes**: `email`, `profile` (usually default)
6. **Test users**: Add your email (if in testing mode)
7. Click **Save and Continue** → **Back to Dashboard**

### 1.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. **Name**: `atelier-web`
5. **Authorized redirect URIs** - Add these EXACT URLs:

   ```
   https://auth.workos.com/sso/callback
   https://atelier.jetzt/callback
   ```

   **⚠️ IMPORTANT:** If WorkOS assigned you a custom AuthKit domain (like `seasoned-lyric-34.authkit.app`), you MUST also add:

   ```
   https://YOUR-AUTHKIT-DOMAIN.authkit.app/callback
   ```

   **How to find your AuthKit domain:**

   - Check WorkOS Dashboard → **AuthKit** → **Configuration**
   - Look for custom domain settings
   - Or check the URL when redirected to WorkOS pages

6. Click **Create**
7. **📋 COPY AND SAVE THESE VALUES:**
   - **Client ID**: `...apps.googleusercontent.com` (save this!)
   - **Client Secret**: `...` (save this securely!)

**⚠️ IMPORTANT:** You'll need these for Step 2 (WorkOS configuration)

---

## Step 2: Configure WorkOS Production (5-10 minutes)

### 2.1 Switch to Production Environment

1. Go to: https://dashboard.workos.com
2. **Switch to Production environment** (top-right dropdown)
3. Verify you see "Production" badge (not Development/Staging)

### 2.2 Get Production Credentials

1. Navigate to **API Keys**
2. Copy your **Server-side API key** (starts with `sk_live_...`)
   - ⚠️ Must be production key, NOT development
3. Navigate to **AuthKit** → **Configuration**
4. Copy your **Client ID** (starts with `client_live_...`)
   - ⚠️ Must match production environment

**📋 SAVE THESE VALUES** - You'll need them for Vercel in Step 3

### 2.3 Add Production Redirect URI

1. In WorkOS Dashboard → **AuthKit** → **Redirect URIs**
2. Click **Add Redirect URI**
3. Enter: `https://atelier.jetzt/callback`
4. Click **Save**
5. Verify it appears in the list

### 2.4 Enable Google OAuth Provider

1. Navigate to **AuthKit** → **Social Login**
2. Find **Google** in the provider list
3. Click **Configure** or **Add Provider**
4. Select **"Your app's credentials"** (NOT "Use WorkOS test credentials")
5. Enter the credentials from Step 1.3:
   - **Client ID**: Paste Google Client ID
   - **Client Secret**: Paste Google Client Secret
6. Click **Save** or **Enable**
7. Verify Google shows as **Enabled** with green checkmark ✅

### 2.5 Verify AuthKit Settings

- Go to **AuthKit** → **Configuration**
- Verify:
  - ✅ AuthKit is **Enabled**
  - ✅ Client ID starts with `client_live_` (production)
  - ✅ Redirect URIs include `https://atelier.jetzt/callback`

---

## Step 3: Configure Vercel Environment Variables (5 minutes)

### 3.1 Access Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your **atelier** project
3. Go to **Settings** → **Environment Variables**

### 3.2 Add Production Variables

**⚠️ CRITICAL:** Select **Production** environment (not Preview/Development)

Add these variables one by one:

| Variable Name            | Value                                          | Source               |
| ------------------------ | ---------------------------------------------- | -------------------- |
| `WORKOS_API_KEY`         | `sk_live_...`                                  | From WorkOS Step 2.2 |
| `WORKOS_CLIENT_ID`       | `client_live_...`                              | From WorkOS Step 2.2 |
| `WORKOS_REDIRECT_URI`    | `https://atelier.jetzt/callback`               | (This exact value)   |
| `WORKOS_COOKIE_PASSWORD` | `fLNR/064a1S9V/5vU2BJXPd2xQPPV9tm7k5+PWAn7DE=` | Generated above      |
| `NEXT_PUBLIC_CONVEX_URL` | `https://wooden-goshawk-619.convex.cloud`      | Convex deployment    |

**After adding each variable:**

- Make sure **Production** is selected
- Click **Save**

### 3.3 Redeploy Application

1. Go to **Deployments** tab
2. Find latest deployment
3. Click **...** (three dots) → **Redeploy**
4. Confirm redeployment
5. Wait for deployment to complete (~2-3 minutes)

---

## Step 4: Test Production (10 minutes)

### 4.1 Test Authentication Flow

1. Visit: https://atelier.jetzt
2. Should redirect to WorkOS login page
3. **Verify Google login button appears** ✅
4. Click **"Sign in with Google"**
5. Complete Google OAuth flow:
   - Authorize the app
   - Select your Google account
   - Grant permissions
6. Should redirect back to `https://atelier.jetzt/workflow`
7. Should be authenticated (no login prompt)

### 4.2 Verify User Sync to Convex

1. Go to: https://dashboard.convex.dev
2. Select deployment: **wooden-goshawk-619** (production)
3. Go to **Data** → **users** table
4. Should see your user record with:
   - `workosUserId` (from WorkOS)
   - `email` (your Google email)
   - `createdAt` timestamp

### 4.3 Test Provider Credentials

1. In production app (`https://atelier.jetzt`), click **Settings** button
2. Add a RunPod API key:
   - Enter your RunPod API key
   - Click **Save**
3. Verify credential appears with last 4 characters
4. Verify in Convex:
   - Go to Convex Dashboard → **Data** → **providerCredentials** table
   - Should see credential metadata (NOT the actual key - that's in WorkOS Vault)

### 4.4 Test Image Generation

1. Create an image node in workflow
2. Configure model and prompt
3. Click **Run**
4. Should use your RunPod credential from Vault
5. Image should generate successfully ✅

---

## Troubleshooting

### "Invalid client secret" Error

- **Cause:** WorkOS API key and Client ID are from different environments
- **Fix:** Verify both are from **Production** environment in WorkOS dashboard

### "Redirect URI mismatch" Error

- **Cause:** Callback URL not configured correctly
- **Fix:**
  - WorkOS: Verify `https://atelier.jetzt/callback` is in Redirect URIs
  - Google: Verify `https://auth.workos.com/sso/callback` and `https://atelier.jetzt/callback` are in Authorized redirect URIs
  - Wait 1-2 minutes for changes to propagate

### Google OAuth Button Not Appearing

- **Cause:** Google provider not enabled in WorkOS
- **Fix:** WorkOS Dashboard → AuthKit → Social Login → Verify Google is **Enabled**

### User Not Syncing to Convex

- **Cause:** Wrong Convex URL or deployment not synced
- **Fix:** Verify `NEXT_PUBLIC_CONVEX_URL` is `https://wooden-goshawk-619.convex.cloud` in Vercel

---

## Summary

**All configuration values you need:**

- **Cookie Password:** `fLNR/064a1S9V/5vU2BJXPd2xQPPV9tm7k5+PWAn7DE=`
- **Convex URL:** `https://wooden-goshawk-619.convex.cloud`
- **Production Domain:** `atelier.jetzt`
- **Redirect URIs:**
  - WorkOS: `https://atelier.jetzt/callback`
  - Google: `https://auth.workos.com/sso/callback` and `https://atelier.jetzt/callback`

**You still need to get:**

- Google Client ID and Secret (from Step 1)
- WorkOS Production API Key and Client ID (from Step 2)

**After Step 3 (Vercel), everything should work!** 🚀
