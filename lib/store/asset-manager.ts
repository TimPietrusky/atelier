/**
 * Asset Manager
 *
 * Centralized management for media assets (images, videos).
 * Stores assets in the `assets` table in Dexie, not in workflow JSON.
 * Workflows only store AssetRef (references) to assets.
 *
 * This enables:
 * - Deduplication (same asset used in multiple nodes)
 * - Asset browsing (list all assets across workflows)
 * - Cleanup (find orphaned assets)
 * - Smaller workflow JSON (just IDs, not full data)
 */

import { db, type DBAssetRow } from "./db"

export interface AssetRef {
  kind: "idb" // For now, only IndexedDB storage
  assetId: string // ID in the assets table
}

export interface Asset {
  id: string
  kind: "idb"
  type: "image" | "video"
  data: string // base64 or URL
  mime?: string
  bytes?: number
  metadata?: {
    workflowId?: string
    nodeId?: string
    executionId?: string
    model?: string
    prompt?: string
    timestamp?: string
    width?: number
    height?: number
  }
  createdAt: number
}

export class AssetManager {
  /**
   * Save an asset (image/video) to the assets table.
   * Returns an AssetRef that can be stored in the workflow.
   */
  async saveAsset(asset: Omit<Asset, "id" | "createdAt">): Promise<AssetRef> {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    const row: DBAssetRow = {
      id,
      kind: "idb",
      blobKey: id, // Use the asset ID as the blob key for simplicity
      mime: asset.mime,
      bytes: asset.bytes || this.estimateBytes(asset.data),
      createdAt: now,
    }

    // Store the row in the assets table
    await db.assets.put(row)

    // Store the actual data in a separate blob store (could be optimized later)
    // For now, we'll store it in the same table but in a separate field
    // Actually, let's create a simple KV store for asset data
    await db.kv.put({ key: `asset_data_${id}`, value: asset })

    return {
      kind: "idb",
      assetId: id,
    }
  }

  /**
   * Load an asset by its reference.
   * Returns the full asset data.
   */
  async loadAsset(ref: AssetRef): Promise<Asset | null> {
    if (ref.kind !== "idb") {
      console.error("[AssetManager] Unsupported asset kind:", ref.kind)
      return null
    }

    try {
      const assetData = await db.kv.get(`asset_data_${ref.assetId}`)
      if (!assetData) {
        console.warn(`[AssetManager] Asset not found: ${ref.assetId}`)
        return null
      }

      return assetData.value as Asset
    } catch (err) {
      console.error(`[AssetManager] Failed to load asset ${ref.assetId}:`, err)
      return null
    }
  }

  /**
   * Delete an asset from the assets table.
   */
  async deleteAsset(ref: AssetRef): Promise<void> {
    if (ref.kind !== "idb") {
      console.error("[AssetManager] Unsupported asset kind:", ref.kind)
      return
    }

    try {
      await db.assets.delete(ref.assetId)
      await db.kv.delete(`asset_data_${ref.assetId}`)
    } catch (err) {
      console.error(`[AssetManager] Failed to delete asset ${ref.assetId}:`, err)
    }
  }

  /**
   * List all assets in the database.
   * Useful for asset browser/manager UI.
   */
  async listAllAssets(): Promise<Asset[]> {
    try {
      const rows = await db.assets.toArray()
      const assets: Asset[] = []

      for (const row of rows) {
        const assetData = await db.kv.get(`asset_data_${row.id}`)
        if (assetData && assetData.value) {
          assets.push(assetData.value as Asset)
        }
      }

      return assets
    } catch (err) {
      console.error("[AssetManager] Failed to list assets:", err)
      return []
    }
  }

  /**
   * Find assets by workflow ID.
   */
  async getAssetsByWorkflow(workflowId: string): Promise<Asset[]> {
    const allAssets = await this.listAllAssets()
    return allAssets.filter((a) => a.metadata?.workflowId === workflowId)
  }

  /**
   * Find orphaned assets (not referenced by any workflow).
   * Useful for cleanup.
   */
  async findOrphanedAssets(): Promise<Asset[]> {
    // TODO: Implement by scanning all workflows and checking which assets are referenced
    // For now, return empty array
    return []
  }

  /**
   * Estimate bytes from a data URL or base64 string.
   */
  private estimateBytes(data: string): number {
    if (data.startsWith("data:")) {
      // data:image/png;base64,... format
      const base64 = data.split(",")[1] || ""
      return Math.ceil((base64.length * 3) / 4)
    }
    // Assume it's a URL or short string
    return data.length
  }

  /**
   * Check if an asset exists.
   */
  async assetExists(ref: AssetRef): Promise<boolean> {
    if (ref.kind !== "idb") return false
    const asset = await db.assets.get(ref.assetId)
    return !!asset
  }
}

// Singleton instance
export const assetManager = new AssetManager()
