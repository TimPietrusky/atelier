/**
 * IndexedDB Backend
 *
 * Wraps existing Dexie code from db.ts to implement the StorageBackend interface.
 * This is the current default backend. Future backends (R2, UploadThing, LocalFile)
 * will follow the same interface pattern.
 */

import type { StorageBackend, WorkflowDoc, AssetRef, AssetMetadata } from "../storage-backend"
import {
  db,
  hydrateWorkflows,
  writeWorkflowGraph,
  updateWorkflowViewport,
  putKV,
  getKV,
  type DBNodeRow,
  type DBEdgeRow,
} from "../db"

export class IndexedDBBackend implements StorageBackend {
  async saveWorkflow(workflow: WorkflowDoc): Promise<void> {
    const now = Date.now()

    // Sanitize nodes: ensure running status becomes idle on persist
    const sanitizedNodes: DBNodeRow[] = workflow.nodes.map((n) => ({
      id: n.id,
      workflowId: workflow.id,
      type: n.type,
      title: n.title,
      status: n.status === "running" ? "idle" : n.status,
      position: n.position,
      size: n.size,
      config: n.config,
      result: n.result,
      resultHistory: n.resultHistory,
      updatedAt: now,
    }))

    const sanitizedEdges: DBEdgeRow[] = (workflow.edges || []).map((e) => ({
      id: e.id,
      workflowId: workflow.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      updatedAt: now,
    }))

    await writeWorkflowGraph({
      id: workflow.id,
      name: workflow.name,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      viewport: workflow.viewport,
      updatedAt: workflow.updatedAt || now,
      version: workflow.version,
    })
  }

  async loadWorkflows(): Promise<WorkflowDoc[]> {
    const rows = await hydrateWorkflows()

    return rows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      nodes: wf.nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        status: n.status === "running" ? "idle" : n.status,
        position: n.position,
        size: n.size,
        config: n.config,
        result: n.result,
        resultHistory: n.resultHistory,
      })),
      edges: wf.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      viewport: wf.viewport,
      updatedAt: wf.updatedAt,
      version: wf.version,
    }))
  }

  async deleteWorkflow(id: string): Promise<void> {
    // Hard delete from DB (workflow + all associated nodes/edges)
    await db.transaction("rw", db.workflows, db.nodes, db.edges, async () => {
      await db.workflows.delete(id)
      await db.nodes.where("workflowId").equals(id).delete()
      await db.edges.where("workflowId").equals(id).delete()
    })
  }

  async updateViewport(
    id: string,
    viewport: { x: number; y: number; zoom: number },
    updatedAt: number,
    version?: number
  ): Promise<void> {
    await updateWorkflowViewport({ id, viewport, updatedAt, version })
  }

  // Asset methods (placeholder - will be implemented when asset storage is refactored)
  async saveAsset(blob: Blob, metadata?: AssetMetadata): Promise<AssetRef> {
    // TODO: Implement when asset storage is refactored
    // For now, this is a placeholder that will be used when we implement OPFS/FS Access
    throw new Error("Asset storage not yet implemented in IndexedDB backend")
  }

  async loadAsset(ref: AssetRef): Promise<Blob | string> {
    // TODO: Implement when asset storage is refactored
    throw new Error("Asset loading not yet implemented in IndexedDB backend")
  }

  async deleteAsset(ref: AssetRef): Promise<void> {
    // TODO: Implement when asset storage is refactored
    throw new Error("Asset deletion not yet implemented in IndexedDB backend")
  }

  // Key-Value methods
  async setKV(key: string, value: any): Promise<void> {
    await putKV(key, value)
  }

  async getKV<T>(key: string): Promise<T | undefined> {
    return getKV<T>(key)
  }
}
