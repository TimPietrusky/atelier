"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WorkflowIcon, MoreVertical, Pencil, Plus } from "lucide-react"
import { workflowStore, type Workflow as WorkflowDoc } from "@/lib/store/workflows"
import { putKV } from "@/lib/store/db"

interface WorkflowSwitcherProps {
  activeWorkflow: string
  onWorkflowChange: (workflow: string) => void
}

export function WorkflowSwitcher({ activeWorkflow, onWorkflowChange }: WorkflowSwitcherProps) {
  const [workflows, setWorkflows] = useState<WorkflowDoc[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState("")
  const [renameWorkflowName, setRenameWorkflowName] = useState("")

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      const wf = workflowStore.create(newWorkflowName)
      setNewWorkflowName("")
      setIsCreateDialogOpen(false)
      setWorkflows(workflowStore.list())
      onWorkflowChange(wf.id)
    }
  }

  const handleRenameWorkflow = () => {
    if (renameWorkflowName.trim() && activeWorkflow) {
      workflowStore.rename(activeWorkflow, renameWorkflowName)
      setRenameWorkflowName("")
      setIsRenameDialogOpen(false)
      setWorkflows(workflowStore.list())
    }
  }

  const handleOpenRenameDialog = () => {
    const currentWorkflow = workflows.find((w) => w.id === activeWorkflow)
    if (currentWorkflow) {
      setRenameWorkflowName(currentWorkflow.name)
      setIsRenameDialogOpen(true)
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

      <DropdownMenu>
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
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            new
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenRenameDialog}>
            <Pencil className="w-4 h-4 mr-2" />
            rename
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateWorkflow()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkflow}>Create Workflow</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-workflow-name">Workflow Name</Label>
              <Input
                id="rename-workflow-name"
                value={renameWorkflowName}
                onChange={(e) => setRenameWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameWorkflow()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameWorkflow}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
