"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import type { NodeTypeDef } from "@/components/add-node-dialog"

interface AddNodeMenuProps {
  nodeTypes: NodeTypeDef[]
  onAdd: (id: string) => void
}

export function AddNodeMenu({ nodeTypes, onAdd }: AddNodeMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getIconColor = (id: string) => {
    switch (id) {
      case "prompt":
        return "text-blue-500"
      case "image-gen":
        return "text-purple-500"
      case "video-gen":
        return "text-orange-500"
      case "background-replace":
        return "text-green-500"
      default:
        return "text-primary"
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 px-4 text-sm font-medium border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>add</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {nodeTypes.map((nt) => {
          const Icon = nt.icon
          return (
            <DropdownMenuItem
              key={nt.id}
              onClick={() => {
                onAdd(nt.id)
                setIsOpen(false)
              }}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <Icon className={`w-5 h-5 ${getIconColor(nt.id)} mt-0.5 flex-shrink-0`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{nt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{nt.description}</div>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
