"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  WorkflowIcon,
  MoreVertical,
  Pencil,
  Plus,
  Download,
  Upload,
  Trash,
  Copy,
} from "lucide-react"
import { WorkflowCreatePopover } from "@/components/workflow-create-popover"
import { WorkflowRenamePopover } from "@/components/workflow-rename-popover"
import { WorkflowDeletePopover } from "@/components/workflow-delete-popover"
import { workflowStore, type Workflow as WorkflowDoc } from "@/lib/store/workflows"
import { putKV } from "@/lib/store/db"

interface WorkflowSwitcherProps {
  activeWorkflow: string
  onWorkflowChange: (workflow: string) => void
}

export function WorkflowSwitcher({ activeWorkflow, onWorkflowChange }: WorkflowSwitcherProps) {
  const [workflows, setWorkflows] = useState<WorkflowDoc[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const currentWorkflow = workflows.find((w) => w.id === activeWorkflow)

  const handleCreateWorkflow = (name: string) => {
    const wf = workflowStore.create(name)
    setWorkflows(workflowStore.list())
    onWorkflowChange(wf.id)
  }

  const handleRenameWorkflow = (name: string) => {
    if (activeWorkflow) {
      workflowStore.rename(activeWorkflow, name)
      setWorkflows(workflowStore.list())
    }
  }

  const handleCloneWorkflow = () => {
    if (!activeWorkflow) return
    const workflow = workflowStore.get(activeWorkflow)
    if (!workflow) return

    // Clone workflow with new IDs but same asset references
    const timestamp = Date.now()
    const clonedId = `${workflow.name.toLowerCase().replace(/\s+/g, "-")}-clone-${timestamp}`

    // Map old node IDs to new node IDs
    const nodeIdMap = new Map<string, string>()
    workflow.nodes.forEach((node) => {
      const newNodeId = `${node.type}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
      nodeIdMap.set(node.id, newNodeId)
    })

    // Clone nodes with new IDs but keep asset references
    const clonedNodes = workflow.nodes.map((node) => ({
      ...node,
      id: nodeIdMap.get(node.id)!,
      // Keep result and resultHistory with same assetRefs (assets are shared)
    }))

    // Clone edges with updated node IDs
    const clonedEdges = (workflow.edges || []).map((edge) => ({
      ...edge,
      id: `edge-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      source: nodeIdMap.get(edge.source)!,
      target: nodeIdMap.get(edge.target)!,
    }))

    // Create the cloned workflow
    const cloned: typeof workflow = {
      id: clonedId,
      name: `${workflow.name} (Copy)`,
      nodes: clonedNodes,
      edges: clonedEdges,
      viewport: workflow.viewport,
      chat: [],
      history: [],
    }

    workflowStore.upsert(cloned)
    setWorkflows(workflowStore.list())
    onWorkflowChange(clonedId)
  }

  const handleExport = async () => {
    const workflow = workflows.find((w) => w.id === activeWorkflow)
    if (!workflow) return

    // For now, export as JSON until we implement ZIP
    const exportData = {
      packageVersion: 1,
      app: { name: "atelier", version: "0.1.0" },
      createdAt: new Date().toISOString(),
      workflow: {
        id: workflow.id,
        name: workflow.name,
      },
      data: workflow,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflow.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.atelier.jetzt.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".atelier.jetzt.json,.json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text)

        console.log("[import] Imported data:", imported)
        console.log("[import] Workflow data:", imported.data)
        console.log("[import] Nodes:", imported.data?.nodes?.length || 0)
        console.log("[import] Edges:", imported.data?.edges?.length || 0)

        // Check if workflow with this ID already exists
        const existing = workflows.find((w) => w.id === imported.data.id)

        if (existing) {
          const shouldOverwrite = confirm(
            `Workflow "${existing.name}" already exists. Overwrite it? (Cancel to import as new workflow)`
          )

          if (shouldOverwrite) {
            // Overwrite existing
            workflowStore.upsert({
              ...imported.data,
              id: existing.id, // Keep existing ID
            })
            onWorkflowChange(existing.id)
          } else {
            // Fork: create new workflow with same data but new ID and name
            const newId = `${imported.data.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`
            const forked = {
              id: newId,
              name: `${imported.data.name} (copy)`,
              nodes: imported.data.nodes || [],
              edges: imported.data.edges || [],
              viewport: imported.data.viewport,
              chat: imported.data.chat || [],
              history: imported.data.history || [],
            }
            console.log("[import] Creating forked workflow:", forked)
            workflowStore.upsert(forked)
            console.log("[import] After upsert, workflows:", workflowStore.list())
            onWorkflowChange(newId)
            console.log("[import] Switched to workflow:", newId)
          }
        } else {
          // No conflict, import as-is
          workflowStore.upsert(imported.data)
          onWorkflowChange(imported.data.id)
        }

        setWorkflows(workflowStore.list())
      } catch (err) {
        console.error("Import failed:", err)
        alert("Failed to import workflow")
      }
    }
    input.click()
  }

  const handleDeleteConfirm = () => {
    const wf = workflows.find((w) => w.id === activeWorkflow)
    if (!wf) return
    workflowStore.remove(wf.id)
    // Choose fallback workflow: first remaining or create new
    const remaining = workflowStore.list()
    if (remaining.length > 0) {
      onWorkflowChange(remaining[0].id)
    } else {
      const created = workflowStore.create("untitled")
      onWorkflowChange(created.id)
    }
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("active-workflow-id", workflowStore.list()[0]?.id || "")
      }
      const nextId = workflowStore.list()[0]?.id
      if (nextId) void putKV("lastActiveWorkflowId", nextId)
    } catch {}
    setIsDeleteDialogOpen(false)
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
          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false)
              setIsCreateOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            new
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false)
              setIsRenameOpen(true)
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            rename
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false)
              handleCloneWorkflow()
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            clone
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false)
              handleExport()
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            export
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false)
              handleImport()
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            import
          </DropdownMenuItem>

          <div className="h-px my-1 bg-border/50" />

          <DropdownMenuItem
            className="text-red-500 focus:text-red-500"
            onClick={() => {
              setIsDropdownOpen(false)
              setIsDeleteDialogOpen(true)
            }}
          >
            <Trash className="w-4 h-4 mr-2" />
            delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkflowCreatePopover
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={handleCreateWorkflow}
        trigger={<div />}
      />

      <WorkflowRenamePopover
        isOpen={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        currentName={currentWorkflow?.name || ""}
        onRename={handleRenameWorkflow}
        trigger={<div />}
      />

      <WorkflowDeletePopover
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        workflowName={currentWorkflow?.name || ""}
        onDelete={handleDeleteConfirm}
        trigger={<div />}
      />
    </div>
  )
}
