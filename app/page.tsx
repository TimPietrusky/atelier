"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WorkflowSwitcher } from "@/components/workflow-switcher"
import { NodeGraphCanvas } from "@/components/node-graph-canvas"
import { MediaManager } from "@/components/media-manager"
import { ExecutionQueue } from "@/components/execution-queue"
import { ConnectProvider } from "@/components/connect-provider"
import { workflowStore } from "@/lib/store/workflows"
import { workflowEngine } from "@/lib/workflow-engine"
import { getKV, putKV } from "@/lib/store/db"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"

export default function StudioDashboard() {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false)
  const [isExecutionQueueOpen, setIsExecutionQueueOpen] = useState(false)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "paused">("idle")
  const [queueCount, setQueueCount] = useState(0)

  const handleRun = () => {
    if (!activeWorkflow) return
    const wf = workflowStore.get(activeWorkflow)
    if (wf) {
      workflowEngine.executeWorkflow(wf.id, wf.nodes)
      // update immediately after enqueue so footer shows correct count instantly
      setQueueCount(workflowEngine.getActiveJobsCount())
      // force a small UI tick to refresh node statuses quickly
      try {
        const next = workflowStore.get(activeWorkflow)
        workflowStore.upsert({ ...(next as any) })
      } catch {}
    }
  }

  useEffect(() => {
    // Faster polling for snappy UI; also update on visibilitychange instantly
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

  // On mount, ensure active workflow points to the last active one.
  // Prefer sessionStorage (most recent) then Dexie KV, then first available.
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

        // Seed default workflow if none exist - atomic check and set
        const seeded = await getKV<boolean>("seeded")
        console.log("[v0] Seeded flag:", seeded)

        if (Object.keys(ws).length === 0 && !seeded) {
          console.log("[v0] No workflows found, creating default workflow...")
          // Set flag FIRST to prevent race condition from Strict Mode double-invoke
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
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-2 flex items-center gap-3">
        {/* Logo */}
        <h1 className="text-lg font-bold text-rainbow">atelier</h1>

        {/* Workflow Switcher */}
        {activeWorkflow ? (
          <WorkflowSwitcher activeWorkflow={activeWorkflow} onWorkflowChange={setActiveWorkflow} />
        ) : (
          <div className="w-48 h-8 rounded-md bg-muted/50 animate-pulse" />
        )}

        {/* Run Button */}
        <Button
          onClick={handleRun}
          className="h-8 px-3 font-medium bg-white text-black hover:bg-gray-100 border-2 border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
        >
          run
        </Button>

        {/* Queue Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExecutionQueueOpen(!isExecutionQueueOpen)}
          className="h-8 gap-2 border-accent/30 hover:border-accent hover:shadow-[0_0_10px_rgba(64,224,208,0.3)] transition-all duration-300"
        >
          <span>queue</span>
          <Badge
            variant={queueCount > 0 ? "default" : "secondary"}
            className={`min-w-[20px] h-4 flex items-center justify-center px-1 font-mono text-xs ${
              queueCount > 0 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {queueCount}
          </Badge>
        </Button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Node Graph Canvas */}
        <div className="flex-1 relative">
          {activeWorkflow && (
            <NodeGraphCanvas
              activeWorkflow={activeWorkflow}
              onExecute={handleRun}
              executionStatus={executionStatus}
              onStatusChange={setExecutionStatus}
              queueCount={queueCount}
              isAddNodeModalOpen={isAddNodeModalOpen}
              setIsAddNodeModalOpen={setIsAddNodeModalOpen}
            />
          )}
        </div>
      </div>

      {/* Bottom Bar (hidden) */}
      <footer className="hidden border-t border-border bg-card/50 backdrop-blur-sm px-6 py-3" />

      {/* Media Manager Overlay */}
      {isMediaManagerOpen && <MediaManager onClose={() => setIsMediaManagerOpen(false)} />}

      {/* Execution Queue Overlay */}
      <ExecutionQueue isOpen={isExecutionQueueOpen} onClose={() => setIsExecutionQueueOpen(false)} />

      {/* Connect Provider */}
      <ConnectProvider open={isConnectOpen} onOpenChange={setIsConnectOpen} />
    </div>
  )
}
