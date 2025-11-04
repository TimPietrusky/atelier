import { handleAuth } from "@workos-inc/authkit-nextjs"
import { NextRequest } from "next/server"

export const GET = handleAuth({
  returnPathname: "/workflow",
  onSuccess: async ({ user, state }) => {
    // User is automatically redirected to returnPathname after session is saved
    // You can do additional setup here if needed
    console.log("[auth] User logged in:", user?.email)
  },
  onError: ({ error, request }) => {
    console.error("[auth] Callback error:", error)
    
    // More detailed error logging for debugging
    if (error instanceof Error && error.message.includes("invalid_client")) {
      console.error("[auth] Configuration error detected:")
      console.error("  - This usually means WORKOS_API_KEY and WORKOS_CLIENT_ID are from different projects/environments")
      console.error("  - Verify both are from the same WorkOS project in your dashboard")
      console.error("  - Check /api/debug-env to verify env vars are loaded correctly")
    }
    
    // Return to landing page on error
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?error=auth_failed",
      },
    })
  },
})

