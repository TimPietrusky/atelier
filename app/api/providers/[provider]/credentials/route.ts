import { requireAuth } from "@/lib/auth"
import { storeSecret } from "@/lib/vault"
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

export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const user = await requireAuth()
    const { apiKey, name } = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    if (apiKey.length < 8) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 })
    }

    const lastFour = apiKey.slice(-4)

    // Store secret in Vault
    const vaultSecretId = await storeSecret(
      {
        userId: user.userId,
        orgId: user.orgId,
        providerId: params.provider,
      },
      apiKey
    )

    // Get or create user in Convex
    const convex = getConvexClient()
    const convexUserId = await convex.mutation(api.users.createOrUpdate, {
      workosUserId: user.userId,
      email: user.email || "",
      firstName: user.firstName,
      lastName: user.lastName,
    })

    // Create credential record
    const credentialId = await convex.mutation(api.providerCredentials.create, {
      userId: convexUserId,
      workosUserId: user.userId,
      providerId: params.provider,
      vaultSecretId,
      name: name || `${params.provider} API Key`,
      lastFour,
    })

    return NextResponse.json({
      success: true,
      credentialId,
      lastFour,
    })
  } catch (error: any) {
    console.error("[api/providers] Error storing credential:", error)
    return NextResponse.json(
      { error: error.message || "Failed to store credential" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const user = await requireAuth()

    // Get active credential
    const convex = getConvexClient()
    const credential = await convex.query(api.providerCredentials.getByUserAndProvider, {
      workosUserId: user.userId,
      providerId: params.provider,
    })

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 })
    }

    // Delete from Vault
    const { deleteSecret } = await import("@/lib/vault")
    await deleteSecret(credential.vaultSecretId)

    // Revoke in Convex
    await convex.mutation(api.providerCredentials.revoke, {
      credentialId: credential._id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/providers] Error revoking credential:", error)
    return NextResponse.json(
      { error: error.message || "Failed to revoke credential" },
      { status: 500 }
    )
  }
}

