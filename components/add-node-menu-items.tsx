"use client"

import { Button } from "@/components/ui/button"
import type { NodeTypeDef } from "@/components/add-node-dialog"

interface AddNodeMenuItemsProps {
  nodeTypes: NodeTypeDef[]
  onAdd: (id: string) => void
  variant?: "dropdown" | "context"
}

export function AddNodeMenuItems({
  nodeTypes,
  onAdd,
  variant = "dropdown",
}: AddNodeMenuItemsProps) {
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

  // Same rendering for both variants
  return (
    <>
      {nodeTypes.map((nt) => {
        const Icon = nt.icon
        return (
          <div
            key={nt.id}
            onClick={() => onAdd(nt.id)}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--surface-elevated)] rounded text-white hover:text-white transition-colors"
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={getIconStyle(nt.id)} />
            <div className="font-medium text-sm lowercase">{nt.title}</div>
          </div>
        )
      })}
    </>
  )
}
