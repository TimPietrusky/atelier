import { authkitMiddleware } from "@workos-inc/authkit-nextjs"

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

export function proxy(request: Request) {
  return middleware(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

