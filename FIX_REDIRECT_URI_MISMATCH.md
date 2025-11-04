# Fix: Google OAuth redirect_uri_mismatch Error

## Problem

Google is rejecting the OAuth request because the redirect URI doesn't match what's configured in Google Cloud Console.

## Solution: Verify Exact Redirect URI

### Step 1: Check What Redirect URI WorkOS is Using

When you click "Sign in with Google" and get the error, check the browser's address bar. The error URL will show what redirect_uri WorkOS sent to Google.

**Look for:** `redirect_uri=...` in the error URL

Common formats WorkOS might use:

- `https://auth.workos.com/sso/callback` (standard)
- `https://YOUR-PROJECT.authkit.app/callback` (custom AuthKit domain)
- `https://auth.workos.com/sso/callback?provider=GoogleOAuth` (with query params - usually not)
- `https://api.workos.com/sso/callback` (less common)

### Step 2: Update Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one you created for atelier)
5. Click **Edit** (pencil icon)
6. Scroll to **Authorized redirect URIs**
7. **CRITICAL:** Check what's currently listed

### Step 3: Add the Correct Redirect URI

**Make sure you have EXACTLY these (no trailing slashes, exact match):**

```
https://auth.workos.com/sso/callback
https://atelier.jetzt/callback
```

**⚠️ CRITICAL:** If WorkOS assigned you a custom AuthKit domain (check WorkOS Dashboard), also add:

```
https://YOUR-AUTHKIT-DOMAIN.authkit.app/callback
```

Replace `YOUR-AUTHKIT-DOMAIN` with your actual domain (e.g., `seasoned-lyric-34`).

**Common mistakes to avoid:**

- ❌ `https://auth.workos.com/sso/callback/` (trailing slash)
- ❌ `http://auth.workos.com/sso/callback` (http instead of https)
- ❌ `https://auth.workos.com/sso/callback?provider=GoogleOAuth` (query params)
- ✅ `https://auth.workos.com/sso/callback` (correct)

### Step 4: Verify No Typos

Double-check for:

- Exact spelling: `auth.workos.com` (not `api.workos.com`)
- Exact path: `/sso/callback` (not `/callback` or `/sso/callbacks`)
- Protocol: `https://` (not `http://`)
- No spaces before/after the URI

### Step 5: Save and Wait

1. Click **Save** in Google Cloud Console
2. **Wait 1-2 minutes** for changes to propagate
3. Try the login flow again

---

## Alternative: Check WorkOS Documentation

If the above doesn't work, WorkOS might use a different callback URL. Check:

1. WorkOS Dashboard → **AuthKit** → **Social Login** → **Google** → Look for callback URL hint
2. WorkOS documentation for Google OAuth setup

---

## Quick Fix Checklist

- [ ] Opened Google Cloud Console → Credentials
- [ ] Found the correct OAuth Client ID
- [ ] Checked current Authorized redirect URIs
- [ ] Added `https://auth.workos.com/sso/callback` (exact, no trailing slash)
- [ ] Added `https://atelier.jetzt/callback` (exact, no trailing slash)
- [ ] Saved changes
- [ ] Waited 1-2 minutes
- [ ] Tried login again

---

## Still Not Working?

If you're still getting the error after verifying the redirect URI matches exactly:

1. **Check the error URL** - Look at the full Google error page URL
2. **Copy the exact redirect_uri** from the error (it will be URL-encoded)
3. **Decode it** and add that exact value to Google Cloud Console
4. **Try again**

The redirect URI in the error message is what Google received - that's the authoritative source.
