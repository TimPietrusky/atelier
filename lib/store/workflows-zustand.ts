"use client"

import { create } from "zustand"
import type { WorkflowNode } from "@/lib/workflow-engine"
import { StorageManager } from "./storage-manager"
import { IndexedDBBackend } from "./backends/indexeddb"
import { db } from "./db"

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowDoc {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport?: { x: number; y: number; zoom: number }
  updatedAt: number
  version?: number
}

type State = {
  workflows: Record<string, WorkflowDoc>
  activeId?: string
}

type Actions = {
  hydrate: () => Promise<void>
  mergeFromDbIfNewer: () => Promise<void>
  createWorkflow: (name: string) => string
  removeWorkflow: (id: string) => void
  setNodes: (workflowId: string, nodes: WorkflowNode[]) => void
  setEdges: (workflowId: string, edges: WorkflowEdge[]) => void
  setViewport: (workflowId: string, viewport: { x: number; y: number; zoom: number }) => void
  updateNodeConfig: (workflowId: string, nodeId: string, config: Record<string, any>) => void
  updateNodeResult: (
    workflowId: string,
    nodeId: string,
    result: WorkflowNode["result"],
    resultHistory?: WorkflowNode["resultHistory"]
  ) => void
  removeFromResultHistory: (workflowId: string, nodeId: string, resultId: string) => void
  clearResultHistory: (workflowId: string, nodeId: string) => void
  updateNodeStatus: (workflowId: string, nodeId: string, status: WorkflowNode["status"]) => void
  updateNodeDimensions: (
    workflowId: string,
    nodeId: string,
    position?: { x: number; y: number },
    size?: { width: number; height: number }
  ) => void
}

// Initialize storage manager with IndexedDB backend
const backend = new IndexedDBBackend()
const storageManager = new StorageManager(backend)

export const useWorkflowStore = create<State & Actions>()((set, get) => ({
  workflows: {},
  async hydrate() {
    const workflows = await storageManager.loadWorkflows()
    const workflowsMap: Record<string, WorkflowDoc> = {}
    workflows.forEach((wf) => {
      workflowsMap[wf.id] = wf
    })
    set({ workflows: workflowsMap })
  },
  async mergeFromDbIfNewer() {
    // Stub: kept for future cloud sync. Currently unused since we removed cross-tab sync.
    // When cloud storage is added, this will merge remote changes with local state.
    console.log("[WorkflowStore] mergeFromDbIfNewer: stub (unused in single-tab mode)")
  },
  createWorkflow(name) {
    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`
    const doc: WorkflowDoc = {
      id,
      name,
      nodes: [],
      edges: [],
      updatedAt: Date.now(),
      version: 0,
    }
    set((s) => ({ workflows: { ...s.workflows, [id]: doc } }))
    storageManager.persist(doc).catch((err) => {
      console.error("[WorkflowStore] Failed to persist new workflow:", err)
    })
    return id
  },
  removeWorkflow(id) {
    set((s) => {
      const next = { ...s.workflows }
      delete next[id]
      return { workflows: next } as any
    })
    storageManager.deleteWorkflow(id).catch((err) => {
      console.error("[WorkflowStore] Failed to delete workflow:", err)
    })
  },
  setNodes(workflowId, nodes) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      storageManager.persist(next).catch((err) => {
        console.error("[WorkflowStore] Failed to persist nodes:", err)
      })
      return { workflows: { ...s.workflows, [workflowId]: next } } as any
    })
  },
  setEdges(workflowId, edges) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const next = {
        ...doc,
        edges,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      storageManager.persist(next).catch((err) => {
        console.error("[WorkflowStore] Failed to persist edges:", err)
      })
      return { workflows: { ...s.workflows, [workflowId]: next } } as any
    })
  },
  setViewport(workflowId, viewport) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const next = {
        ...doc,
        viewport,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      // Debounced persist for viewport (300ms) - batches rapid pan/zoom updates
      storageManager.persistDebounced(`viewport-${workflowId}`, next, 300)
      return { workflows: { ...s.workflows, [workflowId]: next } } as any
    })
  },
  updateNodeConfig(workflowId, nodeId, config) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const nodes = doc.nodes.map((n) =>
        n.id === nodeId ? { ...n, config: { ...(n.config || {}), ...config } } : n
      )

      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      storageManager.persist(next).catch((err) => {
        console.error("[WorkflowStore] Failed to persist node config:", err)
      })
      return { workflows: { ...s.workflows, [workflowId]: next } } as any
    })
  },
  updateNodeResult(workflowId, nodeId, result, resultHistory) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return s
      const nodes = doc.nodes.map((n) => {
        if (n.id !== nodeId) return n

        // Simple append with ID-based deduplication (atomic, no complex merge logic)
        const existingHistory = n.resultHistory || []
        const incomingHistory = resultHistory || []
        const existingIds = new Set(existingHistory.map((r: any) => r.id).filter(Boolean))

        // Map to new objects with IDs (don't mutate incoming), then filter for uniqueness
        const newItems = incomingHistory
          .map((r: any, idx: number) => {
            // Create new object with ID if needed (immutable)
            // Use index + random to ensure uniqueness even if Date.now() is same
            if (!r.id) {
              return {
                ...r,
                id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
              }
            }
            return r
          })
          .filter((r: any) => !existingIds.has(r.id))

        return {
          ...n,
          result,
          resultHistory: [...existingHistory, ...newItems],
          status: "complete" as const,
        } as WorkflowNode
      })
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      storageManager.persist(next).catch((err) => {
        console.error("[WorkflowStore] Failed to persist node result:", err)
      })
      return { workflows: { ...s.workflows, [workflowId]: next } }
    })
  },
  removeFromResultHistory(workflowId, nodeId, resultId) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return s
      const nodes = doc.nodes.map((n) => {
        if (n.id !== nodeId) return n
        const filteredHistory = (n.resultHistory || []).filter((r: any) => r.id !== resultId)
        const newResult =
          filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1] : undefined
        return {
          ...n,
          result: newResult,
          resultHistory: filteredHistory,
        }
      })
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      // Debounced persist for result history deletes (100ms) - batches rapid deletes
      storageManager.persistDebounced(`history-${workflowId}-${nodeId}`, next, 100)
      return { workflows: { ...s.workflows, [workflowId]: next } }
    })
  },
  clearResultHistory(workflowId, nodeId) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return s
      const nodes = doc.nodes.map((n) => {
        if (n.id !== nodeId) return n
        return {
          ...n,
          result: undefined,
          resultHistory: [],
        }
      })
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      storageManager.persist(next).catch((err) => {
        console.error("[WorkflowStore] Failed to persist clear history:", err)
      })
      return { workflows: { ...s.workflows, [workflowId]: next } }
    })
  },
  updateNodeStatus(workflowId, nodeId, status) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const nodes = doc.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n))
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      // Do not persist transient running status immediately
      if (status !== "running") {
        storageManager.persist(next).catch((err) => {
          console.error("[WorkflowStore] Failed to persist node status:", err)
        })
      }
      return { workflows: { ...s.workflows, [workflowId]: next } } as any
    })
  },
  updateNodeDimensions(workflowId, nodeId, position, size) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const nodes = doc.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              position: position || n.position,
              size: size || n.size,
            }
          : n
      )
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      storageManager.persist(next).catch((err) => {
        console.error("[WorkflowStore] Failed to persist node dimensions:", err)
      })
      return { workflows: { ...s.workflows, [workflowId]: next } } as any
    })
  },
}))

// ✅ CROSS-TAB SYNC REMOVED
// Previous implementation had a BroadcastChannel listener that would hydrate() on every
// update from other tabs. This caused race conditions where:
// - Cross-tab hydrate() would overwrite in-progress local edits
// - Concurrent writes would clobber each other
// - Images would reappear after deletion
// - Nodes would snap back during drag
//
// The app is now single-tab focused. Each tab operates independently with its own state.
// Last tab closed wins on next reload. This eliminates 90% of race conditions.
//
// For future cloud sync, use the mergeFromDbIfNewer() stub with proper conflict resolution.
