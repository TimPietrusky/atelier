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

  if (variant === "dropdown") {
    // For DropdownMenuItem usage
    return (
      <>
        {nodeTypes.map((nt) => {
          const Icon = nt.icon
          return (
            <div
              key={nt.id}
              onClick={() => onAdd(nt.id)}
              className="flex items-start gap-3 p-3 cursor-pointer hover:bg-primary/10 rounded"
            >
              <Icon className={`w-5 h-5 ${getIconColor(nt.id)} mt-0.5 flex-shrink-0`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{nt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{nt.description}</div>
              </div>
            </div>
          )
        })}
      </>
    )
  }

  // For context menu (Button variant)
  return (
    <>
      {nodeTypes.map((nt) => {
        const Icon = nt.icon
        return (
          <Button
            key={nt.id}
            variant="ghost"
            onClick={() => onAdd(nt.id)}
            className="w-full justify-start gap-3 p-3 h-auto text-left hover:bg-primary/10"
          >
            <Icon className={`w-5 h-5 ${getIconColor(nt.id)} flex-shrink-0`} />
            <div className="flex-1">
              <div className="font-medium text-sm">{nt.title}</div>
              <div className="text-xs text-muted-foreground">{nt.description}</div>
            </div>
          </Button>
        )
      })}
    </>
  )
}
