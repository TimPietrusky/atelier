import { signOut } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    await signOut({ returnTo: "/" })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[auth] Sign out error:", error)
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 })
  }
}

