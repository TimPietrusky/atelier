# Custom Sign-In/Sign-Out Pages Setup

## What's Been Implemented

✅ **Custom sign-in page** at `/sign-in` - hosted on your domain (`atelier.jetzt/sign-in`)
✅ **Custom sign-out page** at `/sign-out` - hosted on your domain (`atelier.jetzt/sign-out`)
✅ **Updated landing page** - "start" button now goes to `/sign-in` instead of WorkOS URL
✅ **Updated user avatar** - sign-out now goes to `/sign-out` page

## Current Flow

1. User visits `atelier.jetzt` → sees landing page
2. User clicks "start" → goes to `atelier.jetzt/sign-in` (your custom page!)
3. User clicks "Continue with Google" → redirects to WorkOS hosted page → then Google OAuth
4. After OAuth → redirects back to `atelier.jetzt/callback` → then to `/workflow`

## Limitation

**WorkOS hosted page still appears:** When clicking "Continue with Google", users are briefly redirected to WorkOS's hosted authentication page before going to Google OAuth. This is because WorkOS AuthKit uses their hosted UI for provider selection.

## To Fully Avoid WorkOS URLs

To completely eliminate WorkOS URLs from the user experience, you have two options:

### Option 1: Custom Domain with WorkOS (Recommended)

WorkOS supports custom domains for AuthKit. This allows you to host AuthKit's UI on your own domain (e.g., `auth.atelier.jetzt`).

**Steps:**

1. Contact WorkOS support to enable custom domain feature
2. Configure DNS: Add a CNAME record pointing to WorkOS
3. Update WorkOS Dashboard with your custom domain
4. Update redirect URIs to use custom domain

**Benefits:**

- Completely branded experience
- No WorkOS URLs visible to users
- Still uses WorkOS's managed UI components

### Option 2: Headless Implementation (More Complex)

Use WorkOS's User Management APIs directly (bypass AuthKit's hosted UI).

**Requirements:**

- Build your own OAuth provider selection UI
- Handle OAuth flows manually
- More code to maintain

## Current Implementation Benefits

Even with the WorkOS redirect, you now have:

- ✅ Clean sign-in page on your domain (`/sign-in`)
- ✅ Clean sign-out page on your domain (`/sign-out`)
- ✅ Better UX - users start on your domain
- ✅ Consistent branding on entry/exit points

The WorkOS redirect is brief and only happens during the OAuth flow initiation.

## Testing

1. Visit `https://atelier.jetzt`
2. Click "start" → should go to `/sign-in` (your custom page)
3. Click "Continue with Google" → brief redirect to WorkOS → then Google OAuth
4. After sign-in → should return to `/workflow`
5. Click user avatar → "Sign out" → should go to `/sign-out` page

## Files Created/Modified

- `app/sign-in/page.tsx` - Custom sign-in page
- `app/sign-out/page.tsx` - Custom sign-out page
- `app/api/auth/google/route.ts` - Google OAuth initiation
- `app/page.tsx` - Updated to use `/sign-in`
- `components/user-avatar.tsx` - Updated to use `/sign-out`
