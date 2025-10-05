"use client"

import { useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { X, Check } from "lucide-react"

interface WorkflowDeletePopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workflowName: string
  onDelete: () => void
  trigger: React.ReactNode
}

export function WorkflowDeletePopover({
  isOpen,
  onOpenChange,
  workflowName,
  onDelete,
  trigger,
}: WorkflowDeletePopoverProps) {
  useEffect(() => {
    if (isOpen) {
      // Auto-focus could be added here if needed
    }
  }, [isOpen])

  const handleDelete = () => {
    onDelete()
    onOpenChange(false)
  }

  const handleCancel = () => {
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
        <div className="space-y-3">
          <div className="text-sm">
            <p className="font-medium mb-1">delete &quot;{workflowName}&quot;?</p>
            <p className="text-muted-foreground text-xs">does not delete your media</p>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 px-3">
              <X className="w-4 h-4 mr-1" />
              cancel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-3 text-red-500 hover:text-red-500 hover:bg-red-500/10"
            >
              <Check className="w-4 h-4 mr-1" />
              delete
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
