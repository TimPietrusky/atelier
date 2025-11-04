import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// WorkOS signOut goes through their logout URL which requires homepage URL config
// Instead, we'll clear the session cookie locally and redirect directly
export async function GET() {
  const nextCookies = await cookies()
  const cookieName = process.env.WORKOS_COOKIE_NAME || "wos-session"
  
  // Get cookie options from redirect URI
  const redirectUri = process.env.WORKOS_REDIRECT_URI || "http://localhost:3000/callback"
  const url = new URL(redirectUri)
  const secure = url.protocol === "https:"
  const sameSite = (process.env.WORKOS_COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax"
  const domain = process.env.WORKOS_COOKIE_DOMAIN || ""
  
  // Clear the session cookie
  nextCookies.delete({ 
    name: cookieName, 
    domain: domain || undefined,
    path: "/",
    sameSite,
    secure 
  })
  
  // Redirect directly to homepage
  redirect("/")
}

