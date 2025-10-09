"use client"

import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { NodeContainer, NodeHeader, NodeContent } from "@/components/node-components"

export function PromptNode({ data, id, selected }: { data: any; id: string; selected?: boolean }) {
  const [prompt, setPrompt] = useState(data.config?.prompt || "")

  // Only sync from store if we're not currently editing (external change)
  useEffect(() => {
    // Don't override local state while user is typing
    if (document.activeElement?.id === `prompt-textarea-${id}`) return
    setPrompt(data.config?.prompt || "")
  }, [data.config?.prompt, id])

  const isRunning = data.status === "running"

  return (
    <NodeContainer
      nodeType="prompt"
      isRunning={isRunning}
      isSelected={selected}
      handles={{
        target: {
          id: "prompt-input",
          className: "w-3 h-3 border-2 border-background",
          style: { background: "var(--node-prompt)" },
        },
        source: {
          id: "prompt-output",
          className:
            "w-4 h-4 border-2 border-background hover:scale-110 transition-all !right-[-8px]",
          style: { background: "var(--node-prompt)" },
        },
      }}
    >
      <NodeHeader
        icon={<MessageSquare className="w-3 h-3" style={{ color: "var(--node-prompt)" }} />}
        title="prompt"
        onSettingsClick={data?.onOpenInspector}
      />

      <NodeContent>
        <Textarea
          id={`prompt-textarea-${id}`}
          placeholder="enter your prompt..."
          value={prompt}
          onChange={(e) => {
            const val = e.target.value
            setPrompt(val)
            try {
              if (data?.onChange) data.onChange({ prompt: val })
            } catch {}
          }}
          className="nodrag min-h-[120px] text-[13px] font-medium bg-[var(--surface-elevated)] border border-[var(--border)] focus:border-[var(--node-prompt)] rounded p-2"
        />
      </NodeContent>
    </NodeContainer>
  )
}
