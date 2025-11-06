# Setup

## Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- WorkOS account (for authentication)
- Convex account (for database)

## Installation

1. Install dependencies:
   ```bash
   pnpm i
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your values:
     - **WORKOS_API_KEY**: Get from [WorkOS Dashboard](https://dashboard.workos.com/)
     - **WORKOS_CLIENT_ID**: Get from [WorkOS Dashboard](https://dashboard.workos.com/)
     - **WORKOS_REDIRECT_URI**: `http://localhost:3000/callback` for local development
     - **WORKOS_COOKIE_PASSWORD**: Generate using `pnpm generate:cookie-password` (must be 32+ characters)
     - **NEXT_PUBLIC_CONVEX_URL**: Get from [Convex Dashboard](https://dashboard.convex.dev/) after deploying

3. Start Convex development server:
   ```bash
   npx convex dev
   ```

4. Start Next.js development server:
   ```bash
   pnpm dev
   ```

Or run both concurrently:
```bash
pnpm dev:all
```

## Verification

- Visit `http://localhost:3000`
- Sign in with WorkOS
- Configure a provider credential in Settings
- Create a workflow and run it

