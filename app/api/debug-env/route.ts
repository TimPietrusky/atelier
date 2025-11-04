import { NextResponse } from "next/server"

export async function GET() {
  // Don't expose full keys, just check if they exist and show first few chars
  const apiKey = process.env.WORKOS_API_KEY || ""
  const clientId = process.env.WORKOS_CLIENT_ID || ""
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey.substring(0, 10) || "NOT SET",
    apiKeyLength: apiKey.length,
    hasClientId: !!clientId,
    clientIdPrefix: clientId.substring(0, 15) || "NOT SET",
    clientIdLength: clientId.length,
    hasRedirectUri: !!process.env.WORKOS_REDIRECT_URI,
    redirectUri: process.env.WORKOS_REDIRECT_URI || "NOT SET",
    hasCookiePassword: !!process.env.WORKOS_COOKIE_PASSWORD,
    cookiePasswordLength: process.env.WORKOS_COOKIE_PASSWORD?.length || 0,
    // Check if they might be mismatched (different project IDs)
    apiKeyProjectHint: apiKey.length > 20 ? apiKey.substring(10, 20) : "N/A",
    clientIdProjectHint: clientId.length > 15 ? clientId.substring(7, 15) : "N/A",
  })
}

