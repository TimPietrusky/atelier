import { requireAuth } from "@/lib/auth"
import { storeSecret } from "@/lib/vault"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

async function validateRunPodApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Use pods endpoint - requires authentication and returns user's pods
    // This validates the key without making a costly generation request
    const response = await fetch("https://rest.runpod.io/v1/pods", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" }
    }

    // If it's not an auth error, assume valid (might be rate limit, etc.)
    // Log for debugging but don't block
    console.warn(`[validateRunPodApiKey] Unexpected status ${response.status}, assuming valid`)
    return { valid: true }
  } catch (error: any) {
    // Network/timeout errors - log but allow saving (might be temporary)
    // User can still save and we'll catch it on first use
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      console.warn("[validateRunPodApiKey] Validation timeout, allowing save")
      return { valid: true }
    }
    console.warn("[validateRunPodApiKey] Network error during validation:", error.message)
    // Allow save on network errors - validation is best-effort
    return { valid: true }
  }
}

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

    // Validate API key for RunPod
    if (params.provider === "runpod") {
      const validation = await validateRunPodApiKey(apiKey)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Invalid API key" },
          { status: 400 }
        )
      }
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

    // Invalidate provider credentials cache (both user-specific and general tag)
    revalidateTag(`provider-credentials-${user.userId}`)
    revalidateTag("provider-credentials")

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

    // Invalidate provider credentials cache (both user-specific and general tag)
    revalidateTag(`provider-credentials-${user.userId}`)
    revalidateTag("provider-credentials")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/providers] Error revoking credential:", error)
    return NextResponse.json(
      { error: error.message || "Failed to revoke credential" },
      { status: 500 }
    )
  }
}

