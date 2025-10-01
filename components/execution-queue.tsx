"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, Play, X, AlertCircle, CheckCircle, GripVertical, Loader2 } from "lucide-react"
import { workflowEngine, type WorkflowExecution } from "@/lib/workflow-engine"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"

interface ExecutionQueueProps {
  isOpen: boolean
  onClose: () => void
}

export function ExecutionQueueComponent({ isOpen, onClose }: ExecutionQueueProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [width, setWidth] = useState(480)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const workflows = useWorkflowStore((s) => s.workflows)

  useEffect(() => {
    // Populate immediately for instant feedback, then poll
    setExecutions(workflowEngine.getAllExecutions())
    setQueue(workflowEngine.getQueue())
    if (!isOpen) return
    const interval = setInterval(() => {
      setExecutions(workflowEngine.getAllExecutions())
      setQueue(workflowEngine.getQueue())
    }, 300)
    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const newWidth = window.innerWidth - e.clientX
      // Clamp between 320px and 800px
      setWidth(Math.max(320, Math.min(800, newWidth)))
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isOpen])

  const handleResizeStart = () => {
    isDraggingRef.current = true
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"
  }

  const getStatusIcon = (status: WorkflowExecution["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-destructive" />
      case "running":
        return <Play className="w-4 h-4 text-primary animate-pulse" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: WorkflowExecution["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-destructive"
      case "running":
        return "bg-primary"
      default:
        return "bg-muted"
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(3)}`
  }

  const getWorkflowDisplay = (workflowId: string, startTime?: Date) => {
    const workflow = workflows[workflowId]
    const name = workflow?.name || workflowId.slice(0, 12)

    // Format timestamp as HH:MM:SS
    const timestamp = startTime
      ? new Date(startTime).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : ""

    return { name, timestamp }
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="fixed top-[40px] right-0 h-[calc(100vh-40px)] bg-card/95 backdrop-blur-sm border-l border-border shadow-2xl z-50 flex"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className="w-1 bg-border hover:bg-primary/50 cursor-ew-resize flex items-center justify-center group transition-colors"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-card-foreground">queue</h2>
            <Badge variant="outline" className="text-xs h-5">
              {queue.length + executions.filter((e) => e.status === "running").length}
            </Badge>
          </div>

          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Current Executions */}
          <div className="flex-1 px-3 py-2 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1.5 pr-2">
                {executions.length === 0 && queue.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">empty</p>
                  </div>
                ) : (
                  <>
                    {executions.map((execution) => {
                      const { name, timestamp } = getWorkflowDisplay(execution.workflowId, execution.startTime)

                      return (
                        <div
                          key={execution.id}
                          className="px-2 py-1.5 rounded bg-background/50 border border-border/50 hover:border-border transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {execution.status === "running" ? (
                              <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />
                            ) : (
                              <div
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(execution.status)}`}
                              />
                            )}
                            <span className="text-xs text-card-foreground truncate flex-1 font-mono">{name}</span>
                            {timestamp && (
                              <span className="text-[10px] text-muted-foreground/60 font-mono">{timestamp}</span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatCost(execution.actualCost || execution.estimatedCost)}
                            </span>
                          </div>

                          {execution.error && (
                            <p className="text-destructive text-xs mt-1 truncate">{execution.error}</p>
                          )}
                        </div>
                      )
                    })}

                    {queue.map((item, index) => {
                      const { name } = getWorkflowDisplay(item.workflowId)

                      return (
                        <div key={item.id} className="px-2 py-1.5 rounded bg-muted/30 border border-border/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                            <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{name}</span>
                            <span className="text-xs text-muted-foreground">{formatCost(item.estimatedCost)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="px-3 py-2 border-t border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-mono">
                {formatCost(executions.reduce((sum, e) => sum + (e.actualCost || e.estimatedCost), 0))}
              </span>

              <span className="text-muted-foreground">
                ✓ {executions.filter((e) => e.status === "completed").length}
              </span>

              <span className="text-muted-foreground">✗ {executions.filter((e) => e.status === "failed").length}</span>
            </div>

            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
              clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ExecutionQueueComponent as ExecutionQueue }
