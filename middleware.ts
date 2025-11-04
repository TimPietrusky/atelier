import { authkitMiddleware } from "@workos-inc/authkit-nextjs"

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/",
      "/api/health",
      "/api/auth/sign-in",
      "/api/auth/sign-out",
      "/api/auth/me",
      "/api/debug-env",
    ],
  },
  redirectUri: process.env.WORKOS_REDIRECT_URI || "http://localhost:3000/callback",
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
