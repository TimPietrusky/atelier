"use client"

import { useEffect, useState, useRef } from "react"
import { ReactFlowProvider, MiniMap } from "@xyflow/react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AtelierLogo } from "@/components/atelier-logo"
import { WorkflowSwitcher } from "@/components/workflow-switcher"
import { NodeGraphCanvas } from "@/components/node-graph-canvas"
import { ExecutionQueue } from "@/components/execution-queue"
import { MediaManager } from "@/components/media-manager"
import { NodeInspectorPanel } from "@/components/node-inspector-panel"
import { PromptInspector } from "@/components/node-inspector-sections/prompt-inspector"
import { ImageInspector } from "@/components/node-inspector-sections/image-inspector"
import { ExecutionInspector } from "@/components/node-inspector-sections/execution-inspector"
import { ConnectProvider } from "@/components/connect-provider"
import { CanvasControls } from "@/components/canvas-controls"
import { AddNodeMenu } from "@/components/add-node-menu"
import { AddNodeMenuItems } from "@/components/add-node-menu-items"
import { NODE_TYPES } from "@/lib/nodes/config"
import { workflowStore } from "@/lib/store/workflows"
import { workflowEngine } from "@/lib/workflow-engine"
import { getKV, putKV } from "@/lib/store/db"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"

export default function StudioDashboard() {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [isExecutionQueueOpen, setIsExecutionQueueOpen] = useState(false)
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<"canvas" | "media">("canvas")
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number
    y: number
    canvasX: number
    canvasY: number
  } | null>(null)
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "paused">("idle")
  const [queueCount, setQueueCount] = useState(0)
  const handleAddNode = (nodeType: string, position?: { x: number; y: number }) => {
    if (!activeWorkflow) return

    const nodeTypeMap: Record<string, { type: string; title: string; config: any }> = {
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

    const nodeConfig = nodeTypeMap[nodeType]
    if (!nodeConfig) {
      console.error("[app] Invalid node type:", nodeType)
      return
    }

    const wf = workflowStore.get(activeWorkflow)
    if (wf) {
      workflowStore.setNodes(activeWorkflow, [
        ...wf.nodes,
        {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType as any,
          title: nodeConfig.title,
          status: "idle" as const,
          position: position || {
            x: Math.random() * 400 + 200,
            y: Math.random() * 200 + 150,
          },
          config: nodeConfig.config,
          size: { width: 256, height: 0 },
        },
      ])
    }
  }

  const handleRun = () => {
    if (!activeWorkflow) return
    const wf = workflowStore.get(activeWorkflow)
    if (wf) {
      workflowEngine.executeWorkflow(wf.id, wf.nodes)
      setQueueCount(workflowEngine.getActiveJobsCount())
      try {
        const next = workflowStore.get(activeWorkflow)
        workflowStore.upsert({ ...(next as any) })
      } catch {}
    }
  }

  // Close inspector panel when workflow changes
  useEffect(() => {
    setSelectedNodeId(null)
  }, [activeWorkflow])

  // Get selected node from store
  const selectedNode =
    selectedNodeId && activeWorkflow
      ? workflowStore.get(activeWorkflow)?.nodes.find((n) => n.id === selectedNodeId)
      : null

  // If viewing metadata, close when workflow changes
  useEffect(() => {
    setSelectedMetadata(null)
  }, [activeWorkflow])

  // Listen for metadata selection from image nodes
  useEffect(() => {
    const handleMetadataSelected = (e: any) => {
      const { metadata, nodeId } = e.detail
      setSelectedMetadata(metadata)
      setSelectedNodeId(nodeId)
    }

    window.addEventListener("metadata-selected", handleMetadataSelected)
    return () => window.removeEventListener("metadata-selected", handleMetadataSelected)
  }, [])

  useEffect(() => {
    const update = () => {
      try {
        setQueueCount(workflowEngine.getActiveJobsCount())
      } catch {}
    }
    const interval = setInterval(update, 250)
    document.addEventListener("visibilitychange", update)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  useEffect(() => {
    if (!activeWorkflow) return
    ;(async () => {
      try {
        await putKV("lastActiveWorkflowId", activeWorkflow)
      } catch {}
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("active-workflow-id", activeWorkflow)
      }
    })()
  }, [activeWorkflow])

  // Warn user before page reload if queue has pending items
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const activeJobs = workflowEngine.getActiveJobsCount()
      if (activeJobs > 0) {
        e.preventDefault()
        e.returnValue = "" // Required for Chrome
        return "" // Required for some browsers
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        await useWorkflowStore.getState().hydrate()

        if (cancelled) return

        const ws = useWorkflowStore.getState().workflows
        const seeded = await getKV<boolean>("seeded")

        if (Object.keys(ws).length === 0 && !seeded) {
          await putKV("seeded", true)

          if (cancelled) return

          const id = useWorkflowStore.getState().createWorkflow("Workflow A")
          useWorkflowStore.getState().setNodes(id, [])
          useWorkflowStore.getState().setEdges(id, [])
        }

        if (cancelled) return

        const ids = Object.keys(useWorkflowStore.getState().workflows)

        let savedSession: string | null = null
        if (typeof window !== "undefined") {
          savedSession = window.sessionStorage.getItem("active-workflow-id")
        }

        let savedKv: string | null = null
        try {
          const kvSaved = await getKV<string>("lastActiveWorkflowId")
          savedKv = kvSaved || null
        } catch {}

        const preferred = savedSession && ws[savedSession] ? savedSession : savedKv
        const candidate = preferred && ws[preferred] ? preferred : ids[0] || null

        setActiveWorkflow(candidate)
      } catch (e) {
        console.error("App initialization failed:", e)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ReactFlowProvider>
      <div className="h-screen bg-background text-foreground flex flex-col">
        {/* Top Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-0 py-1 gap-4">
          <div className="flex items-center gap-2">
            <AtelierLogo className="h-8 w-auto text-foreground" />

            {activeWorkflow ? (
              <WorkflowSwitcher
                activeWorkflow={activeWorkflow}
                onWorkflowChange={setActiveWorkflow}
              />
            ) : (
              <div className="w-48 h-8 rounded-md bg-muted/50 animate-pulse" />
            )}

            <AddNodeMenu nodeTypes={NODE_TYPES} onAdd={handleAddNode} />

            <div className="flex items-center gap-1.5">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleRun()
                }}
                className="h-8 px-3 text-sm font-medium bg-white text-black hover:bg-gray-100 border-2 border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
                <Play className="w-4 h-4 mr-1.5" />
                run
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExecutionQueueOpen(!isExecutionQueueOpen)}
                className="h-8 gap-1.5 px-3 text-sm border-accent/30 hover:border-accent hover:shadow-[0_0_10px_rgba(64,224,208,0.3)] transition-all duration-300"
              >
                <span>queue</span>
                <Badge
                  variant={queueCount > 0 ? "default" : "secondary"}
                  className={`min-w-[18px] h-3.5 flex items-center justify-center px-1 font-mono text-[10px] ${
                    queueCount > 0
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {queueCount}
                </Badge>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage === "media" ? "canvas" : "media")}
                className={`h-8 gap-1.5 px-3 text-sm border-accent/30 hover:border-accent hover:shadow-[0_0_10px_rgba(64,224,208,0.3)] transition-all duration-300 ${
                  currentPage === "media" ? "bg-accent/10 border-accent" : ""
                }`}
              >
                <span>media</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CanvasControls />
            <MiniMap
              className="bg-card/90 backdrop-blur-sm rounded-md"
              nodeColor="#ff0080"
              maskColor="rgba(0, 0, 0, 0.6)"
              style={{ position: "static", width: 75, height: 32, margin: 0 }}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {currentPage === "canvas" ? (
            <div className="flex-1 relative">
              {activeWorkflow && (
                <NodeGraphCanvas
                  activeWorkflow={activeWorkflow}
                  onExecute={handleRun}
                  executionStatus={executionStatus}
                  onStatusChange={setExecutionStatus}
                  queueCount={queueCount}
                  onCanvasDoubleClick={(pos) => setContextMenuPosition(pos)}
                  onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
                  onPaneClick={() => setSelectedNodeId(null)}
                  selectedNodeId={selectedNodeId}
                />
              )}
            </div>
          ) : (
            <MediaManager
              onClose={() => setCurrentPage("canvas")}
              onSelectAsset={(assetId: string) => {
                console.log("Selected asset:", assetId)
              }}
            />
          )}
        </div>

        <footer className="hidden border-t border-border bg-card/50 backdrop-blur-sm px-6 py-3" />

        <NodeInspectorPanel
          isOpen={!!selectedNodeId || !!selectedMetadata}
          selectedNode={selectedNode || null}
          onClose={() => {
            setSelectedNodeId(null)
            setSelectedMetadata(null)
          }}
        >
          {selectedMetadata && selectedNodeId && activeWorkflow ? (
            <ExecutionInspector
              metadata={selectedMetadata}
              currentNodeId={selectedNodeId}
              currentWorkflowId={activeWorkflow}
            />
          ) : selectedNode?.type === "prompt" ? (
            <PromptInspector
              node={selectedNode}
              onChange={(cfg) => {
                if (activeWorkflow) {
                  workflowStore.updateNodeConfig(activeWorkflow, selectedNode.id, cfg)
                }
              }}
            />
          ) : selectedNode?.type === "image-gen" || selectedNode?.type === "image-edit" ? (
            <ImageInspector
              node={selectedNode}
              onChange={(cfg) => {
                if (activeWorkflow) {
                  workflowStore.updateNodeConfig(activeWorkflow, selectedNode.id, cfg)
                }
              }}
            />
          ) : null}
        </NodeInspectorPanel>

        <ExecutionQueue
          isOpen={isExecutionQueueOpen}
          onClose={() => setIsExecutionQueueOpen(false)}
          onWorkflowChange={setActiveWorkflow}
        />

        <ConnectProvider open={isConnectOpen} onOpenChange={setIsConnectOpen} />

        {/* Context Menu for Add Node (appears on double-click) */}
        {contextMenuPosition && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenuPosition(null)} />
            <div
              className="fixed z-50 w-64 bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-lg p-1"
              style={{
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
              }}
            >
              <AddNodeMenuItems
                nodeTypes={NODE_TYPES}
                onAdd={(id) => {
                  handleAddNode(id, {
                    x: contextMenuPosition.canvasX,
                    y: contextMenuPosition.canvasY,
                  })
                  setContextMenuPosition(null)
                }}
                variant="context"
              />
            </div>
          </>
        )}
      </div>
    </ReactFlowProvider>
  )
}
