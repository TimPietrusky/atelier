import { withAuth } from "@workos-inc/authkit-nextjs"

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

