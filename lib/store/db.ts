import Dexie, { type Table } from "dexie"

export interface DBWorkflow {
  id: string
  name: string
  updatedAt: number
  version?: number
  viewport?: { x: number; y: number; zoom: number }
}

export interface DBNodeRow {
  id: string
  workflowId: string
  type: string
  title: string
  status: "idle" | "running" | "complete" | "error"
  position: { x: number; y: number }
  size?: { width: number; height: number }
  config?: Record<string, any>
  result?: any
  resultHistory?: any[]
  updatedAt: number
}

export interface DBEdgeRow {
  id: string
  workflowId: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  updatedAt: number
}

export interface DBAssetRow {
  id: string
  kind: "idb" // Only supporting IDB storage for now
  type: "image" | "video"
  data: string // base64 data URL
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

export interface DBKVRow {
  key: string
  value: any
}

export interface DBOplogRow {
  id: string
  entity: string
  op: string
  payload: any
  createdAt: number
}

class AtelierDB extends Dexie {
  workflows!: Table<DBWorkflow, string>
  nodes!: Table<DBNodeRow, string>
  edges!: Table<DBEdgeRow, string>
  assets!: Table<DBAssetRow, string>
  kv!: Table<DBKVRow, string>
  oplog!: Table<DBOplogRow, string>

  constructor() {
    super("atelier")

    // Version 1: Original schema
    this.version(1).stores({
      workflows: "id, updatedAt",
      nodes: "id, workflowId, updatedAt",
      edges: "id, workflowId, updatedAt",
      assets: "id, createdAt",
      kv: "key",
      oplog: "id, createdAt",
    })

    // Version 2: Migrate assets from KV to assets table (single source of truth)
    this.version(2)
      .stores({
        workflows: "id, updatedAt",
        nodes: "id, workflowId, updatedAt",
        edges: "id, workflowId, updatedAt",
        assets: "id, createdAt",
        kv: "key",
        oplog: "id, createdAt",
      })
      .upgrade(async (trans) => {
        console.log("[DB Migration v2] Migrating assets from KV to assets table...")

        // Get all KV entries that are assets (keys starting with "asset_data_")
        const allKV = await trans.table("kv").toArray()
        const assetKVEntries = allKV.filter((kv) => kv.key.startsWith("asset_data_"))

        console.log(`[DB Migration v2] Found ${assetKVEntries.length} assets in KV store`)

        let migrated = 0
        let errors = 0

        for (const kvEntry of assetKVEntries) {
          try {
            const asset = kvEntry.value as any
            const assetId = kvEntry.key.replace("asset_data_", "")

            // Check if already exists in assets table
            const existing = await trans.table("assets").get(assetId)

            if (!existing || !existing.data) {
              // Migrate to assets table with full data
              const assetRow: DBAssetRow = {
                id: asset.id || assetId,
                kind: "idb",
                type: asset.type || "image",
                data: asset.data || "",
                mime: asset.mime,
                bytes: asset.bytes,
                metadata: asset.metadata,
                createdAt: asset.createdAt || Date.now(),
              }

              await trans.table("assets").put(assetRow)
              migrated++
            }

            // Delete from KV store
            await trans.table("kv").delete(kvEntry.key)
          } catch (err) {
            console.error(`[DB Migration v2] Failed to migrate asset ${kvEntry.key}:`, err)
            errors++
          }
        }

        console.log(`[DB Migration v2] Migration complete: ${migrated} migrated, ${errors} errors`)
      })
  }
}

export const db = new AtelierDB()

// High-level helpers
export async function hydrateWorkflows(): Promise<
  {
    id: string
    name: string
    nodes: DBNodeRow[]
    edges: DBEdgeRow[]
    viewport?: { x: number; y: number; zoom: number }
    updatedAt: number
    version?: number
  }[]
> {
  const wfs = await db.workflows.toArray()
  const byWorkflow: Record<string, { nodes: DBNodeRow[]; edges: DBEdgeRow[] }> = {}

  const [nodes, edges] = await Promise.all([db.nodes.toArray(), db.edges.toArray()])

  nodes.forEach((n) => {
    ;(byWorkflow[n.workflowId] ||= { nodes: [], edges: [] }).nodes.push(n)
  })
  edges.forEach((e) => {
    ;(byWorkflow[e.workflowId] ||= { nodes: [], edges: [] }).edges.push(e)
  })

  return wfs.map((wf) => ({
    id: wf.id,
    name: wf.name,
    nodes: byWorkflow[wf.id]?.nodes || [],
    edges: byWorkflow[wf.id]?.edges || [],
    viewport: wf.viewport,
    updatedAt: wf.updatedAt,
    version: wf.version,
  }))
}

export async function writeWorkflowGraph(payload: {
  id: string
  name: string
  nodes: DBNodeRow[]
  edges: DBEdgeRow[]
  viewport?: { x: number; y: number; zoom: number }
  updatedAt: number
  version?: number
}) {
  const now = Date.now()
  await db.transaction("rw", db.workflows, db.nodes, db.edges, async () => {
    await db.workflows.put({
      id: payload.id,
      name: payload.name,
      updatedAt: payload.updatedAt || now,
      version: payload.version,
      viewport: payload.viewport,
    })
    // Upsert nodes/edges: for simplicity, replace all for this workflow
    const existingNodeIds = new Set(
      (await db.nodes.where("workflowId").equals(payload.id).primaryKeys()) as string[]
    )
    const incomingNodeIds = new Set(payload.nodes.map((n) => n.id))
    const toDeleteNodes: string[] = []
    existingNodeIds.forEach((id) => {
      if (!incomingNodeIds.has(id)) toDeleteNodes.push(id)
    })
    if (toDeleteNodes.length) await db.nodes.bulkDelete(toDeleteNodes)
    if (payload.nodes.length) await db.nodes.bulkPut(payload.nodes)

    const existingEdgeIds = new Set(
      (await db.edges.where("workflowId").equals(payload.id).primaryKeys()) as string[]
    )
    const incomingEdgeIds = new Set(payload.edges.map((e) => e.id))
    const toDeleteEdges: string[] = []
    existingEdgeIds.forEach((id) => {
      if (!incomingEdgeIds.has(id)) toDeleteEdges.push(id)
    })
    if (toDeleteEdges.length) await db.edges.bulkDelete(toDeleteEdges)
    if (payload.edges.length) await db.edges.bulkPut(payload.edges)
  })
}

// Lightweight update for viewport only to avoid heavy writes during panning/zooming
export async function updateWorkflowViewport(params: {
  id: string
  viewport: { x: number; y: number; zoom: number }
  updatedAt: number
  version?: number
}) {
  await db.workflows.update(params.id, {
    viewport: params.viewport,
    updatedAt: params.updatedAt,
    version: params.version,
  })
}

export async function putKV(key: string, value: any) {
  await db.kv.put({ key, value })
}

export async function getKV<T = any>(key: string): Promise<T | undefined> {
  const row = await db.kv.get(key)
  return row?.value as T | undefined
}
