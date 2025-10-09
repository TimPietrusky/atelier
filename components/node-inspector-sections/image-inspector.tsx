"use client"

import { useState, useEffect } from "react"
import { Library, Upload } from "lucide-react"
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
import { assetManager } from "@/lib/store/asset-manager"
import type { WorkflowNode } from "@/lib/workflow-engine"

interface ImageInspectorProps {
  node: WorkflowNode
  onChange: (config: Record<string, any>) => void
  viewMode?: "edit" | "view" // "edit" = full controls, "view" = read-only (no upload)
  onRequestLibrarySelection?: () => void // Called when user wants to select from library
}

export function ImageInspector({
  node,
  onChange,
  viewMode = "edit",
  onRequestLibrarySelection,
}: ImageInspectorProps) {
  const [model, setModel] = useState(node.config?.model || "black-forest-labs/flux-1-schnell")
  const meta = getImageModelMeta(model)
  const mode: string =
    node.config?.mode ||
    (node.config?.uploadedAssetRef || node.config?.localImage ? "uploaded" : "generate")

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
        // Save to AssetManager and get AssetRef
        const assetRef = await assetManager.saveAsset(url, {
          prompt: "User uploaded image",
          model: "user-upload",
        })
        onChange({
          uploadedAssetRef: assetRef,
          mode: "uploaded",
        })
      } catch (err) {
        console.error("Failed to save uploaded image:", err)
        // Fallback to direct data URL
        onChange({ localImage: url, mode: "uploaded" })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      {/* Model Selector */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">model</Label>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="black-forest-labs/flux-1-schnell">FLUX 1 Schnell</SelectItem>
            <SelectItem value="black-forest-labs/flux-1-dev">FLUX 1 Dev</SelectItem>
            <SelectItem value="black-forest-labs/flux-1-kontext-dev">FLUX 1 Kontext Dev</SelectItem>
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

      {/* Image Source - Only show in edit mode */}
      {viewMode === "edit" && (
        <>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">image</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onRequestLibrarySelection?.()}
              >
                <Library className="w-4 h-4 mr-2" />
                from library
              </Button>
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    upload
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </>
      )}

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
