"use client"

import { create } from "zustand"
import type { WorkflowNode } from "@/lib/workflow-engine"
import { BroadcastBus } from "@/lib/store/storage"
import { db, hydrateWorkflows, writeWorkflowGraph } from "@/lib/store/db"

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
    resultHistory?: WorkflowNode["resultHistory"],
  ) => void
  updateNodeStatus: (workflowId: string, nodeId: string, status: WorkflowNode["status"]) => void
  updateNodeDimensions: (
    workflowId: string,
    nodeId: string,
    position?: { x: number; y: number },
    size?: { width: number; height: number },
  ) => void
}

const bus = new BroadcastBus<{ id: string; updatedAt: number }>("atelier:workflows")

async function persistGraph(doc: WorkflowDoc) {
  const now = Date.now()
  const sanitizedNodes = doc.nodes.map((n) => ({
    id: n.id,
    workflowId: doc.id,
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
  const sanitizedEdges = (doc.edges || []).map((e) => ({
    id: e.id,
    workflowId: doc.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    updatedAt: now,
  }))
  await writeWorkflowGraph({
    id: doc.id,
    name: doc.name,
    nodes: sanitizedNodes as any,
    edges: sanitizedEdges as any,
    viewport: doc.viewport,
    updatedAt: now,
    version: (doc.version || 0) + 1,
  })
  bus.post({ id: doc.id, updatedAt: now })
}

export const useWorkflowStore = create<State & Actions>()((set, get) => ({
  workflows: {},
  async hydrate() {
    console.log("[v0] Zustand hydrate() called")
    try {
      const rows = await hydrateWorkflows()
      console.log("[v0] hydrateWorkflows() returned", rows.length, "workflows")

      const workflows: Record<string, WorkflowDoc> = {}
      rows.forEach((wf) => {
        console.log("[v0] Processing workflow:", wf.id, "with", wf.nodes.length, "nodes")
        workflows[wf.id] = {
          id: wf.id,
          name: wf.name,
          nodes: (wf.nodes as any).map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            status: n.status === "running" ? "idle" : n.status,
            position: n.position,
            size: n.size,
            config: n.config,
            result: n.result,
          })),
          edges: (wf.edges as any).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          viewport: wf.viewport,
          updatedAt: wf.updatedAt,
          version: wf.version,
        }
      })

      console.log("[v0] Setting workflows in state:", Object.keys(workflows))
      set({ workflows })
      console.log("[v0] Zustand hydrate() completed successfully")
    } catch (e) {
      console.error("[v0] Zustand hydrate() failed:", e)
      throw e
    }
  },
  async mergeFromDbIfNewer() {
    const rows = await hydrateWorkflows()
    set((s) => {
      const next = { ...s.workflows } as Record<string, WorkflowDoc>
      for (const wf of rows) {
        const incoming: WorkflowDoc = {
          id: wf.id,
          name: wf.name,
          nodes: (wf.nodes as any).map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            status: n.status === "running" ? "idle" : n.status,
            position: n.position,
            size: n.size,
            config: n.config,
            result: n.result,
          })),
          edges: (wf.edges as any).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          viewport: wf.viewport,
          updatedAt: wf.updatedAt,
          version: wf.version,
        }
        const current = next[wf.id]
        if (!current || (incoming.version || 0) > (current.version || 0)) {
          next[wf.id] = incoming
        }
      }
      return { workflows: next } as any
    })
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
    void persistGraph(doc)
    return id
  },
  removeWorkflow(id) {
    set((s) => {
      const next = { ...s.workflows }
      delete next[id]
      return { workflows: next } as any
    })
    // Hard delete from DB
    if (db) {
      void db
        .transaction("rw", db.workflows, db.nodes, db.edges, async () => {
          await db.workflows.delete(id)
          await db.nodes.where("workflowId").equals(id).delete()
          await db.edges.where("workflowId").equals(id).delete()
        })
        .catch((e) => {
          console.warn("[DB] Delete failed, using fallback:", e)
          import("@/lib/store/db-fallback").then(({ fallbackDeleteWorkflow }) => fallbackDeleteWorkflow(id))
        })
    } else {
      import("@/lib/store/db-fallback").then(({ fallbackDeleteWorkflow }) => fallbackDeleteWorkflow(id))
    }
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
      ;(s.workflows as any)[workflowId] = next
      void persistGraph(next)
      return { workflows: { ...s.workflows } } as any
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
      ;(s.workflows as any)[workflowId] = next
      void persistGraph(next)
      return { workflows: { ...s.workflows } } as any
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
      ;(s.workflows as any)[workflowId] = next
      void persistGraph(next)
      return { workflows: { ...s.workflows } } as any
    })
  },
  updateNodeConfig(workflowId, nodeId, config) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const nodes = doc.nodes.map((n) => (n.id === nodeId ? { ...n, config: { ...(n.config || {}), ...config } } : n))

      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      ;(s.workflows as any)[workflowId] = next
      void persistGraph(next)
      return { workflows: { ...s.workflows } } as any
    })
  },
  updateNodeResult(workflowId, nodeId, result, resultHistory) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const nodes = doc.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              result,
              resultHistory: resultHistory || n.resultHistory,
              status: "complete",
            }
          : n,
      )
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      ;(s.workflows as any)[workflowId] = next
      void persistGraph(next)
      return { workflows: { ...s.workflows } } as any
    })
  },
  updateNodeStatus(workflowId, nodeId, status) {
    set((s) => {
      const doc = s.workflows[workflowId]
      if (!doc) return {} as any
      const nodes = doc.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n))
      const next = { ...doc, nodes }
      ;(s.workflows as any)[workflowId] = next
      // Do not persist transient running status immediately
      if (status !== "running")
        void persistGraph({
          ...next,
          updatedAt: Date.now(),
          version: (next.version || 0) + 1,
        })
      return { workflows: { ...s.workflows } } as any
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
          : n,
      )
      const next = {
        ...doc,
        nodes,
        updatedAt: Date.now(),
        version: (doc.version || 0) + 1,
      }
      ;(s.workflows as any)[workflowId] = next
      void persistGraph(next)
      return { workflows: { ...s.workflows } } as any
    })
  },
}))

// Cross-tab listener: hydrate when another tab updates
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  const ch = new BroadcastChannel("atelier:workflows")
  ch.addEventListener("message", () => {
    try {
      const { hydrate } = useWorkflowStore.getState()
      void hydrate()
    } catch {}
  })
}
