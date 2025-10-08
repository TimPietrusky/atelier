"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { workflowStore } from "@/lib/store/workflows"
import { FlowCanvas } from "@/components/flow-canvas"
import { makeSolidEdge } from "@/lib/flow/utils"
import { NODE_TYPES } from "@/lib/nodes/config"
import { PromptNode as PromptNodeExt } from "@/components/nodes/prompt-node"
import { ImageNode as ImageNodeExt } from "@/components/nodes/image-node"
import { CustomNode as CustomNodeExt } from "@/components/nodes/custom-node"
import { TestNode as TestNodeExt } from "@/components/nodes/test-node"

interface NodeGraphCanvasProps {
  activeWorkflow: string
  onExecute?: () => void
  executionStatus?: "idle" | "running" | "paused"
  onStatusChange?: (status: "idle" | "running" | "paused") => void
  queueCount?: number
  onCanvasDoubleClick?: (position: {
    x: number
    y: number
    canvasX: number
    canvasY: number
  }) => void
  onNodeClick?: (nodeId: string) => void
  onPaneClick?: () => void
  selectedNodeId?: string | null
}

export function NodeGraphCanvas({
  activeWorkflow,
  onExecute,
  executionStatus = "idle",
  onStatusChange,
  queueCount = 0,
  onCanvasDoubleClick,
  onNodeClick,
  onPaneClick,
  selectedNodeId,
}: NodeGraphCanvasProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const reactFlowInstance = useReactFlow()
  const isInteractingRef = useRef(false)
  const pendingSizesRef = useRef(new Map<string, { width: number; height: number }>())
  const selectedNodeIdRef = useRef(selectedNodeId)

  // Keep ref in sync with prop
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  const commitPendingSizes = useCallback(() => {
    if (pendingSizesRef.current.size === 0) return
    const entries = Array.from(pendingSizesRef.current.entries())
    pendingSizesRef.current.clear()
    entries.forEach(([id, size]) => {
      workflowStore.updateNodeDimensions(activeWorkflow, id, undefined, size)
    })
  }, [activeWorkflow])

  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Don't allow self-connections
      if (connection.source === connection.target) return false

      // Allow all other connections - nodes have single input/output handles
      // Backend will handle resolving the correct inputs
      return true
    },
    [activeWorkflow]
  )

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = makeSolidEdge(params)
      setEdges((eds) => addEdge(newEdge, eds))
      queueMicrotask(() => {
        const wf = workflowStore.get(activeWorkflow)
        if (wf) {
          const updated = [...((wf.edges as any) || []), newEdge] as any
          workflowStore.setEdges(activeWorkflow, updated)
        }
      })
    },
    [setEdges, activeWorkflow]
  )

  const addNewNode = useCallback(
    (nodeType: string) => {
      const nodeTypeMap = {
        prompt: {
          type: "promptNode",
          title: "Prompt",
          config: { prompt: "" },
        },
        "image-gen": {
          type: "imageGenNode",
          title: "Image",
          config: { model: "black-forest-labs/flux-1-schnell", steps: 30 },
        },
        "video-gen": {
          type: "customNode",
          title: "Video Gen",
          config: { duration: 10, fps: 24 },
        },
        "background-replace": {
          type: "customNode",
          title: "Background Replace",
          config: { background_prompt: "" },
        },
      }

      const nodeConfig = nodeTypeMap[nodeType as keyof typeof nodeTypeMap]

      if (!nodeConfig) {
        console.error("Invalid node type:", nodeType)
        return
      }

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeConfig.type,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 200 + 150,
        },
        width: 256,
        data: {
          type: nodeType,
          title: nodeConfig.title,
          status: "idle",
          config: nodeConfig.config,
        },
      }

      setNodes((nds) => nds.concat(newNode))
      const wf = workflowStore.get(activeWorkflow)
      if (wf) {
        workflowStore.setNodes(activeWorkflow, [
          ...wf.nodes,
          {
            id: newNode.id,
            type: nodeType as any,
            title: String(newNode.data.title),
            status: "idle" as const,
            position: newNode.position as any,
            config: newNode.data.config as Record<string, any>,
            size: { width: 256, height: 0 },
          },
        ])
      }
    },
    [setNodes, activeWorkflow]
  )

  const handleRun = () => {
    onExecute?.()
  }

  const nodeTypeConfig = NODE_TYPES

  const nodeTypes = {
    promptNode: PromptNodeExt,
    imageGenNode: ImageNodeExt,
    customNode: CustomNodeExt,
    testNode: TestNodeExt,
  }

  const proOptions = { hideAttribution: true }

  const mapStoreNodeToRF = useCallback(
    (n: any): Node => ({
      id: n.id,
      type:
        n.type === "prompt"
          ? "promptNode"
          : n.type === "image-gen" || n.type === "image-edit"
          ? "imageGenNode"
          : n.type === "test"
          ? "testNode"
          : "customNode",
      position: n.position,
      width: (n as any).size?.width ?? undefined,
      height:
        (n as any).size?.height && (n as any).size?.height > 0
          ? (n as any).size?.height
          : undefined,
      data: {
        workflowId: activeWorkflow,
        type: n.type,
        title: n.title,
        status: n.status,
        config: n.config,
        onChange: (cfg: Record<string, any>) =>
          workflowStore.updateNodeConfig(activeWorkflow, n.id, cfg),
        onOpenInspector: () => {
          // Toggle: if this node is already the selected one, close the panel
          if (selectedNodeIdRef.current === n.id) {
            onPaneClick?.()
          } else {
            onNodeClick?.(n.id)
          }
        },
        result: n.result,
        resultHistory: n.resultHistory,
      },
      className: n.id === selectedNodeId ? "selected-node" : "",
      style: n.id === selectedNodeId ? { boxShadow: "0 0 0 2px #ff0080" } : {},
    }),
    [activeWorkflow, selectedNodeId, onNodeClick, onPaneClick]
  )

  const onNodesChangeHandler = useCallback(
    (changes: any[]) => {
      onNodesChange(changes)
      const anyDragging = changes.some((c) => c.type === "position" && c.dragging === true)
      const anyPositionDrop = changes.some((c) => c.type === "position" && c.dragging === false)
      const anyResize = changes.some((c) => c.type === "dimensions")
      if (anyDragging || anyResize) {
        isInteractingRef.current = true
      }
      const positionChanges = changes.filter((c) => c.type === "position" && c.dragging === false)
      if (positionChanges.length > 0) {
        // Commit position changes immediately (using queueMicrotask for proper ordering)
        queueMicrotask(() => {
          const wf = workflowStore.get(activeWorkflow)
          if (wf) {
            const updatedNodes = wf.nodes.map((n) => {
              const change = positionChanges.find((c) => c.id === n.id)
              if (change && change.position) {
                return { ...n, position: change.position }
              }
              return n
            })
            workflowStore.setNodes(activeWorkflow, updatedNodes)
          }
          isInteractingRef.current = false
        })
      }

      const resizeChanges = changes.filter((c) => c.type === "dimensions")
      if (resizeChanges.length > 0) {
        resizeChanges.forEach((c: any) => {
          const node = nodes.find((n) => n.id === c.id)
          if (node && typeof node.width === "number" && typeof node.height === "number") {
            pendingSizesRef.current.set(c.id, {
              width: node.width,
              height: node.height,
            })
          }
        })
      }

      const removed = changes.filter((c) => c.type === "remove").map((c) => c.id as string)
      if (removed.length > 0) {
        // Close inspector panel if selected node was deleted
        removed.forEach((nodeId) => {
          if (onPaneClick) onPaneClick() // This will clear selection
        })
        queueMicrotask(() => {
          const wf = workflowStore.get(activeWorkflow)
          if (!wf) return
          const remainingNodes = wf.nodes.filter((n) => !removed.includes(n.id))
          const remainingNodeIds = new Set(remainingNodes.map((n) => n.id))
          const remainingEdges = (wf.edges || []).filter(
            (e) => remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
          )
          workflowStore.setNodes(activeWorkflow, remainingNodes as any)
          workflowStore.setEdges(activeWorkflow, remainingEdges as any)
        })
      }
    },
    [onNodesChange, activeWorkflow, nodes, onPaneClick]
  )

  useEffect(() => {
    const onPointerUp = () => {
      if (isInteractingRef.current) {
        commitPendingSizes()
        isInteractingRef.current = false
      }
    }
    window.addEventListener("pointerup", onPointerUp, true)
    const unsub = workflowStore.subscribe(() => {
      const wf = workflowStore.get(activeWorkflow)
      if (!wf) return

      // Update nodes: during interaction, only update data (result, status), not position/size
      setNodes((prev) => {
        const prevSel = new Map(prev.map((p) => [p.id, p.selected]))
        const mapped = wf.nodes.map(mapStoreNodeToRF).map((n) => {
          const prevNode = prev.find((p) => p.id === n.id)

          // If interacting and this node exists, preserve its position and dimensions
          if (isInteractingRef.current && prevNode) {
            return {
              ...n,
              position: prevNode.position,
              width: prevNode.width,
              height: prevNode.height,
              selected: prevSel.get(n.id) || false,
            }
          }

          return {
            ...n,
            selected: prevSel.get(n.id) || false,
          }
        })
        return mapped
      })

      if (wf.edges)
        setEdges(
          (wf.edges as any).map((e: any) => ({
            ...e,
            type: "default",
            style: { stroke: "#e5e7eb", strokeWidth: 2 },
            animated: false,
          }))
        )
    })
    const wf0 = workflowStore.get(activeWorkflow)
    if (wf0) {
      setNodes((prev) => {
        const prevSel = new Map(prev.map((p) => [p.id, p.selected]))
        const mapped0: Node[] = wf0.nodes
          .map(mapStoreNodeToRF)
          .map((n) => ({ ...n, selected: prevSel.get(n.id) || false }))
        return mapped0
      })
      if (wf0.edges)
        setEdges(
          (wf0.edges as any).map((e: any) => ({
            ...e,
            type: "default",
            style: { stroke: "#e5e7eb", strokeWidth: 2 },
            animated: false,
          }))
        )
      // Restore viewport for this workflow
      if (wf0.viewport) {
        reactFlowInstance.setViewport(wf0.viewport, { duration: 0 })
      }
    }
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver loop completed with undelivered notifications")) {
        event.preventDefault()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes(
          "ResizeObserver loop completed with undelivered notifications"
        )
      ) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("pointerup", onPointerUp, true)
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      unsub()
    }
  }, [activeWorkflow])

  const onEdgesChangeHandler = useCallback(
    (changes: any[]) => {
      onEdgesChange(changes)
      // Commit edge changes immediately using queueMicrotask
      queueMicrotask(() => {
        setEdges((currentEdges) => {
          workflowStore.setEdges(activeWorkflow, currentEdges as any)
          return currentEdges
        })
      })
    },
    [onEdgesChange, activeWorkflow]
  )

  const onMoveEnd = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      workflowStore.setViewport(activeWorkflow, viewport)
    },
    [activeWorkflow]
  )

  return (
    <div className="h-full w-full relative bg-background">
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onMoveEnd={onMoveEnd}
        defaultViewport={(workflowStore.get(activeWorkflow)?.viewport as any) || undefined}
        onNodeClick={(nodeId) => onNodeClick?.(nodeId)}
        onPaneClick={() => onPaneClick?.()}
        onPaneDoubleClick={(pos) => {
          if (onCanvasDoubleClick) {
            const canvasPos = reactFlowInstance.screenToFlowPosition({
              x: pos.x,
              y: pos.y,
            })
            onCanvasDoubleClick({
              x: pos.x,
              y: pos.y,
              canvasX: canvasPos.x,
              canvasY: canvasPos.y,
            })
          }
        }}
      />
    </div>
  )
}
