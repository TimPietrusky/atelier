"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Clock,
  Play,
  X,
  AlertCircle,
  CheckCircle,
  GripVertical,
  Loader2,
  MessageSquare,
  ChevronDown,
} from "lucide-react"
import { workflowEngine, type WorkflowExecution } from "@/lib/workflow-engine"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"

interface ExecutionQueueProps {
  isOpen: boolean
  onClose: () => void
  onWorkflowChange?: (workflowId: string) => void
}

export function ExecutionQueueComponent({
  isOpen,
  onClose,
  onWorkflowChange,
}: ExecutionQueueProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [width, setWidth] = useState(320)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const workflows = useWorkflowStore((s) => s.workflows)
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true)

  // Load completed section state from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("queue-completed-expanded")
      if (saved !== null) setIsCompletedExpanded(saved === "true")
    } catch {}
  }, [])

  // Save completed section state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("queue-completed-expanded", String(isCompletedExpanded))
    } catch {}
  }, [isCompletedExpanded])

  // Close expanded prompt when clicking outside
  useEffect(() => {
    if (!expandedPromptId) return
    const handleClickOutside = () => setExpandedPromptId(null)
    // Use queueMicrotask to avoid immediate close on the same click that opened it
    queueMicrotask(() => {
      document.addEventListener("click", handleClickOutside, { once: true })
    })
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [expandedPromptId])

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
      // Clamp between 280px and 600px
      setWidth(Math.max(280, Math.min(600, newWidth)))
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
                    {/* Running executions */}
                    {executions
                      .filter((e) => e.status === "running")
                      .map((execution) => {
                        const { name } = getWorkflowDisplay(
                          execution.workflowId,
                          execution.startTime
                        )

                        // Get snapshot from queuedSnapshots
                        const snapshot = workflowEngine.getQueueSnapshot?.(execution.id)
                        const configNodes =
                          snapshot?.nodes?.filter(
                            (n: any) =>
                              (n.type === "prompt" && n.config?.prompt) ||
                              (n.type === "image-gen" && n.config?.model)
                          ) || []
                        const hasConfig = configNodes.length > 0

                        return (
                          <div
                            key={execution.id}
                            className="px-2 py-1.5 rounded bg-background/50 border border-border/50 hover:border-border hover:bg-background/70 transition-colors cursor-pointer"
                            onClick={() => {
                              onWorkflowChange?.(execution.workflowId)
                            }}
                            title="Switch to this workflow"
                          >
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />
                              <span className="text-xs text-card-foreground truncate flex-1 font-mono">
                                {name}
                              </span>
                              {hasConfig && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedPromptId(
                                      expandedPromptId === execution.id ? null : execution.id
                                    )
                                  }}
                                  title="View settings"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              )}
                            </div>

                            {/* Expanded config details */}
                            {expandedPromptId === execution.id && configNodes.length > 0 && (
                              <div
                                className="mt-2 p-2 bg-muted/50 rounded border border-border/30 space-y-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {configNodes.map((node: any) => (
                                  <div key={node.id} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {node.title}
                                      </span>
                                      {node.config?.model && (
                                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                                          {node.config.model.split("/").pop()}
                                        </span>
                                      )}
                                    </div>
                                    {node.type === "prompt" && (
                                      <p className="text-xs text-card-foreground whitespace-pre-wrap break-words">
                                        {node.config?.prompt || "(empty)"}
                                      </p>
                                    )}
                                    {node.type === "image-gen" && node.config && (
                                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                                        {node.config.steps && <div>steps: {node.config.steps}</div>}
                                        {node.config.guidance && (
                                          <div>cfg: {node.config.guidance}</div>
                                        )}
                                        {node.config.seed && <div>seed: {node.config.seed}</div>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                    {/* Queued items */}
                    {queue.map((item, index) => {
                      const { name } = getWorkflowDisplay(item.workflowId)
                      // Get nodes with config from the snapshot (prompts and images)
                      const configNodes =
                        item.nodes?.filter(
                          (n: any) =>
                            (n.type === "prompt" && n.config?.prompt) ||
                            (n.type === "image-gen" && n.config?.model)
                        ) || []
                      const hasConfig = configNodes.length > 0

                      return (
                        <div
                          key={item.id}
                          className="px-2 py-1.5 rounded bg-muted/30 border border-border/30 hover:bg-muted/50 hover:border-border transition-colors cursor-pointer"
                          onClick={() => {
                            onWorkflowChange?.(item.workflowId)
                          }}
                          title="Switch to this workflow"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted-foreground/40" />
                            <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                              {name}
                            </span>
                            {hasConfig && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedPromptId(expandedPromptId === item.id ? null : item.id)
                                }}
                                title="View settings"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            )}
                          </div>

                          {/* Expanded config details */}
                          {expandedPromptId === item.id && configNodes.length > 0 && (
                            <div
                              className="mt-2 p-2 bg-muted/50 rounded border border-border/30 space-y-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {configNodes.map((node: any) => (
                                <div key={node.id} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {node.title}
                                    </span>
                                    {node.config?.model && (
                                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                                        {node.config.model.split("/").pop()}
                                      </span>
                                    )}
                                  </div>
                                  {node.type === "prompt" && (
                                    <p className="text-xs text-card-foreground whitespace-pre-wrap break-words">
                                      {node.config?.prompt || "(empty)"}
                                    </p>
                                  )}
                                  {node.type === "image-gen" && node.config && (
                                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                                      {node.config.steps && <div>steps: {node.config.steps}</div>}
                                      {node.config.guidance && (
                                        <div>cfg: {node.config.guidance}</div>
                                      )}
                                      {node.config.seed && <div>seed: {node.config.seed}</div>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Completed/Failed section - collapsible */}
                    {executions.filter((e) => e.status === "completed" || e.status === "failed")
                      .length > 0 && (
                      <>
                        <div className="my-2 border-t border-border/30" />
                        <button
                          className="w-full px-2 py-1 flex items-center gap-2 text-xs text-muted-foreground hover:text-card-foreground transition-colors"
                          onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              isCompletedExpanded ? "" : "-rotate-90"
                            }`}
                          />
                          <span>
                            completed (
                            {
                              executions.filter(
                                (e) => e.status === "completed" || e.status === "failed"
                              ).length
                            }
                            )
                          </span>
                        </button>
                        {isCompletedExpanded &&
                          executions
                            .filter((e) => e.status === "completed" || e.status === "failed")
                            .sort((a, b) => {
                              const timeA = a.endTime?.getTime() || 0
                              const timeB = b.endTime?.getTime() || 0
                              return timeB - timeA // Most recent first
                            })
                            .map((execution) => {
                              const { name, timestamp } = getWorkflowDisplay(
                                execution.workflowId,
                                execution.startTime
                              )

                              const snapshot = workflowEngine.getQueueSnapshot?.(execution.id)
                              const configNodes =
                                snapshot?.nodes?.filter(
                                  (n: any) =>
                                    (n.type === "prompt" && n.config?.prompt) ||
                                    (n.type === "image-gen" && n.config?.model)
                                ) || []
                              const hasConfig = configNodes.length > 0

                              return (
                                <div
                                  key={execution.id}
                                  className="px-2 py-1.5 rounded bg-background/50 border border-border/50 hover:border-border hover:bg-background/70 transition-colors cursor-pointer opacity-60"
                                  onClick={() => {
                                    onWorkflowChange?.(execution.workflowId)
                                  }}
                                  title="Switch to this workflow"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(
                                        execution.status
                                      )}`}
                                    />
                                    <span className="text-xs text-card-foreground truncate flex-1 font-mono">
                                      {name}
                                    </span>
                                    {hasConfig && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setExpandedPromptId(
                                            expandedPromptId === execution.id ? null : execution.id
                                          )
                                        }}
                                        title="View settings"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>

                                  {/* Expanded config details with timestamp and error */}
                                  {expandedPromptId === execution.id && (
                                    <div
                                      className="mt-2 p-2 bg-muted/50 rounded border border-border/30 space-y-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {timestamp && (
                                        <div className="text-[10px] text-muted-foreground/60 font-mono pb-1 border-b border-border/20">
                                          {timestamp}
                                        </div>
                                      )}
                                      {configNodes.map((node: any) => (
                                        <div key={node.id} className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                              {node.title}
                                            </span>
                                            {node.config?.model && (
                                              <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                {node.config.model.split("/").pop()}
                                              </span>
                                            )}
                                          </div>
                                          {node.type === "prompt" && (
                                            <p className="text-xs text-card-foreground whitespace-pre-wrap break-words">
                                              {node.config?.prompt || "(empty)"}
                                            </p>
                                          )}
                                          {node.type === "image-gen" && node.config && (
                                            <div className="text-[10px] text-muted-foreground space-y-0.5">
                                              {node.config.steps && (
                                                <div>steps: {node.config.steps}</div>
                                              )}
                                              {node.config.guidance && (
                                                <div>cfg: {node.config.guidance}</div>
                                              )}
                                              {node.config.seed && (
                                                <div>seed: {node.config.seed}</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {execution.error && (
                                        <p className="text-destructive text-xs mt-1 truncate">
                                          {execution.error}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                      </>
                    )}
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
              <span className="text-muted-foreground">
                ✓ {executions.filter((e) => e.status === "completed").length}
              </span>

              <span className="text-muted-foreground">
                ✗ {executions.filter((e) => e.status === "failed").length}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                workflowEngine.clearExecutions()
                setExecutions(workflowEngine.getAllExecutions())
              }}
            >
              clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ExecutionQueueComponent as ExecutionQueue }
