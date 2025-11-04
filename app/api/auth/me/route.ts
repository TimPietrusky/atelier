import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

// This route should NOT be protected - it's used to check auth status from client
export async function GET() {
  try {
    const auth = await withAuth()
    if (!auth.user) {
      // Return unauthenticated status, don't throw
      return NextResponse.json({ authenticated: false, user: null })
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
        profilePictureUrl: (auth.user as any).profilePictureUrl || null,
      },
    })
  } catch (error) {
    // If there's any error (including missing session), return unauthenticated
    return NextResponse.json({ authenticated: false, user: null })
  }
}

