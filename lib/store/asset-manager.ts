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

    // Store the actual data in KV store with createdAt included
    const fullAsset: Asset = {
      ...asset,
      id,
      createdAt: now,
    }
    await db.kv.put({ key: `asset_data_${id}`, value: fullAsset })

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
   * Check if an asset is used in any workflow.
   * Returns array of { workflowId, workflowName, nodeId } where asset is used.
   */
  async findAssetUsage(
    assetId: string
  ): Promise<
    Array<{ workflowId: string; workflowName: string; nodeId: string; nodeTitle: string }>
  > {
    const { useWorkflowStore } = await import("@/lib/store/workflows-zustand")
    const workflows = useWorkflowStore.getState().workflows
    const usage: Array<{
      workflowId: string
      workflowName: string
      nodeId: string
      nodeTitle: string
    }> = []

    for (const [workflowId, workflow] of Object.entries(workflows)) {
      for (const node of workflow.nodes) {
        // Check result
        if (node.result?.assetRef?.assetId === assetId) {
          usage.push({
            workflowId,
            workflowName: workflow.name,
            nodeId: node.id,
            nodeTitle: node.title,
          })
        }

        // Check resultHistory
        if (node.resultHistory) {
          for (const result of node.resultHistory) {
            if ((result as any).assetRef?.assetId === assetId) {
              usage.push({
                workflowId,
                workflowName: workflow.name,
                nodeId: node.id,
                nodeTitle: node.title,
              })
              break // Only count once per node
            }
          }
        }

        // Check config (uploaded images)
        if (node.config?.uploadedAssetRef && node.config.uploadedAssetRef.assetId === assetId) {
          usage.push({
            workflowId,
            workflowName: workflow.name,
            nodeId: node.id,
            nodeTitle: node.title,
          })
        }
      }
    }

    return usage
  }

  /**
   * Delete an asset from the assets table.
   * Returns { success: boolean, usage?: Array } - if usage exists, deletion fails unless forced.
   */
  async deleteAsset(
    ref: AssetRef,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; usage?: any[] }> {
    if (ref.kind !== "idb") {
      console.error("[AssetManager] Unsupported asset kind:", ref.kind)
      return { success: false }
    }

    // Check if asset is in use
    const usage = await this.findAssetUsage(ref.assetId!)

    if (usage.length > 0 && !options?.force) {
      console.warn(`[AssetManager] Asset ${ref.assetId} is in use, cannot delete without force`)
      return { success: false, usage }
    }

    try {
      await db.assets.delete(ref.assetId)
      await db.kv.delete(`asset_data_${ref.assetId}`)

      // If forced deletion and asset was in use, we should mark those references as deleted
      if (usage.length > 0 && options?.force) {
        console.warn(
          `[AssetManager] Force deleted asset ${ref.assetId}, ${usage.length} references now broken`
        )
      }

      return { success: true }
    } catch (err) {
      console.error(`[AssetManager] Failed to delete asset ${ref.assetId}:`, err)
      return { success: false }
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
