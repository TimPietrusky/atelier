"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { WorkflowNode } from "@/lib/workflow-engine"

interface PromptInspectorProps {
  node: WorkflowNode
  onChange: (config: Record<string, any>) => void
}

export function PromptInspector({ node, onChange }: PromptInspectorProps) {
  const [prompt, setPrompt] = useState(node.config?.prompt || "")

  useEffect(() => {
    setPrompt(node.config?.prompt || "")
  }, [node.id, node.config?.prompt])

  const handleChange = (value: string) => {
    setPrompt(value)
    onChange({ prompt: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt-text" className="text-sm text-muted-foreground">
          prompt
        </Label>
        <Textarea
          id="prompt-text"
          value={prompt}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="enter your prompt..."
          className="min-h-[120px] resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{prompt.length} characters</span>
        </div>
      </div>
    </div>
  )
}
