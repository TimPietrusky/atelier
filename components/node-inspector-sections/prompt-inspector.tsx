"use client"

import { useState, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { WorkflowNode } from "@/lib/workflow-engine"

interface PromptInspectorProps {
  node: WorkflowNode
  onChange: (config: Record<string, any>) => void
}

export function PromptInspector({ node, onChange }: PromptInspectorProps) {
  const [prompt, setPrompt] = useState(node.config?.prompt || "")
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setPrompt(node.config?.prompt || "")
  }, [node.id, node.config?.prompt])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleChange = (value: string) => {
    // Update local state immediately for instant feedback
    setPrompt(value)

    // Debounce persistence to avoid lag during fast typing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange({ prompt: value })
    }, 300)
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
          spellCheck={false}
          onFocus={(e) => {
            // Prevent text auto-selection on focus
            const target = e.target
            const len = target.value.length
            // Move cursor to end instead of selecting all
            queueMicrotask(() => {
              target.setSelectionRange(len, len)
            })
          }}
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
