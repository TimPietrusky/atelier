"use client"

import { useState, useRef, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Check } from "lucide-react"

interface WorkflowCreatePopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
  trigger: React.ReactNode
}

export function WorkflowCreatePopover({
  isOpen,
  onOpenChange,
  onCreate,
  trigger,
}: WorkflowCreatePopoverProps) {
  const [workflowName, setWorkflowName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleCreate = () => {
    if (workflowName.trim()) {
      onCreate(workflowName)
      setWorkflowName("")
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setWorkflowName("")
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
              if (e.key === "Enter") handleCreate()
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
              onClick={handleCreate}
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
