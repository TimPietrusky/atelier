"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, GripVertical, MessageSquare, ImageIcon } from "lucide-react"
import type { WorkflowNode } from "@/lib/workflow-engine"

interface NodeInspectorPanelProps {
  isOpen: boolean
  selectedNode: WorkflowNode | null
  onClose: () => void
  children?: React.ReactNode
}

export function NodeInspectorPanel({
  isOpen,
  selectedNode,
  onClose,
  children,
}: NodeInspectorPanelProps) {
  const [width, setWidth] = useState(280)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Load width from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("inspector-panel-width")
      if (saved) setWidth(Number(saved))
    } catch {}
  }, [])

  // Save width to sessionStorage when changed
  useEffect(() => {
    try {
      sessionStorage.setItem("inspector-panel-width", String(width))
    } catch {}
  }, [width])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const newWidth = e.clientX
      // Clamp between 240px and 600px
      setWidth(Math.max(240, Math.min(600, newWidth)))
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

  if (!isOpen || !selectedNode) return null

  // Get node icon based on type
  const getNodeIcon = () => {
    switch (selectedNode.type) {
      case "prompt":
        return <MessageSquare className="w-4 h-4 text-blue-500" />
      case "image-gen":
      case "image-edit":
        return <ImageIcon className="w-4 h-4 text-purple-500" />
      default:
        return null
    }
  }

  return (
    <div
      ref={panelRef}
      className="fixed top-[40px] left-0 h-[calc(100vh-40px)] bg-card/95 backdrop-blur-sm border-r border-border shadow-2xl z-50 flex transition-transform duration-200"
      style={{ width: `${width}px` }}
    >
      {/* Panel Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {getNodeIcon()}
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="text-sm font-semibold text-card-foreground truncate">
                {selectedNode.title.toLowerCase()}
              </h2>
              <span className="text-[10px] text-muted-foreground/60 font-mono truncate">
                {selectedNode.id}
              </span>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">{children}</div>
        </ScrollArea>
      </div>

      {/* Resize Handle */}
      <div
        className="w-1 bg-border hover:bg-primary/50 cursor-ew-resize flex items-center justify-center group transition-colors"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
