/**
 * Utility to list all assets across workflows.
 *
 * This enables:
 * - Asset browser UI
 * - Finding orphaned assets
 * - Cleanup operations
 * - Asset statistics
 */

import { assetManager, type Asset } from "@/lib/store/asset-manager"

export interface AssetWithContext extends Asset {
  workflowName?: string
  nodeTitle?: string
}

/**
 * List all assets in the database.
 * @param excludeData - If true, returns only metadata without base64 data. Default: true for memory efficiency.
 */
export async function listAllAssets(excludeData: boolean = true): Promise<Asset[]> {
  return assetManager.listAllAssets(excludeData) as Promise<Asset[]>
}

/**
 * List assets grouped by workflow.
 * @param excludeData - If true, returns only metadata without base64 data. Default: true.
 */
export async function listAssetsByWorkflow(
  excludeData: boolean = true
): Promise<Record<string, Asset[]>> {
  const allAssets = await assetManager.listAllAssets(excludeData)
  const grouped: Record<string, Asset[]> = {}

  for (const asset of allAssets) {
    const workflowId = asset.metadata?.workflowId || "unknown"
    if (!grouped[workflowId]) {
      grouped[workflowId] = []
    }
    grouped[workflowId].push(asset as Asset)
  }

  return grouped
}

/**
 * Get asset statistics.
 * Uses metadata-only queries for speed.
 */
export async function getAssetStats() {
  const allAssets = await assetManager.listAllAssets(true) // excludeData: true

  const totalAssets = allAssets.length
  const totalBytes = allAssets.reduce((sum, a) => sum + (a.bytes || 0), 0)
  const byType = allAssets.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byWorkflow = allAssets.reduce((acc, a) => {
    const wfId = a.metadata?.workflowId || "unknown"
    acc[wfId] = (acc[wfId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalAssets,
    totalBytes,
    totalMB: (totalBytes / 1024 / 1024).toFixed(2),
    byType,
    byWorkflow,
  }
}

/**
 * Find assets by workflow ID.
 */
export async function getWorkflowAssets(workflowId: string): Promise<Asset[]> {
  return assetManager.getAssetsByWorkflow(workflowId)
}

/**
 * Delete all assets for a workflow (when workflow is deleted).
 */
export async function deleteWorkflowAssets(workflowId: string): Promise<number> {
  const assets = await assetManager.getAssetsByWorkflow(workflowId)
  let deleted = 0

  for (const asset of assets) {
    try {
      await assetManager.deleteAsset({ kind: "idb", assetId: asset.id })
      deleted++
    } catch (err) {
      console.error(`Failed to delete asset ${asset.id}:`, err)
    }
  }

  return deleted
}
