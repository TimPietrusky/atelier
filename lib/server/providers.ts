import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { cacheTag, cacheLife } from "next/cache"

const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  }
  return new ConvexHttpClient(url)
}

export interface ProviderCredentialMetadata {
  id: string
  providerId: string
  name: string
  lastFour: string
  status: string
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export async function getProviderCredentials(
  workosUserId: string
): Promise<ProviderCredentialMetadata[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag(`provider-credentials-${workosUserId}`)
  cacheTag("provider-credentials")

  const convex = getConvexClient()
  const credentials = await convex.query(api.providerCredentials.listByUser, {
    workosUserId,
  })

  return credentials.map((c) => ({
    id: c._id,
    providerId: c.providerId,
    name: c.name,
    lastFour: c.lastFour,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    lastUsedAt: c.lastUsedAt,
  }))
}

export async function hasActiveProvider(
  workosUserId: string,
  providerId: string
): Promise<boolean> {
  const credentials = await getProviderCredentials(workosUserId)
  return credentials.some((c) => c.providerId === providerId && c.status === "active")
}

