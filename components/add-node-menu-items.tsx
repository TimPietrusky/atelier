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

  // Same rendering for both variants
  return (
    <>
      {nodeTypes.map((nt) => {
        const Icon = nt.icon
        return (
          <div
            key={nt.id}
            onClick={() => onAdd(nt.id)}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-primary/10 rounded text-white hover:text-white transition-colors"
          >
            <Icon className={`w-4 h-4 ${getIconColor(nt.id)} flex-shrink-0`} />
            <div className="font-medium text-sm lowercase">{nt.title}</div>
          </div>
        )
      })}
    </>
  )
}
