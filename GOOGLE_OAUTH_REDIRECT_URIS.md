# Google OAuth Redirect URIs Configuration

## Critical: All Redirect URIs Must Be Added

When WorkOS initiates Google OAuth, Google needs to know which redirect URIs are allowed. You must add **ALL** redirect URIs that WorkOS might use.

## Which Redirect URIs to Add

### 1. WorkOS Standard Redirect URI

```
https://auth.workos.com/sso/callback
```

### 2. Your Custom AuthKit Domain (if you have one)

If WorkOS assigned you a custom AuthKit domain, the path might vary. Common options:

- `https://seasoned-lyric-34.authkit.app/callback`
- `https://seasoned-lyric-34.authkit.app/sso/callback`
- `https://seasoned-lyric-34.authkit.app` (root, no path)

**⚠️ IMPORTANT:** The path depends on what WorkOS actually uses. To find the exact redirect URI:

**Method 1: Check Google Error URL (Most Reliable)**

1. Try signing in and get the `redirect_uri_mismatch` error
2. Look at the Google error page URL
3. Find the `redirect_uri=...` parameter (it will be URL-encoded)
4. Decode it - that's the EXACT URI you need to add

**Method 2: Check WorkOS Dashboard**

- WorkOS Dashboard → **AuthKit** → **Configuration**
- Look for redirect URI settings or custom domain configuration
- The redirect URI shown there is what WorkOS will use

**Method 3: Check Network Tab**

- Open browser DevTools → Network tab
- Click "Sign in with Google"
- Look at the request to Google - check the `redirect_uri` parameter

### 3. Your Production Callback URL

```
https://atelier.jetzt/callback
```

## How to Add Them in Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Click **Edit**
6. Scroll to **Authorized redirect URIs**
7. Click **Add URI** for each one:

   - `https://auth.workos.com/sso/callback`
   - `https://YOUR-AUTHKIT-DOMAIN.authkit.app/PATH` (check actual path - see above)
   - `https://atelier.jetzt/callback`

   **Note:** The AuthKit domain path might be `/callback`, `/sso/callback`, or just root. Check the error URL to see what WorkOS actually sends.

8. Click **Save**

## Important Notes

- **Exact match required**: The redirect URI must match EXACTLY (no trailing slashes, no query params)
- **Case sensitive**: URLs are case-sensitive
- **Protocol matters**: Must be `https://` (not `http://`)
- **Wait time**: Changes can take 1-2 minutes to propagate

## Finding Your Actual WorkOS Redirect URI

If you're unsure which redirect URI WorkOS is using:

1. **Check the error URL**: When you get `redirect_uri_mismatch`, look at the Google error page URL
2. **Decode the redirect_uri parameter**: It will show the exact URI WorkOS sent
3. **Add that exact URI** to Google Cloud Console

## Testing

After adding all redirect URIs:

1. Save changes in Google Cloud Console
2. Wait 1-2 minutes
3. Try signing in again from `atelier.jetzt/sign-in`
4. Should redirect directly to Google OAuth (no errors)
