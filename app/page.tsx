"use client"

import { useEffect, useState } from "react"
import { ReactFlowProvider, MiniMap } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WorkflowSwitcher } from "@/components/workflow-switcher"
import { NodeGraphCanvas } from "@/components/node-graph-canvas"
import { MediaManager } from "@/components/media-manager"
import { ExecutionQueue } from "@/components/execution-queue"
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
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false)
  const [isExecutionQueueOpen, setIsExecutionQueueOpen] = useState(false)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(
    null
  )
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "paused">("idle")
  const [queueCount, setQueueCount] = useState(0)
  const handleAddNode = (nodeType: string) => {
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
          position: {
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

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      console.log("[v0] App initialization started")
      try {
        console.log("[v0] Starting hydration from storage...")
        await useWorkflowStore.getState().hydrate()
        console.log("[v0] Hydration completed successfully")

        if (cancelled) {
          console.log("[v0] Init cancelled (component unmounted)")
          return
        }

        const ws = useWorkflowStore.getState().workflows
        console.log("[v0] Workflows loaded:", Object.keys(ws).length, "workflows")

        const seeded = await getKV<boolean>("seeded")
        console.log("[v0] Seeded flag:", seeded)

        if (Object.keys(ws).length === 0 && !seeded) {
          console.log("[v0] No workflows found, creating default workflow...")
          await putKV("seeded", true)

          if (cancelled) {
            console.log("[v0] Init cancelled after seeding flag (component unmounted)")
            return
          }

          const id = useWorkflowStore.getState().createWorkflow("Workflow A")
          console.log("[v0] Created default workflow with id:", id)
          useWorkflowStore.getState().setNodes(id, [])
          useWorkflowStore.getState().setEdges(id, [])
          console.log("[v0] Default workflow initialized")
        }

        if (cancelled) {
          console.log("[v0] Init cancelled before setting active workflow")
          return
        }

        const ids = Object.keys(useWorkflowStore.getState().workflows)
        console.log("[v0] Available workflow IDs:", ids)

        let savedSession: string | null = null
        if (typeof window !== "undefined") {
          savedSession = window.sessionStorage.getItem("active-workflow-id")
          console.log("[v0] Session storage active workflow:", savedSession)
        }

        let savedKv: string | null = null
        try {
          const kvSaved = await getKV<string>("lastActiveWorkflowId")
          savedKv = kvSaved || null
          console.log("[v0] KV storage active workflow:", savedKv)
        } catch (e) {
          console.warn("[v0] Failed to get KV active workflow:", e)
        }

        const preferred = savedSession && ws[savedSession] ? savedSession : savedKv
        const candidate = preferred && ws[preferred] ? preferred : ids[0] || null

        console.log("[v0] Selected active workflow:", candidate)
        setActiveWorkflow(candidate)
        console.log("[v0] App initialization completed successfully")
      } catch (e) {
        console.error("[v0] App initialization failed:", e)
      }
    }

    init()

    return () => {
      console.log("[v0] App component unmounting")
      cancelled = true
    }
  }, [])

  return (
    <ReactFlowProvider>
      <div className="h-screen bg-background text-foreground flex flex-col">
        {/* Top Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-2 py-1 gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-rainbow mr-2">atelier</h1>

            {activeWorkflow ? (
              <WorkflowSwitcher
                activeWorkflow={activeWorkflow}
                onWorkflowChange={setActiveWorkflow}
              />
            ) : (
              <div className="w-48 h-8 rounded-md bg-muted/50 animate-pulse" />
            )}

            <div className="h-5 w-px bg-border/50" />

            <div className="flex items-center gap-1.5">
              <Button
                onClick={handleRun}
                className="h-8 px-3 text-sm font-medium bg-white text-black hover:bg-gray-100 border-2 border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
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
            </div>
          </div>

          <AddNodeMenu nodeTypes={NODE_TYPES} onAdd={handleAddNode} />

          <div className="flex items-center gap-0.5 h-8">
            <CanvasControls />
            <MiniMap
              className="bg-card/90 backdrop-blur-sm rounded-md"
              nodeColor="#ff0080"
              maskColor="rgba(0, 0, 0, 0.6)"
              style={{ position: "static", width: 75, height: 32 }}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          <div className="flex-1 relative">
            {activeWorkflow && (
              <NodeGraphCanvas
                activeWorkflow={activeWorkflow}
                onExecute={handleRun}
                executionStatus={executionStatus}
                onStatusChange={setExecutionStatus}
                queueCount={queueCount}
                onCanvasDoubleClick={(pos) => setContextMenuPosition(pos)}
              />
            )}
          </div>
        </div>

        <footer className="hidden border-t border-border bg-card/50 backdrop-blur-sm px-6 py-3" />

        {isMediaManagerOpen && <MediaManager onClose={() => setIsMediaManagerOpen(false)} />}

        <ExecutionQueue
          isOpen={isExecutionQueueOpen}
          onClose={() => setIsExecutionQueueOpen(false)}
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
                  handleAddNode(id)
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
