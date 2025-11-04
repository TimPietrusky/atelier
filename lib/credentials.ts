import { retrieveSecret } from "./vault"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  }
  return new ConvexHttpClient(url)
}

export interface CredentialResolver {
  getApiKey(workosUserId: string, providerId: string): Promise<string | null>
}

export class VaultCredentialResolver implements CredentialResolver {
  private cache: Map<string, { key: string; expiresAt: number }> = new Map()
  private cacheTtl = 5 * 60 * 1000 // 5 minutes

  async getApiKey(workosUserId: string, providerId: string): Promise<string | null> {
    const cacheKey = `${workosUserId}:${providerId}`
    const cached = this.cache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.key
    }

    const convex = getConvexClient()
    const credential = await convex.query(api.providerCredentials.getByUserAndProvider, {
      workosUserId,
      providerId,
    })

    if (!credential || credential.status !== "active") {
      return null
    }

    try {
      const apiKey = await retrieveSecret(
        {
          userId: workosUserId,
          providerId,
        },
        credential.vaultSecretId
      )

      // Update last used timestamp
      await convex.mutation(api.providerCredentials.updateLastUsed, {
        credentialId: credential._id,
      })

      // Cache the key
      this.cache.set(cacheKey, {
        key: apiKey,
        expiresAt: Date.now() + this.cacheTtl,
      })

      return apiKey
    } catch (error) {
      console.error(`[credentials] Failed to retrieve secret for ${providerId}:`, error)
      return null
    }
  }

  invalidateCache(workosUserId: string, providerId: string): void {
    const cacheKey = `${workosUserId}:${providerId}`
    this.cache.delete(cacheKey)
  }
}

export const credentialResolver = new VaultCredentialResolver()

