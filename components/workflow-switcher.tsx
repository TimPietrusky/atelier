"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { WorkflowIcon, MoreVertical, Pencil, Plus, X, Check } from "lucide-react"
import { workflowStore, type Workflow as WorkflowDoc } from "@/lib/store/workflows"
import { putKV } from "@/lib/store/db"

interface WorkflowSwitcherProps {
  activeWorkflow: string
  onWorkflowChange: (workflow: string) => void
}

export function WorkflowSwitcher({ activeWorkflow, onWorkflowChange }: WorkflowSwitcherProps) {
  const [workflows, setWorkflows] = useState<WorkflowDoc[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreatePopoverOpen, setIsCreatePopoverOpen] = useState(false)
  const [isRenamePopoverOpen, setIsRenamePopoverOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState("")
  const [renameWorkflowName, setRenameWorkflowName] = useState("")

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      const wf = workflowStore.create(newWorkflowName)
      setNewWorkflowName("")
      setIsCreatePopoverOpen(false)
      setWorkflows(workflowStore.list())
      onWorkflowChange(wf.id)
    }
  }

  const handleCancelCreate = () => {
    setNewWorkflowName("")
    setIsCreatePopoverOpen(false)
  }

  const handleRenameWorkflow = () => {
    if (renameWorkflowName.trim() && activeWorkflow) {
      workflowStore.rename(activeWorkflow, renameWorkflowName)
      setRenameWorkflowName("")
      setIsRenamePopoverOpen(false)
      setWorkflows(workflowStore.list())
    }
  }

  const handleCancelRename = () => {
    setRenameWorkflowName("")
    setIsRenamePopoverOpen(false)
  }

  const handleOpenRenamePopover = () => {
    const currentWorkflow = workflows.find((w) => w.id === activeWorkflow)
    if (currentWorkflow) {
      setRenameWorkflowName(currentWorkflow.name)
      setIsRenamePopoverOpen(true)
    }
  }

  useEffect(() => {
    setWorkflows(workflowStore.list())
    const unsub = workflowStore.subscribe(() => setWorkflows(workflowStore.list()))
    return () => unsub()
  }, [])

  return (
    <div className="flex items-center h-8 rounded-md border border-border/50 bg-background/50 overflow-hidden">
      <Select
        value={activeWorkflow}
        onValueChange={(val) => {
          onWorkflowChange(val)
          try {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("active-workflow-id", val)
            }
            void putKV("lastActiveWorkflowId", val)
          } catch {}
        }}
      >
        <SelectTrigger className="w-44 h-full border-0 bg-transparent rounded-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
          <div className="flex items-center gap-2">
            <WorkflowIcon className="w-4 h-4 text-primary" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {workflows.map((workflow) => (
            <SelectItem key={workflow.id} value={workflow.id}>
              {workflow.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-5 w-px bg-border/50" />

      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-full px-2 rounded-none hover:bg-white/10 border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Popover open={isCreatePopoverOpen} onOpenChange={setIsCreatePopoverOpen}>
            <PopoverTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setIsDropdownOpen(false)
                  setIsCreatePopoverOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                new
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3">
              <div className="space-y-2">
                <Input
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="Workflow name..."
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateWorkflow()
                    } else if (e.key === "Escape") {
                      handleCancelCreate()
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCancelCreate} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateWorkflow}
                    className="h-7 w-7 p-0"
                    disabled={!newWorkflowName.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={isRenamePopoverOpen} onOpenChange={setIsRenamePopoverOpen}>
            <PopoverTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setIsDropdownOpen(false)
                  handleOpenRenamePopover()
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                rename
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3">
              <div className="space-y-2">
                <Input
                  value={renameWorkflowName}
                  onChange={(e) => setRenameWorkflowName(e.target.value)}
                  placeholder="Workflow name..."
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRenameWorkflow()
                    } else if (e.key === "Escape") {
                      handleCancelRename()
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCancelRename} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRenameWorkflow}
                    className="h-7 w-7 p-0"
                    disabled={!renameWorkflowName.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
