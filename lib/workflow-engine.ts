import { getImageModelMeta } from "@/lib/config"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"
import { assetManager, type AssetRef } from "@/lib/store/asset-manager"

export interface WorkflowNode {
  id: string
  type: "prompt" | "image-gen" | "image-edit" | "video-gen" | "background-replace"
  title: string
  status: "idle" | "running" | "complete" | "error"
  position: { x: number; y: number }
  size?: { width: number; height: number }
  inputs?: string[]
  outputs?: string[]
  config?: Record<string, any>
  result?: {
    type: "text" | "image" | "video"
    data?: string // For text results only
    assetRef?: AssetRef // For images/videos (required for media)
    metadata?: Record<string, any>
  }
  // History of all results (for image nodes to show multiple generations)
  resultHistory?: Array<{
    id?: string
    type: "text" | "image" | "video"
    data?: string // For text results only
    assetRef?: AssetRef // For images/videos (required for media)
    metadata?: Record<string, any>
  }>
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: "queued" | "running" | "completed" | "failed"
  startTime?: Date
  endTime?: Date
  currentNodeId?: string
  progress: number
  estimatedCost: number
  actualCost?: number
  error?: string
}

export interface ExecutionQueue {
  id: string
  workflowId: string
  nodes: WorkflowNode[] // Snapshot at queue time
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>
  priority: number
  estimatedDuration: number
  estimatedCost: number
  createdAt: Date
}

export class WorkflowEngine {
  private executions: Map<string, WorkflowExecution> = new Map()
  private queue: ExecutionQueue[] = []
  private isProcessing = false
  private maxConcurrency = 5
  private runningCount = 0
  // Snapshots captured at queue time to isolate executions from live edits
  private queuedSnapshots: Map<string, { nodes: WorkflowNode[]; edges: any[] }> = new Map()
  // live node snapshots during an execution to avoid stale localStorage reads
  private runtimeNodesByWorkflow: Map<string, WorkflowNode[]> = new Map()
  // Multiple callbacks to notify UI of execution changes (replaces polling)
  private executionChangeListeners: Set<() => void> = new Set()

  /**
   * Add a listener for execution changes. Returns unsubscribe function.
   */
  addExecutionChangeListener(callback: () => void): () => void {
    this.executionChangeListeners.add(callback)
    return () => {
      this.executionChangeListeners.delete(callback)
    }
  }

  /**
   * @deprecated Use addExecutionChangeListener instead. This method only supports a single callback.
   */
  setOnExecutionsChange(callback: (() => void) | undefined) {
    // Legacy support: convert to listener pattern
    if (callback) {
      this.executionChangeListeners.add(callback)
    }
  }

  /**
   * Notify all listeners that executions have changed.
   */
  private notifyChange() {
    this.executionChangeListeners.forEach((listener) => {
      try {
        listener()
      } catch (err) {
        console.error("[WorkflowEngine] Listener error:", err)
      }
    })
  }

  async executeWorkflow(workflowId: string, nodes: WorkflowNode[]): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Get current workflow state to snapshot edges as well
    let edges: any[] = []
    try {
      const s = useWorkflowStore.getState()
      const workflow = s.workflows[workflowId]
      edges = (workflow?.edges as any[]) || []
    } catch {}

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: "queued",
      progress: 0,
      estimatedCost: this.calculateEstimatedCost(nodes),
    }

    this.executions.set(executionId, execution)
    this.notifyChange() // Notify UI

    // Snapshot nodes and edges at queue time to isolate from future edits
    this.queuedSnapshots.set(executionId, {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
    })

    // Add to queue with snapshot
    this.queue.push({
      id: executionId,
      workflowId,
      nodes: nodes.map((n) => ({ ...n })), // Store snapshot in queue for persistence
      edges: edges.map((e) => ({ ...e })),
      priority: 1,
      estimatedDuration: this.calculateEstimatedDuration(nodes),
      estimatedCost: execution.estimatedCost,
      createdAt: new Date(),
    })

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }

    return executionId
  }

  private async processQueue() {
    if (this.runningCount >= this.maxConcurrency) return
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const queueItem = this.queue.shift()!
    const execution = this.executions.get(queueItem.id)!

    this.runningCount++
    ;(async () => {
      try {
        execution.status = "running"
        execution.startTime = new Date()
        this.notifyChange() // Notify UI
        await this.runWorkflowExecution(execution)
        execution.status = "completed"
        execution.endTime = new Date()
        execution.progress = 100
        this.notifyChange() // Notify UI
      } catch (error) {
        execution.status = "failed"
        execution.error = error instanceof Error ? error.message : "Unknown error"
        execution.endTime = new Date()
        this.notifyChange() // Notify UI
      } finally {
        // Keep snapshot for completed executions (needed for queue UI)
        // Snapshots are cleaned up when executions are cleared via clearExecutions()
        this.runningCount--
        setTimeout(() => this.processQueue(), 50)
      }
    })()

    // Try to start more if capacity remains
    if (this.runningCount < this.maxConcurrency) {
      setTimeout(() => this.processQueue(), 0)
    }
  }

  private async runWorkflowExecution(execution: WorkflowExecution) {
    // Use snapshot from queue time to ensure edits don't affect already-queued workflows
    const snapshot = this.queuedSnapshots.get(execution.id)
    if (!snapshot) throw new Error("Queue snapshot not found for execution")

    // Order nodes using a simple topological sort based on edges so that
    // upstream nodes execute before their dependents.
    const edges: Array<{ source: string; target: string }> = snapshot.edges
    const nodes: WorkflowNode[] = snapshot.nodes

    const idToNode = new Map(nodes.map((n: WorkflowNode) => [n.id, n]))
    const indegree = new Map<string, number>()
    nodes.forEach((n) => indegree.set(n.id, 0))
    edges.forEach((e) => {
      indegree.set(e.target, (indegree.get(e.target) || 0) + 1)
    })

    const queue: WorkflowNode[] = []
    // Seed queue in original order for stable results
    nodes.forEach((n) => {
      if ((indegree.get(n.id) || 0) === 0) queue.push(n)
    })

    const ordered: WorkflowNode[] = []
    const outgoing = new Map<string, string[]>()
    edges.forEach((e) => {
      const arr = outgoing.get(e.source) || []
      arr.push(e.target)
      outgoing.set(e.source, arr)
    })

    while (queue.length) {
      const n = queue.shift()!
      ordered.push(n)
      const outs = outgoing.get(n.id) || []
      outs.forEach((t) => {
        const next = (indegree.get(t) || 0) - 1
        indegree.set(t, next)
        if (next === 0 && idToNode.has(t)) {
          queue.push(idToNode.get(t)!)
        }
      })
    }

    // Fallback: append any nodes that were not included due to cycles/missing edges
    nodes.forEach((n) => {
      if (!ordered.includes(n)) ordered.push(n)
    })

    // Keep a live snapshot for resolution of inputs across nodes
    this.runtimeNodesByWorkflow.set(
      execution.workflowId,
      ordered.map((n) => ({ ...n }))
    )

    const totalSteps = ordered.length

    // Reset all node statuses to idle before starting; update store for UI
    ordered.forEach((n) => (n.status = "idle"))
    try {
      const { updateNodeStatus } = useWorkflowStore.getState()
      ordered.forEach((n) => updateNodeStatus(execution.workflowId, n.id, "idle"))
    } catch {}

    for (let i = 0; i < ordered.length; i++) {
      const node = ordered[i]
      execution.progress = ((i + 1) / totalSteps) * 100
      execution.currentNodeId = node.id
      this.notifyChange() // Notify UI of progress
      ;(node as any).workflowId = execution.workflowId

      try {
        // mark active
        try {
          const { updateNodeStatus } = useWorkflowStore.getState()
          updateNodeStatus(execution.workflowId, node.id, "running")
        } catch {}

        await this.executeNode(node)
        node.status = "complete"
        try {
          const { updateNodeStatus } = useWorkflowStore.getState()
          updateNodeStatus(execution.workflowId, node.id, "complete")
        } catch {}
      } catch (error) {
        node.status = "error"
        try {
          const { updateNodeStatus } = useWorkflowStore.getState()
          updateNodeStatus(execution.workflowId, node.id, "error")
        } catch {}
        throw error
      }

      // Update live snapshot
      this.runtimeNodesByWorkflow.set(
        execution.workflowId,
        ordered.map((n) => ({ ...n }))
      )

      // Zustand/Dexie persistence handled by store actions; nothing to do here

      // Small delay between nodes
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  private getRuntimeNodes(workflowId: string): WorkflowNode[] | undefined {
    return this.runtimeNodesByWorkflow.get(workflowId)
  }

  private async executeNode(node: WorkflowNode) {
    // Refresh node config from the latest store snapshot before executing,
    // so recent UI changes (like localImage) are respected.
    try {
      const wfId = (node as any).workflowId as string | undefined
      if (wfId) {
        const wf = (useWorkflowStore.getState().workflows as any)[wfId]
        const fresh = wf?.nodes?.find((n: any) => n.id === node.id)
        if (fresh && fresh.config) {
          node.config = JSON.parse(JSON.stringify(fresh.config))
        }
      }
    } catch {}

    switch (node.type) {
      case "prompt":
        await this.executePromptNode(node)
        break
      case "image-gen":
        await this.executeImageGenNode(node)
        break
      case "image-edit":
        await this.executeImageEditNode(node)
        break
      case "video-gen":
        await this.executeVideoGenNode(node)
        break
      case "background-replace":
        await this.executeBackgroundReplaceNode(node)
        break
      default:
        // Output and other nodes don't need execution
        break
    }
  }

  private async executePromptNode(node: WorkflowNode) {
    // Pass-through: just capture the user's typed prompt as text result
    const text = String(node.config?.prompt || "")
    node.result = {
      type: "text",
      data: text,
      metadata: {
        timestamp: new Date().toISOString(),
        inputsUsed: { prompt: text },
      },
    }
    try {
      const wfId = (node as any).workflowId as string | undefined
      if (wfId) {
        const { updateNodeResult } = useWorkflowStore.getState()
        // Prompt nodes don't use resultHistory (only image nodes do)
        updateNodeResult(wfId, node.id, node.result, undefined)
      }
    } catch {}
  }

  private async executeImageGenNode(node: WorkflowNode) {
    // Short-circuit: if user uploaded an image on this node, don't generate.
    // Check for uploadedAssetRef (new) or localImage (legacy fallback)
    if (node.config?.uploadedAssetRef) {
      // Load from AssetManager
      const asset = await assetManager.loadAsset(node.config.uploadedAssetRef)
      if (asset) {
        node.result = {
          type: "image",
          data: asset.data,
          assetRef: node.config.uploadedAssetRef,
          metadata: {
            timestamp: new Date().toISOString(),
            inputsUsed: { mode: "uploaded", source: "user" },
          },
        }
        // Notify workflow store so UI updates
        try {
          const wfId = (node as any).workflowId as string | undefined
          if (wfId) {
            const { updateNodeResult } = useWorkflowStore.getState()
            // Uploaded image (not generated) - don't add to history
            updateNodeResult(wfId, node.id, node.result, undefined)
          }
        } catch {}
        return
      }
    } else if (typeof node.config?.localImage === "string") {
      // Legacy: direct data URL
      node.result = {
        type: "image",
        data: node.config.localImage,
        assetRef: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          inputsUsed: { mode: "local", source: "user" },
        },
      }
      // Notify workflow store so UI updates
      try {
        const wfId = (node as any).workflowId as string | undefined
        if (wfId) {
          const { updateNodeResult } = useWorkflowStore.getState()
          // Local image (not generated) - don't add to history
          updateNodeResult(wfId, node.id, node.result, undefined)
        }
      } catch {}
      return
    }

    // Resolve prompt and optional image input from incoming edges; fallback to node config
    let prompt: string | undefined = node.config?.prompt
    let inputImageUrl: string | undefined
    const wfId = (node as any).workflowId as string | undefined
    if (wfId) {
      const s = useWorkflowStore.getState()
      const wf = (s.workflows as any)[wfId]
      const liveNodes = (this.getRuntimeNodes(wfId) || wf?.nodes || []).map((n: any) => ({ ...n }))
      const edges: Array<{
        source: string
        target: string
        sourceHandle?: string
        targetHandle?: string
      }> = (wf?.edges as any[]) || []
      const incoming = edges.filter((e) => e.target === node.id)
      const sourceNodes = incoming
        .map((e) => (liveNodes || []).find((n: any) => n.id === e.source))
        .filter(Boolean)
      const pNode = sourceNodes
        .slice()
        .sort((a: any, b: any) => {
          const at = a.result?.metadata?.timestamp
            ? new Date(a.result.metadata.timestamp).getTime()
            : 0
          const bt = b.result?.metadata?.timestamp
            ? new Date(b.result.metadata.timestamp).getTime()
            : 0
          return bt - at
        })
        .find((n: any) => n.type === "prompt")
      if (pNode) {
        prompt = pNode.config?.prompt || pNode.result?.data || prompt
      } else if (!prompt) {
        const p = wf?.nodes?.find((n: any) => n.type === "prompt")
        prompt = p?.config?.prompt || p?.result?.data
      }
      // Prefer edges wired to the image-input handle; fall back to any image
      let imageCandidates = incoming
        .filter((e) => e.targetHandle === "image-input")
        .map((e) => (liveNodes || []).find((n: any) => n.id === e.source))
        .filter(
          (n: any) =>
            n && (n.type === "image-gen" || n.type === "image-edit") && n.result?.type === "image"
        ) as any[]
      if (imageCandidates.length === 0) {
        imageCandidates = sourceNodes.filter(
          (n: any) =>
            (n.type === "image-gen" || n.type === "image-edit") && n.result?.type === "image"
        ) as any[]
      }

      if (imageCandidates.length > 0) {
        const latest = imageCandidates.slice().sort((a: any, b: any) => {
          const at = a.result?.metadata?.timestamp
            ? new Date(a.result.metadata.timestamp).getTime()
            : 0
          const bt = b.result?.metadata?.timestamp
            ? new Date(b.result.metadata.timestamp).getTime()
            : 0
          return bt - at
        })[0]

        // Prefer resolving from AssetRef at request-time
        const ref: AssetRef | undefined = latest?.result?.assetRef
        if (ref) {
          try {
            const got = await AssetStorage.get(ref)
            if (typeof got === "string") {
              inputImageUrl = got
            } else {
              const dataUrl = await this.blobToDataUrl(got)
              inputImageUrl = dataUrl
            }
          } catch {}
        }
        if (!inputImageUrl) inputImageUrl = latest?.result?.data
      }

      // Expose hasImageInput to UI via config hint (non-persistent during run)
      try {
        if (wfId) {
          const { updateNodeConfig } = useWorkflowStore.getState()
          updateNodeConfig(wfId, node.id, {
            hasImageInput: !!inputImageUrl,
          } as any)
        }
      } catch {}
    }

    const selectedModel: string = node.config?.model || "black-forest-labs/flux-1-schnell"
    const hasImageInput = !!inputImageUrl
    const meta = getImageModelMeta(selectedModel)

    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt || (hasImageInput ? "Edit this image" : "A beautiful image"),
        model: selectedModel,
        ratio: node.config?.ratio || "1:1",
        width: node.config?.width,
        height: node.config?.height,
        steps: node.config?.steps,
        guidance: meta && meta.supportsGuidance ? node.config?.guidance : undefined,
        seed: node.config?.seed,
        inputs: hasImageInput ? { images: [inputImageUrl] } : undefined,
      }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error("Image generation failed")
    }

    // Save the image to the assets table
    const assetRef = await assetManager.saveAsset({
      kind: "idb",
      type: "image",
      data: result.imageUrl, // Store the URL or base64
      metadata: {
        workflowId: (node as any).workflowId,
        nodeId: node.id,
        executionId: result.executionId,
        model: selectedModel,
        prompt: prompt || (hasImageInput ? "Edit this image" : "A beautiful image"),
        timestamp: new Date().toISOString(),
        width: result.applied?.width ?? node.config?.width,
        height: result.applied?.height ?? node.config?.height,
      },
    })

    const newResult = {
      id: undefined, // Will be generated by updateNodeResult
      type: "image" as const,
      assetRef, // Only store the reference, not the full data
      metadata: {
        executionId: result.executionId,
        model: selectedModel,
        timestamp: new Date().toISOString(),
        inputsUsed: {
          prompt: prompt || (hasImageInput ? "Edit this image" : "A beautiful image"),
          mode: hasImageInput ? "img2img" : "txt2img",
          inputImageUrl,
          ratio: result.applied?.ratio || node.config?.ratio || "1:1",
          width: result.applied?.width ?? node.config?.width,
          height: result.applied?.height ?? node.config?.height,
          steps: node.config?.steps,
          guidance: node.config?.guidance,
          seed: node.config?.seed,
        },
      },
    }

    // Set as current result
    node.result = newResult

    // DON'T push to node.resultHistory here - let updateNodeResult handle it
    // The runtime snapshot will be updated via the store subscription

    // Save to media manager (best effort)
    try {
      const { mediaStore } = await import("@/lib/store/media")
      mediaStore.add({
        id: `asset_${Date.now()}`,
        type: "image",
        url: result.imageUrl,
        title: (prompt as string) || "Image Output",
        tags: [],
        createdAt: new Date().toISOString(),
        modelId: node.config?.model || "black-forest-labs/flux-1-schnell",
        width: node.config?.width,
        height: node.config?.height,
        workflowId: "" + (node as any).workflowId,
        nodeId: node.id,
        executionId: result.executionId,
      })
    } catch (_) {
      // ignore store errors
    }

    // Notify workflow store so UI updates
    // IMPORTANT: Pass only the NEW result [newResult], not entire node.resultHistory
    // The store will append it to existing history to avoid duplicates
    try {
      const wfId = (node as any).workflowId as string | undefined
      if (wfId) {
        const { updateNodeResult } = useWorkflowStore.getState()
        updateNodeResult(wfId, node.id, node.result, [newResult])
      }
    } catch {}
  }

  private async executeImageEditNode(node: WorkflowNode) {
    // Short-circuit: if this node has a user-uploaded image, act as a passthrough
    // Check for uploadedAssetRef (new) or localImage (legacy fallback)
    if (node.config?.uploadedAssetRef) {
      // Load from AssetManager
      const asset = await assetManager.loadAsset(node.config.uploadedAssetRef)
      if (asset) {
        node.result = {
          type: "image",
          data: asset.data,
          assetRef: node.config.uploadedAssetRef,
          metadata: {
            timestamp: new Date().toISOString(),
            inputsUsed: { mode: "uploaded", source: "user" },
          },
        }
        try {
          const { workflowStore } = await import("@/lib/store/workflows")
          const wfId = (node as any).workflowId as string | undefined
          if (wfId) {
            // Uploaded image (not generated) - don't add to history
            workflowStore.updateNodeResult(wfId, node.id, node.result, undefined)
          }
        } catch {}
        return
      }
    } else if (typeof node.config?.localImage === "string") {
      // Legacy: direct data URL
      node.result = {
        type: "image",
        data: node.config.localImage,
        assetRef: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          inputsUsed: { mode: "local", source: "user" },
        },
      }
      try {
        const { workflowStore } = await import("@/lib/store/workflows")
        const wfId = (node as any).workflowId as string | undefined
        if (wfId) {
          // Local image (not generated) - don't add to history
          workflowStore.updateNodeResult(wfId, node.id, node.result, undefined)
        }
      } catch {}
      return
    }

    // Resolve inputs from edges using live runtime snapshot
    let prompt: string | undefined = node.config?.prompt
    let inputImageUrl: string | undefined
    const wfId = (node as any).workflowId as string | undefined
    if (wfId) {
      const s = useWorkflowStore.getState()
      const wf = (s.workflows as any)[wfId]
      const liveNodes = (this.getRuntimeNodes(wfId) || wf?.nodes || []).map((n: any) => ({ ...n }))
      const edges: Array<{
        source: string
        target: string
        sourceHandle?: string
        targetHandle?: string
      }> = (wf?.edges as any[]) || []
      const incoming = edges.filter((e) => e.target === node.id)
      const sourceNodes = incoming
        .map((e) => (liveNodes || []).find((n: any) => n.id === e.source))
        .filter(Boolean)
      const promptNode = sourceNodes
        .slice()
        .sort((a: any, b: any) => {
          const at = a.result?.metadata?.timestamp
            ? new Date(a.result.metadata.timestamp).getTime()
            : 0
          const bt = b.result?.metadata?.timestamp
            ? new Date(b.result.metadata.timestamp).getTime()
            : 0
          return bt - at
        })
        .find((n: any) => n.type === "prompt")
      if (promptNode) {
        prompt = promptNode.config?.prompt || promptNode.result?.data || prompt
      } else if (!prompt) {
        const p = (liveNodes || []).find((n: any) => n.type === "prompt")
        prompt = p?.config?.prompt || p?.result?.data
      }

      // Prefer explicit image-input connection; else pick latest image result
      let imageCandidates = incoming
        .filter((e) => e.targetHandle === "image-input")
        .map((e) => (liveNodes || []).find((n: any) => n.id === e.source))
        .filter(Boolean) as any[]
      if (imageCandidates.length === 0) {
        imageCandidates = sourceNodes.filter(
          (n: any) =>
            (n.type === "image-gen" || n.type === "image-edit") && n.result?.type === "image"
        ) as any[]
      }
      if (imageCandidates.length > 0) {
        const latest = imageCandidates.slice().sort((a: any, b: any) => {
          const at = a.result?.metadata?.timestamp
            ? new Date(a.result.metadata.timestamp).getTime()
            : 0
          const bt = b.result?.metadata?.timestamp
            ? new Date(b.result.metadata.timestamp).getTime()
            : 0
          return bt - at
        })[0]
        // Resolve from AssetRef when possible
        const ref: AssetRef | undefined = latest?.result?.assetRef
        if (ref) {
          try {
            const got = await AssetStorage.get(ref)
            if (typeof got === "string") inputImageUrl = got
            else inputImageUrl = await this.blobToDataUrl(got)
          } catch {}
        }
        if (!inputImageUrl) inputImageUrl = latest?.result?.data
      }
    }

    if (!inputImageUrl) {
      throw new Error("Image edit requires an input image from another node")
    }

    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt || "Edit this image",
        model: node.config?.model || "bytedance/seedream-4.0-edit",
        ratio: node.config?.ratio || "1:1",
        width: node.config?.width,
        height: node.config?.height,
        steps: node.config?.steps,
        guidance: node.config?.guidance,
        seed: node.config?.seed,
        inputs: { imageUrl: inputImageUrl },
      }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error("Image edit failed")
    }

    // Save the edited image to the assets table
    const assetRef = await assetManager.saveAsset({
      kind: "idb",
      type: "image",
      data: result.imageUrl, // Store the URL or base64
      metadata: {
        workflowId: (node as any).workflowId,
        nodeId: node.id,
        executionId: result.executionId,
        model: node.config?.model || "bytedance/seedream-4.0-edit",
        prompt: prompt || "Edit this image",
        timestamp: new Date().toISOString(),
        width: node.config?.width,
        height: node.config?.height,
      },
    })

    const newResult = {
      id: undefined, // Will be generated by updateNodeResult
      type: "image" as const,
      assetRef, // Only store the reference, not the full data
      metadata: {
        executionId: result.executionId,
        model: node.config?.model || "bytedance/seedream-4.0-edit",
        inputImage: inputImageUrl,
        timestamp: new Date().toISOString(),
        inputsUsed: {
          prompt: prompt || "Edit this image",
          inputImageUrl,
          ratio: node.config?.ratio || "1:1",
          width: node.config?.width,
          height: node.config?.height,
          steps: node.config?.steps,
          guidance: node.config?.guidance,
          seed: node.config?.seed,
        },
      },
    }

    // Set as current result
    node.result = newResult

    // DON'T push to node.resultHistory here - let updateNodeResult handle it
    // The runtime snapshot will be updated via the store subscription

    // Save to media manager
    try {
      const { mediaStore } = await import("@/lib/store/media")
      mediaStore.add({
        id: `asset_${Date.now()}`,
        type: "image",
        url: result.imageUrl,
        title: `Edited: ${prompt || "Image"}`,
        tags: ["edited"],
        createdAt: new Date().toISOString(),
        modelId: node.config?.model || "bytedance/seedream-4.0-edit",
        width: node.config?.width,
        height: node.config?.height,
        workflowId: "" + (node as any).workflowId,
        nodeId: node.id,
        executionId: result.executionId,
      })
    } catch (_) {
      // ignore store errors
    }

    // Notify workflow store so UI updates
    // IMPORTANT: Pass only the NEW result [newResult], not entire node.resultHistory
    // The store will append it to existing history to avoid duplicates
    try {
      const wfId = (node as any).workflowId as string | undefined
      if (wfId) {
        const { updateNodeResult } = useWorkflowStore.getState()
        updateNodeResult(wfId, node.id, node.result, [newResult])
      }
    } catch {}
  }

  private async executeVideoGenNode(node: WorkflowNode) {
    await new Promise((resolve) => setTimeout(resolve, 3000)) // Simulate processing time

    node.result = {
      type: "video",
      data: "/cyberpunk-video-animation.jpg", // Placeholder
      metadata: {
        duration: node.config?.duration || 10,
        timestamp: new Date().toISOString(),
      },
    }
  }

  private async executeBackgroundReplaceNode(node: WorkflowNode) {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    node.result = {
      type: "image",
      data: "/fantasy-map-watercolor.jpg", // Placeholder
      metadata: {
        operation: "background-replace",
        timestamp: new Date().toISOString(),
      },
    }
  }

  private getWorkflowById(workflowId: string) {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("workflows") : null
      if (raw) {
        const arr = JSON.parse(raw) as Array<{
          id: string
          nodes: any[]
          edges?: Array<{ source: string; target: string; id: string }>
        }>
        const wf = arr.find((w) => w.id === workflowId)
        if (wf) return wf as any
      }
    } catch {
      // ignore
    }
    return undefined
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
  }

  private persistWorkflowNodes(workflowId: string, nodes: WorkflowNode[]) {
    try {
      if (typeof window === "undefined") return
      // Prefer the latest snapshot from the workflow store to avoid overwriting
      // recent UI changes (like node size) with stale in-memory nodes.
      const s = useWorkflowStore.getState()
      const wf = s.workflows[workflowId]
      if (wf?.nodes && Array.isArray(wf.nodes)) {
        nodes = (wf.nodes as WorkflowNode[]).map((n: any) => ({ ...n }))
      }
      const raw = window.localStorage.getItem("workflows")
      if (!raw) return
      const arr = JSON.parse(raw) as Array<{ id: string; nodes: any[] }>
      const idx = arr.findIndex((w) => w.id === workflowId)
      if (idx >= 0) {
        const cloned = nodes.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          status: n.status,
          position: { x: n.position.x, y: n.position.y },
          size: n.size ? { width: n.size.width, height: n.size.height } : undefined,
          inputs: n.inputs,
          outputs: n.outputs,
          config: n.config ? JSON.parse(JSON.stringify(n.config)) : undefined,
          result: n.result
            ? {
                type: n.result.type,
                data: n.result.data,
                metadata: n.result.metadata ? { ...n.result.metadata } : undefined,
              }
            : undefined,
        }))
        ;(arr[idx] as any).nodes = cloned
        window.localStorage.setItem("workflows", JSON.stringify(arr))
      }
    } catch {
      // ignore
    }
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId)
  }

  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values())
  }

  getQueue(): ExecutionQueue[] {
    return [...this.queue]
  }

  getQueueSnapshot(executionId: string) {
    return this.queuedSnapshots.get(executionId)
  }

  clearExecutions(): void {
    // Clear completed and failed executions, keep running ones
    const running = Array.from(this.executions.values()).filter((e) => e.status === "running")
    const runningIds = new Set(running.map((e) => e.id))

    // Clear executions but keep snapshots for running items
    this.executions.clear()
    running.forEach((e) => this.executions.set(e.id, e))

    // Clean up snapshots for cleared executions only
    Array.from(this.queuedSnapshots.keys()).forEach((id) => {
      if (!runningIds.has(id) && !this.queue.some((q) => q.id === id)) {
        this.queuedSnapshots.delete(id)
      }
    })

    this.notifyChange() // Notify UI
  }

  getActiveJobsCount(): number {
    // Returns count of queued + running jobs
    const runningCount = Array.from(this.executions.values()).filter(
      (e) => e.status === "running" || e.status === "queued"
    ).length
    return runningCount
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId)
    if (execution && execution.status === "running") {
      execution.status = "failed"
      execution.error = "Cancelled by user"
      execution.endTime = new Date()
      return true
    }
    return false
  }

  pauseExecution(executionId: string): boolean {
    // Implementation for pausing execution
    const execution = this.executions.get(executionId)
    if (execution && execution.status === "running") {
      // In a real implementation, this would pause the current operation
      return true
    }
    return false
  }

  resumeExecution(executionId: string): boolean {
    // Implementation for resuming execution
    const execution = this.executions.get(executionId)
    if (execution) {
      // In a real implementation, this would resume the paused operation
      return true
    }
    return false
  }

  private calculateEstimatedCost(nodes: WorkflowNode[]): number {
    let cost = 0

    nodes.forEach((node) => {
      switch (node.type) {
        case "prompt":
          cost += 0.01 // $0.01 for LLM processing
          break
        case "image-gen":
          cost += 0.05 // $0.05 for image generation
          break
        case "video-gen":
          cost += 0.25 // $0.25 for video generation
          break
        case "background-replace":
          cost += 0.03 // $0.03 for background processing
          break
        default:
          cost += 0.001 // Minimal cost for other operations
      }
    })

    return Math.round(cost * 100) / 100
  }

  private calculateEstimatedDuration(nodes: WorkflowNode[]): number {
    let duration = 0

    nodes.forEach((node) => {
      switch (node.type) {
        case "prompt":
          duration += 5 // 5 seconds for LLM
          break
        case "image-gen":
          duration += 30 // 30 seconds for image generation
          break
        case "video-gen":
          duration += 120 // 2 minutes for video generation
          break
        case "background-replace":
          duration += 15 // 15 seconds for background processing
          break
        default:
          duration += 1 // 1 second for other operations
      }
    })

    return duration
  }
}

// Global workflow engine instance
export const workflowEngine = new WorkflowEngine()
