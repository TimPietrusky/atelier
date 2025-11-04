import { handleAuth } from "@workos-inc/authkit-nextjs"
import { NextRequest } from "next/server"

export const GET = handleAuth({
  // SDK automatically extracts returnPathname from state if present, falls back to this default
  returnPathname: "/workflow",
  onSuccess: async ({ user, state }) => {
    console.log("[auth] User logged in:", user?.email)
  },
  onError: ({ error, request }) => {
    console.error("[auth] Callback error:", error)

    // Log network errors specifically (ECONNRESET, ETIMEDOUT, etc.)
    if (error instanceof Error) {
      const cause = (error as any).cause
      if (
        cause &&
        (cause.code === "ECONNRESET" || cause.code === "ETIMEDOUT" || cause.code === "ENOTFOUND")
      ) {
        console.error("[auth] Network error detected:")
        console.error("  - Error code:", cause.code)
        console.error(
          "  - This may be a transient network issue or WorkOS API connectivity problem"
        )
        console.error("  - Check your internet connection and try again")
        console.error(
          "  - If persistent, verify WORKOS_API_KEY and WORKOS_REDIRECT_URI are correct"
        )
        console.error("  - Check /api/debug-env to verify env vars are loaded correctly")
      } else if (error.message.includes("invalid_client")) {
        console.error("[auth] Configuration error detected:")
        console.error(
          "  - This usually means WORKOS_API_KEY and WORKOS_CLIENT_ID are from different projects/environments"
        )
        console.error("  - Verify both are from the same WorkOS project in your dashboard")
        console.error("  - Check /api/debug-env to verify env vars are loaded correctly")
      }
    }

    // Extract returnPathname from state for error redirect (SDK uses same format)
    let returnPath = "/workflow"
    try {
      const url = new URL(request.url)
      const stateParam = url.searchParams.get("state")
      if (stateParam) {
        // SDK uses atob and handles URL-safe base64, try both formats
        try {
          const decoded = JSON.parse(atob(stateParam.replace(/-/g, "+").replace(/_/g, "/")))
          if (decoded.returnPathname) {
            returnPath = decoded.returnPathname
          }
        } catch {
          // Try alternative format (internal.userState)
          if (stateParam.includes(".")) {
            const [internal] = stateParam.split(".")
            const decoded = JSON.parse(atob(internal.replace(/-/g, "+").replace(/_/g, "/")))
            if (decoded.returnPathname) {
              returnPath = decoded.returnPathname
            }
          }
        }
      }
    } catch (e) {
      // Ignore state decode errors, use default
    }

    // Return to landing page on error, preserving redirect path
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/?error=auth_failed&redirect=${encodeURIComponent(returnPath)}`,
      },
    })
  },
})
