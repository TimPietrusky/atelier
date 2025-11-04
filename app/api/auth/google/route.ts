import { workos, WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI } from "@/lib/workos"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnPathname = searchParams.get("return_pathname") || "/workflow"

  try {
    // Encode return pathname in state
    const state = btoa(JSON.stringify({ returnPathname })).replace(/\+/g, "-").replace(/\//g, "_")

    // Use WorkOS User Management API to get authorization URL directly for Google OAuth
    // This bypasses WorkOS hosted UI and goes straight to Google's OAuth page
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "GoogleOAuth",
      clientId: WORKOS_CLIENT_ID!,
      redirectUri: WORKOS_REDIRECT_URI,
      state,
    })

    return NextResponse.redirect(authorizationUrl)
  } catch (error) {
    console.error("[auth/google] Error generating authorization URL:", error)
    return NextResponse.redirect(
      `/sign-in?error=auth_failed&return_pathname=${encodeURIComponent(returnPathname)}`
    )
  }
}
