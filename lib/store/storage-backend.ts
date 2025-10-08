/**
 * Storage Backend Interface
 *
 * Defines the contract for all storage backends (IndexedDB, Cloud, Local Filesystem).
 * Future backends (R2, UploadThing, LocalFile) will implement this interface.
 */

export interface WorkflowDoc {
  id: string
  name: string
  nodes: any[]
  edges: any[]
  viewport?: { x: number; y: number; zoom: number }
  updatedAt: number
  version?: number
}

export interface AssetMetadata {
  id?: string
  mime?: string
  bytes?: number
}

export interface AssetRef {
  kind: "idb" | "url" | "opfs" | "fs-handle"
  assetId?: string // For kind: "idb" - ID in assets table
  url?: string // For kind: "url"
  path?: string // For kind: "opfs"
  handleId?: string // For kind: "fs-handle"
}

export interface StorageBackend {
  // Workflows
  saveWorkflow(workflow: WorkflowDoc): Promise<void>
  loadWorkflows(): Promise<WorkflowDoc[]>
  deleteWorkflow(id: string): Promise<void>
  updateViewport(
    id: string,
    viewport: { x: number; y: number; zoom: number },
    updatedAt: number,
    version?: number
  ): Promise<void>

  // Assets (for image/video storage)
  saveAsset(blob: Blob, metadata?: AssetMetadata): Promise<AssetRef>
  loadAsset(ref: AssetRef): Promise<Blob | string>
  deleteAsset(ref: AssetRef): Promise<void>

  // Key-Value (app settings)
  setKV(key: string, value: any): Promise<void>
  getKV<T>(key: string): Promise<T | undefined>
}
