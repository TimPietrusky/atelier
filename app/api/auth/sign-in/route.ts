import { getSignInUrl } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnPathname = searchParams.get("return_pathname") || "/workflow"

  // getSignInUrl accepts redirectUri, but we need to encode returnPathname in state
  // Since getSignInUrl doesn't expose returnPathname, we'll encode it in state
  const state = btoa(JSON.stringify({ returnPathname }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  const url = await getSignInUrl({
    state,
    redirectUri: process.env.WORKOS_REDIRECT_URI || "http://localhost:3000/callback",
  })

  return NextResponse.redirect(url)
}

