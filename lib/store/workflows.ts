"use client"

import type { WorkflowNode } from "@/lib/workflow-engine"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"
import { getKV, putKV } from "@/lib/store/db"

export interface ChatEntry {
  id: string
  type: "user" | "agent"
  content: string
  timestamp: string
}

export interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  chat: ChatEntry[]
  history?: WorkflowNode[][]
  edges?: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }>
  viewport?: { x: number; y: number; zoom: number }
}

type WorkflowUpdate = {
  type: "add-node" | "modify-node"
  nodeType?: WorkflowNode["type"]
  nodeId?: string
  config?: Record<string, any>
}

type Listener = () => void

function mapDocToWorkflow(doc: any): Workflow {
  return {
    id: doc.id,
    name: doc.name,
    nodes: doc.nodes,
    edges: doc.edges,
    viewport: doc.viewport,
    chat: [],
    history: [],
  } as any
}

let initialized = false
let initPromise: Promise<void> | null = null
function ensureInit() {
  if (initialized || initPromise) return
  initPromise = (async () => {
    try {
      await useWorkflowStore.getState().hydrate()
      // Note: Seeding is now handled in app/page.tsx to avoid duplication
      await putKV("schemaVersion", 1)
    } catch {}
    initialized = true
    initPromise = null
  })()
}

class WorkflowStoreCompat {
  subscribe(listener: Listener) {
    ensureInit()
    return useWorkflowStore.subscribe(listener)
  }

  list(): Workflow[] {
    ensureInit()
    const ws = useWorkflowStore.getState().workflows
    return Object.values(ws).map(mapDocToWorkflow)
  }

  get(workflowId: string): Workflow | undefined {
    ensureInit()
    const doc = (useWorkflowStore.getState().workflows as any)[workflowId]
    return doc ? mapDocToWorkflow(doc) : undefined
  }

  upsert(workflow: Workflow) {
    ensureInit()
    const s = useWorkflowStore.getState()
    const exists = !!s.workflows[workflow.id]
    if (!exists) {
      // Create with exact ID from import
      const doc: any = {
        id: workflow.id,
        name: workflow.name,
        nodes: [],
        edges: [],
        updatedAt: Date.now(),
        version: 0,
      }
      s.workflows[workflow.id] = doc
    }
    s.setNodes(workflow.id, workflow.nodes)
    s.setEdges(workflow.id, (workflow.edges as any) || [])
    if (workflow.viewport) s.setViewport(workflow.id, workflow.viewport)
  }

  create(name: string): Workflow {
    ensureInit()
    const id = useWorkflowStore.getState().createWorkflow(name)
    const wf = this.get(id)!
    return wf
  }

  rename(workflowId: string, name: string) {
    ensureInit()
    const s = useWorkflowStore.getState()
    const doc = (s.workflows as any)[workflowId]
    if (!doc) return
    ;(doc as any).name = name
    // trigger persistence by a no-op set
    s.setViewport(workflowId, doc.viewport || { x: 0, y: 0, zoom: 1 })
  }

  remove(workflowId: string) {
    ensureInit()
    const s = useWorkflowStore.getState()
    // Perform atomic removal using the zustand action (handles Dexie transaction)
    s.removeWorkflow(workflowId)
  }

  setNodes(workflowId: string, nodes: WorkflowNode[]) {
    ensureInit()
    useWorkflowStore.getState().setNodes(workflowId, nodes)
  }

  setNodeSize(workflowId: string, nodeId: string, size: { width: number; height: number }) {
    ensureInit()
    useWorkflowStore.getState().updateNodeDimensions(workflowId, nodeId, undefined, size)
  }

  updateNodeDimensions(
    workflowId: string,
    nodeId: string,
    position?: { x: number; y: number },
    size?: { width: number; height: number }
  ) {
    ensureInit()
    useWorkflowStore.getState().updateNodeDimensions(workflowId, nodeId, position, size)
  }

  setEdges(workflowId: string, edges: Workflow["edges"]) {
    ensureInit()
    useWorkflowStore.getState().setEdges(workflowId, (edges as any) || [])
  }

  setViewport(workflowId: string, viewport: Workflow["viewport"]) {
    ensureInit()
    useWorkflowStore.getState().setViewport(workflowId, viewport || { x: 0, y: 0, zoom: 1 })
  }

  updateNodeConfig(workflowId: string, nodeId: string, config: Record<string, any>) {
    ensureInit()
    useWorkflowStore.getState().updateNodeConfig(workflowId, nodeId, config)
  }

  updateNodeResult(
    workflowId: string,
    nodeId: string,
    result: WorkflowNode["result"],
    resultHistory?: WorkflowNode["resultHistory"]
  ) {
    ensureInit()
    useWorkflowStore.getState().updateNodeResult(workflowId, nodeId, result, resultHistory)
  }

  updateNodeStatus(workflowId: string, nodeId: string, status: WorkflowNode["status"]) {
    ensureInit()
    useWorkflowStore.getState().updateNodeStatus(workflowId, nodeId, status)
  }

  applyUpdates(workflowId: string, updates: WorkflowUpdate[]) {
    ensureInit()
    const s = useWorkflowStore.getState()
    const doc = (s.workflows as any)[workflowId]
    if (!doc) return
    let nodes = [...doc.nodes]
    for (const u of updates) {
      if (u.type === "add-node" && u.nodeType) {
        const id = `${u.nodeType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        nodes.push({
          id,
          type: u.nodeType,
          title: this.titleForType(u.nodeType),
          status: "idle",
          position: this.randomPosition(nodes.length),
          config: u.config || {},
        } as any)
      }
      if (u.type === "modify-node" && u.nodeId) {
        nodes = nodes.map((n: any) =>
          n.id === u.nodeId ? { ...n, config: { ...(n.config || {}), ...(u.config || {}) } } : n
        )
      }
    }
    s.setNodes(workflowId, nodes)
  }

  rollbackLast(_workflowId: string) {
    // not implemented in zustand shim
  }

  private titleForType(type: WorkflowNode["type"]): string {
    switch (type) {
      case "prompt":
        return "Prompt"
      case "image-gen":
        return "Image"
      case "image-edit":
        return "Image Edit"
      case "video-gen":
        return "Video Generation"
      case "background-replace":
        return "Background Replace"
    }
    return String(type)
  }

  private randomPosition(count: number) {
    const spacingX = 260
    const spacingY = 160
    const col = count % 3
    const row = Math.floor(count / 3)
    return { x: 120 + col * spacingX, y: 140 + row * spacingY }
  }
}

export const workflowStore = new WorkflowStoreCompat()
