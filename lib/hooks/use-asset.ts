/**
 * React hook to resolve asset references to actual data.
 *
 * Loads asset from the assets table using assetRef.
 */

import { useState, useEffect } from "react"
import { assetManager, type AssetRef } from "@/lib/store/asset-manager"

export interface AssetResult {
  id: string
  url: string
  loading?: boolean
}

/**
 * Hook to resolve a single asset reference.
 */
export function useAsset(result: {
  type?: string
  assetRef?: AssetRef
  id?: string
}): AssetResult | null {
  const [asset, setAsset] = useState<AssetResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!result.assetRef) {
        if (!cancelled) setAsset(null)
        return
      }

      setLoading(true)
      try {
        const assetData = await assetManager.loadAsset(result.assetRef)
        if (!cancelled && assetData) {
          setAsset({
            id: result.id || assetData.id,
            url: assetData.data,
          })
        }
      } catch (err) {
        console.error("[useAsset] Failed to load asset:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [result.assetRef?.assetId, result.id])

  return asset
}

// Cache loaded assets to avoid re-loading the same ones
const assetCache = new Map<string, { id: string; url: string }>()

/**
 * Hook to resolve multiple asset references (for result history).
 * Uses a cache to avoid re-loading the same assets.
 */
export function useAssets(
  results: Array<{
    type?: string
    assetRef?: AssetRef
    id?: string
  }>
): AssetResult[] {
  const [assets, setAssets] = useState<AssetResult[]>([])
  const [loading, setLoading] = useState(false)

  // Stabilize the dependency by creating a key from the assetIds
  const resultsKey = results.map((r) => r.assetRef?.assetId || "").join(",")

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (results.length === 0) {
        setAssets([])
        return
      }

      setLoading(true)
      const loaded: AssetResult[] = []
      const toLoad: Array<{ result: any; assetId: string }> = []

      // First pass: check cache
      for (const result of results) {
        if (!result.assetRef) {
          console.warn("[useAssets] Result missing assetRef:", result)
          continue
        }

        const assetId = result.assetRef.assetId!
        const cached = assetCache.get(assetId)

        if (cached) {
          // Use cached asset
          loaded.push({
            id: result.id || cached.id,
            url: cached.url,
          })
        } else {
          // Need to load this asset
          toLoad.push({ result, assetId })
        }
      }

      // Second pass: load uncached assets
      for (const { result, assetId } of toLoad) {
        try {
          const assetData = await assetManager.loadAsset(result.assetRef!)
          if (assetData) {
            const assetResult = {
              id: result.id || assetData.id,
              url: assetData.data,
            }
            loaded.push(assetResult)
            // Cache it for next time
            assetCache.set(assetId, assetResult)
          } else {
            // Asset was deleted - show placeholder
            console.warn(`[useAssets] Asset not found (deleted?): ${assetId}`)
            const placeholderResult = {
              id: result.id || assetId,
              url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23333' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='14' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3EAsset Deleted%3C/text%3E%3C/svg%3E",
            }
            loaded.push(placeholderResult)
          }
        } catch (err) {
          console.error("[useAssets] Failed to load asset:", assetId, err)
          // Show error placeholder
          const errorResult = {
            id: result.id || assetId,
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23333' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='14' fill='%23f00' text-anchor='middle' dominant-baseline='middle'%3ELoad Error%3C/text%3E%3C/svg%3E",
          }
          loaded.push(errorResult)
        }
      }

      if (!cancelled) {
        setAssets(loaded)
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [resultsKey])

  return assets
}
