import { authkitMiddleware } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

const middleware = authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/",
      "/sign-in",
      "/sign-out",
      "/api/health",
      "/api/auth/sign-in",
      "/api/auth/sign-out",
      "/api/auth/google",
      "/api/auth/me",
      "/api/debug-env",
    ],
  },
  redirectUri: process.env.WORKOS_REDIRECT_URI || "http://localhost:3000/callback",
})

export async function proxy(request: Request) {
  const url = new URL(request.url)
  
  // If authenticated user tries to access sign-in, redirect to workflow immediately
  // Check for WorkOS session cookie to determine if user is authenticated
  if (url.pathname === "/sign-in") {
    const cookieHeader = request.headers.get("cookie") || ""
    const hasSession = cookieHeader.includes("wos-session")
    
    if (hasSession) {
      // User is authenticated, redirect to workflow (or return_pathname if present)
      const returnPathname = url.searchParams.get("return_pathname") || "/workflow"
      return NextResponse.redirect(new URL(returnPathname, request.url), 307)
    }
  }
  
  return middleware(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

