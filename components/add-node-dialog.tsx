"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

export interface NodeTypeDef {
  id: string
  title: string
  icon: any
  description: string
}

export function AddNodeDialog({
  open,
  onOpenChange,
  nodeTypes,
  onAdd,
  showTrigger = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeTypes: NodeTypeDef[]
  onAdd: (id: string) => void
  showTrigger?: boolean
}) {
  const getIconStyle = (id: string) => {
    switch (id) {
      case "prompt":
        return { color: "var(--node-prompt)" }
      case "image-gen":
        return { color: "var(--node-image)" }
      case "text":
        return { color: "var(--node-prompt)" }
      default:
        return { color: "var(--text-secondary)" }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 px-4 py-2 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-white transition-all duration-200 bg-transparent text-white"
          >
            <Plus className="w-4 h-4" />
            add
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-border/50">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Add New Node</DialogTitle>
          <DialogDescription>Choose a node type to add to your workflow</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 mt-4">
          {nodeTypes.map((nt) => {
            const Icon = nt.icon
            return (
              <Button
                key={nt.id}
                variant="ghost"
                onClick={() => onAdd(nt.id)}
                className="flex items-start gap-3 p-4 h-auto text-left hover:bg-[var(--surface-elevated)] border border-transparent rounded-md transition-all duration-200"
              >
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={getIconStyle(nt.id)} />
                <div className="flex-1">
                  <div className="font-medium text-card-foreground">{nt.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{nt.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
