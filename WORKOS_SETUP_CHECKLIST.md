# WorkOS Setup Checklist

## Required WorkOS Dashboard Configuration

### 1. Verify API Key Type
- Go to WorkOS Dashboard → **API Keys**
- Make sure you're using the **Server-side API key** (starts with `sk_`)
- **NOT** the publishable key (starts with `pk_`)
- Copy the full API key to `.env.local` as `WORKOS_API_KEY=sk_...`

### 2. Verify Client ID
- Go to WorkOS Dashboard → **AuthKit** → **Configuration**
- Find your **Client ID** (starts with `client_`)
- Copy it to `.env.local` as `WORKOS_CLIENT_ID=client_...`

### 3. Verify Redirect URI
- In WorkOS Dashboard → **AuthKit** → **Redirect URIs**
- Make sure `http://localhost:3000/callback` is listed
- If not, add it and save

### 4. Verify Environment Match
- **CRITICAL**: API Key and Client ID must be from the **same environment**
- If using development environment in WorkOS → use dev API key + dev Client ID
- If using production environment → use prod API key + prod Client ID
- **Mismatched environments cause "Invalid client secret" errors**

### 5. Check AuthKit Status
- In WorkOS Dashboard → **AuthKit**
- Make sure AuthKit is **enabled** for your project
- Check that your authentication methods are configured (email/password, magic links, etc.)

## Environment Variables Checklist

Your `.env.local` should have:

```bash
WORKOS_API_KEY=sk_...           # Server-side API key from API Keys section
WORKOS_CLIENT_ID=client_...    # Client ID from AuthKit Configuration
WORKOS_REDIRECT_URI=http://localhost:3000/callback
WORKOS_COOKIE_PASSWORD=...      # 32+ character random string
NEXT_PUBLIC_CONVEX_URL=...      # Your Convex deployment URL
```

## Debugging

1. Visit `http://localhost:3000/api/debug-env` to verify env vars are loaded
2. Check that `apiKeyPrefix` shows `sk_` (not `pk_` or empty)
3. Check that `clientIdPrefix` shows `client_`

## Common Issues

**"Invalid client secret" error:**
- API key and Client ID are from different environments (dev vs prod)
- API key format is wrong (needs `sk_` prefix)
- API key doesn't belong to the same project as Client ID

**CORS errors:**
- `/api/auth/me` is being protected - check middleware config
- Make sure `/api/auth/me` is in `unauthenticatedPaths`

