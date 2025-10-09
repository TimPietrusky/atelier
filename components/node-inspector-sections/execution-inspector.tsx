"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Copy } from "lucide-react"
import { workflowStore } from "@/lib/store/workflows"

interface ExecutionInspectorProps {
  metadata: any // Persistent metadata stored with the image result
  currentNodeId: string
  currentWorkflowId: string
}

export function ExecutionInspector({
  metadata,
  currentNodeId,
  currentWorkflowId,
}: ExecutionInspectorProps) {
  if (!metadata) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <p>No metadata available</p>
        <p className="text-xs mt-1">This image may not have generation settings</p>
      </div>
    )
  }

  const handleCopyToNode = () => {
    if (!metadata?.inputsUsed) return

    const settings: Record<string, any> = {}

    // Copy all relevant settings from metadata
    if (metadata.model) settings.model = metadata.model
    if (metadata.inputsUsed.ratio) settings.ratio = metadata.inputsUsed.ratio
    if (metadata.inputsUsed.width) settings.width = metadata.inputsUsed.width
    if (metadata.inputsUsed.height) settings.height = metadata.inputsUsed.height
    if (metadata.inputsUsed.steps) settings.steps = metadata.inputsUsed.steps
    if (metadata.inputsUsed.guidance) settings.guidance = metadata.inputsUsed.guidance
    if (metadata.inputsUsed.seed) settings.seed = metadata.inputsUsed.seed
    if (metadata.inputsUsed.prompt) settings.prompt = metadata.inputsUsed.prompt

    // Apply to current node
    workflowStore.updateNodeConfig(currentWorkflowId, currentNodeId, settings)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Generation Settings</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyToNode}
          className="h-7 text-xs gap-1"
        >
          <Copy className="w-3 h-3" />
          Copy to Node
        </Button>
      </div>

      {/* Model */}
      {metadata.model && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Model</Label>
          <p className="text-sm font-mono bg-muted/30 rounded px-2 py-1">{metadata.model}</p>
        </div>
      )}

      {/* Prompt */}
      {metadata.inputsUsed?.prompt && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Prompt</Label>
          <p className="text-sm bg-muted/30 rounded px-2 py-1.5 break-words">
            {metadata.inputsUsed.prompt}
          </p>
        </div>
      )}

      {/* Resolution */}
      {metadata.inputsUsed?.width && metadata.inputsUsed?.height && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Resolution</Label>
          <p className="text-sm font-mono bg-muted/30 rounded px-2 py-1">
            {metadata.inputsUsed.width} × {metadata.inputsUsed.height}
          </p>
        </div>
      )}

      {/* Steps */}
      {metadata.inputsUsed?.steps && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Steps</Label>
          <p className="text-sm font-mono bg-muted/30 rounded px-2 py-1">
            {metadata.inputsUsed.steps}
          </p>
        </div>
      )}

      {/* CFG Scale */}
      {metadata.inputsUsed?.guidance && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">CFG Scale</Label>
          <p className="text-sm font-mono bg-muted/30 rounded px-2 py-1">
            {metadata.inputsUsed.guidance}
          </p>
        </div>
      )}

      {/* Seed */}
      {metadata.inputsUsed?.seed && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Seed</Label>
          <p className="text-sm font-mono bg-muted/30 rounded px-2 py-1">
            {metadata.inputsUsed.seed}
          </p>
        </div>
      )}

      {/* Execution Info */}
      {metadata.executionId && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Execution ID</Label>
          <p className="text-xs font-mono bg-muted/30 rounded px-2 py-1 break-all">
            {metadata.executionId}
          </p>
        </div>
      )}

      {metadata.timestamp && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Created</Label>
          <p className="text-sm font-mono bg-muted/30 rounded px-2 py-1">
            {new Date(metadata.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
