"use client"

import { useState } from "react"
import { TestTube } from "lucide-react"
import { NodeContainer, NodeHeader, NodeContent } from "@/components/node-components"

export function TestNode({ data, id, selected }: { data: any; id: string; selected?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <NodeContainer isRunning={false} isSelected={selected}>
      <NodeHeader
        icon={<TestTube className="w-3 h-3 text-green-500" />}
        title="test resize"
        onSettingsClick={data?.onOpenInspector}
      />

      <NodeContent>
        <div className="p-4 text-center text-muted-foreground text-sm">
          Empty test node
          <br />
          Resize me!
        </div>
      </NodeContent>
    </NodeContainer>
  )
}
