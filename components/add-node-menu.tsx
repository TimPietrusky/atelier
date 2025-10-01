"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import type { NodeTypeDef } from "@/components/add-node-dialog"
import { AddNodeMenuItems } from "@/components/add-node-menu-items"

interface AddNodeMenuProps {
  nodeTypes: NodeTypeDef[]
  onAdd: (id: string) => void
}

export function AddNodeMenu({ nodeTypes, onAdd }: AddNodeMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

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
      <DropdownMenuContent align="center" className="w-64 p-1">
        <AddNodeMenuItems
          nodeTypes={nodeTypes}
          onAdd={(id) => {
            onAdd(id)
            setIsOpen(false)
          }}
          variant="dropdown"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
