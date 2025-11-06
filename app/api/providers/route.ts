import { connection, type NextRequest } from "next/server"
import { requireAuthFromRequest } from "@/lib/auth"
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

export async function GET(req: NextRequest) {
  await connection() // Force request-time execution, prevents build-time analysis
  try {
    const user = await requireAuthFromRequest(req)

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
  } catch (error: unknown) {
    console.error("[api/providers] Error listing credentials:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to list credentials"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
