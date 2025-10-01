"use client"

import { useState, useEffect, useRef } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Check } from "lucide-react"

interface WorkflowRenamePopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (name: string) => void
  trigger: React.ReactNode
}

export function WorkflowRenamePopover({
  isOpen,
  onOpenChange,
  currentName,
  onRename,
  trigger,
}: WorkflowRenamePopoverProps) {
  const [workflowName, setWorkflowName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setWorkflowName(currentName)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, currentName])

  const handleRename = () => {
    if (workflowName.trim()) {
      onRename(workflowName)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setWorkflowName(currentName)
    onOpenChange(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-64 p-3 z-[100] border-b border-border"
        onInteractOutside={(e) => {
          // Only close on explicit user action, not when dropdown closes
          if ((e.target as Element).closest('[data-slot="dropdown-menu-content"]')) {
            e.preventDefault()
          }
        }}
      >
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name..."
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
              else if (e.key === "Escape") handleCancel()
            }}
          />
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 w-7 p-0">
              <X className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRename}
              className="h-7 w-7 p-0"
              disabled={!workflowName.trim()}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
