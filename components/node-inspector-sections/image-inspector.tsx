"use client"

import { useState, useEffect } from "react"
import { ImagePlus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getImageModelMeta } from "@/lib/config"
import { idbPutImage } from "@/lib/store/idb"
import type { WorkflowNode } from "@/lib/workflow-engine"

interface ImageInspectorProps {
  node: WorkflowNode
  onChange: (config: Record<string, any>) => void
}

export function ImageInspector({ node, onChange }: ImageInspectorProps) {
  const [model, setModel] = useState(node.config?.model || "black-forest-labs/flux-1-schnell")
  const meta = getImageModelMeta(model)
  const mode: string =
    node.config?.mode ||
    (node.config?.localImageRef || node.config?.localImage ? "uploaded" : "generate")

  useEffect(() => {
    setModel(node.config?.model || "black-forest-labs/flux-1-schnell")
  }, [node.id, node.config?.model])

  const handleModelChange = (value: string) => {
    setModel(value)
    onChange({ model: value })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const url = String(reader.result)
      try {
        if (typeof indexedDB !== "undefined") {
          const key = `img_${node.id}`
          await idbPutImage(key, url)
          onChange({
            localImageRef: key,
            localImage: undefined,
            mode: "uploaded",
          })
        } else {
          onChange({ localImage: url, mode: "uploaded" })
        }
      } catch {
        onChange({ localImage: url, mode: "uploaded" })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      {/* Mode */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">mode</Label>
        <Select value={mode} onValueChange={(v) => onChange({ mode: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="generate">generate</SelectItem>
            <SelectItem value="uploaded">uploaded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Model Selector - only in generate mode */}
      {mode !== "uploaded" && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">model</Label>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="black-forest-labs/flux-1-schnell">FLUX 1 Schnell</SelectItem>
              <SelectItem value="black-forest-labs/flux-1-dev">FLUX 1 Dev</SelectItem>
              <SelectItem value="black-forest-labs/flux-1-kontext-dev">
                FLUX 1 Kontext Dev
              </SelectItem>
              <SelectItem value="bytedance/seedream-3.0">Seedream 3.0</SelectItem>
              <SelectItem value="bytedance/seedream-4.0">Seedream 4.0</SelectItem>
              <SelectItem value="bytedance/seedream-4.0-edit">Seedream 4.0 Edit</SelectItem>
              <SelectItem value="qwen/qwen-image">Qwen Image</SelectItem>
              <SelectItem value="qwen/qwen-image-edit">Qwen Image Edit</SelectItem>
            </SelectContent>
          </Select>
          {node.data?.hasImageInput && meta && meta.kind !== "img2img" && (
            <p className="text-xs text-muted-foreground">
              an input image is connected — consider selecting an edit model.
            </p>
          )}
        </div>
      )}

      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">upload image</Label>
        <label className="block">
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <Button variant="outline" size="sm" className="w-full" asChild>
            <span className="cursor-pointer">
              <ImagePlus className="w-4 h-4 mr-2" />
              choose image
            </span>
          </Button>
        </label>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <Label htmlFor="steps" className="text-sm text-muted-foreground">
          steps
        </Label>
        <Input
          id="steps"
          type="number"
          defaultValue={node.config?.steps || 30}
          min="1"
          max="150"
          onChange={(e) => onChange({ steps: Number(e.target.value) })}
        />
      </div>

      {/* CFG Scale - only for models that support guidance */}
      {meta?.supportsGuidance && (
        <div className="space-y-2">
          <Label htmlFor="guidance" className="text-sm text-muted-foreground">
            cfg scale
          </Label>
          <Input
            id="guidance"
            type="number"
            defaultValue={node.config?.guidance || 7.5}
            step="0.5"
            min="1"
            max="20"
            onChange={(e) => onChange({ guidance: Number(e.target.value) })}
          />
        </div>
      )}

      {/* Resolution */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">resolution</Label>
        <Select
          defaultValue={`${node.config?.width || 1024}x${node.config?.height || 1024}`}
          onValueChange={(v) => {
            const [w, h] = v.split("x").map(Number)
            onChange({ width: w, height: h })
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="512x512">512×512</SelectItem>
            <SelectItem value="768x768">768×768</SelectItem>
            <SelectItem value="1024x1024">1024×1024</SelectItem>
            <SelectItem value="1024x768">1024×768</SelectItem>
            <SelectItem value="768x1024">768×1024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label htmlFor="seed" className="text-sm text-muted-foreground">
          seed
        </Label>
        <Input
          id="seed"
          type="number"
          placeholder="random"
          defaultValue={node.config?.seed || ""}
          onChange={(e) => onChange({ seed: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>
    </div>
  )
}
