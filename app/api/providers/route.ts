import { requireAuth } from "@/lib/auth"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { NextResponse } from "next/server"

const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  }
  return new ConvexHttpClient(url)
}

export async function GET() {
  try {
    const user = await requireAuth()

    const convex = getConvexClient()
    const credentials = await convex.query(api.providerCredentials.listByUser, {
      workosUserId: user.userId,
    })

    // Return metadata only (no secrets)
    return NextResponse.json({
      credentials: credentials.map((c) => ({
        id: c._id,
        providerId: c.providerId,
        name: c.name,
        lastFour: c.lastFour,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastUsedAt: c.lastUsedAt,
      })),
    })
  } catch (error: any) {
    console.error("[api/providers] Error listing credentials:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list credentials" },
      { status: 500 }
    )
  }
}

