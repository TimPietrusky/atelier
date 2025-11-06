import { withAuth } from "@workos-inc/authkit-nextjs"
import type { NextRequest } from "next/server"

export async function getAuthenticatedUser() {
  const auth = await withAuth()
  if (!auth.user) {
    return null
  }
  return {
    userId: auth.user.id,
    email: auth.user.email,
    firstName: auth.user.firstName,
    lastName: auth.user.lastName,
    orgId: auth.organizationId,
  }
}

export async function requireAuth() {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

// Request-aware version for API routes (still uses withAuth internally via middleware context)
// The key is calling await connection() BEFORE this in the route handler
export async function requireAuthFromRequest(req: NextRequest) {
  // withAuth() reads from middleware context, so this still works
  // The connection() call in the route handler ensures request-time execution
  return requireAuth()
}

