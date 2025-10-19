"use client"

import { useState, useEffect, useMemo } from "react"
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
import { getImageModelMeta, type AspectRatio } from "@/lib/config"
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
    (node.config?.uploadedAssetRefs?.length > 0 ||
    node.config?.uploadedAssetRef ||
    node.config?.localImage
      ? "uploaded"
      : "generate")

  useEffect(() => {
    setModel(node.config?.model || "black-forest-labs/flux-1-schnell")
  }, [node.id, node.config?.model])

  // Generate resolution options dynamically based on model configuration
  const resolutionOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = []

    if (!meta) {
      // Fallback to generic options if no metadata
      return [
        { value: "512x512", label: "512×512" },
        { value: "768x768", label: "768×768" },
        { value: "1024x1024", label: "1024×1024" },
        { value: "1024x768", label: "1024×768" },
        { value: "768x1024", label: "768×1024" },
      ]
    }

    // If model has specific size constraints, use those
    if (meta.sizesByRatio) {
      for (const ratio of meta.supportedAspectRatios) {
        const sizes = meta.sizesByRatio[ratio]
        if (sizes && sizes.length > 0) {
          for (const size of sizes) {
            if (ratio === "1:1") {
              options.push({ value: `${size}x${size}`, label: `${size}×${size}` })
            } else if (ratio === "4:3") {
              const height = Math.round((size * 3) / 4)
              options.push({ value: `${size}x${height}`, label: `${size}×${height}` })
            } else if (ratio === "3:4") {
              const width = Math.round((size * 3) / 4)
              options.push({ value: `${width}x${size}`, label: `${width}×${size}` })
            }
          }
        }
      }
    } else {
      // Generate generic options based on supported aspect ratios
      const commonSizes = [512, 768, 1024]
      for (const ratio of meta.supportedAspectRatios) {
        for (const size of commonSizes) {
          if (ratio === "1:1") {
            options.push({ value: `${size}x${size}`, label: `${size}×${size}` })
          } else if (ratio === "4:3") {
            const height = Math.round((size * 3) / 4)
            options.push({ value: `${size}x${height}`, label: `${size}×${height}` })
          } else if (ratio === "3:4") {
            const width = Math.round((size * 3) / 4)
            options.push({ value: `${width}x${size}`, label: `${width}×${size}` })
          }
        }
      }
    }

    return options
  }, [meta])

  // Get current resolution value, fallback to first available option if not valid
  const currentResolution = `${node.config?.width || 1024}x${node.config?.height || 1024}`
  const validResolution = resolutionOptions.some((opt) => opt.value === currentResolution)
    ? currentResolution
    : resolutionOptions[0]?.value || "1024x1024"

  const handleModelChange = (value: string) => {
    setModel(value)
    onChange({ model: value })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const assetRefs = []
    const existingRefs = node.config?.uploadedAssetRefs || []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(file)
        })

        // Save to AssetManager and get AssetRef
        const assetRef = await assetManager.saveAsset({
          kind: "idb",
          type: "image",
          data: url,
          mime: file.type || "image/png",
          bytes: file.size,
          metadata: {
            prompt: "User uploaded image",
            model: "user-upload",
          },
        })
        assetRefs.push(assetRef)
      } catch (err) {
        console.error("Failed to save uploaded image:", err)
      }
    }

    if (assetRefs.length > 0) {
      onChange({
        uploadedAssetRefs: [...existingRefs, ...assetRefs],
        mode: "uploaded",
      })
    }

    // Reset file input
    e.target.value = ""
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
            <Label className="text-sm text-muted-foreground">image source</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onRequestLibrarySelection?.()}
              >
                <Library className="w-4 h-4 mr-2" />
                media
              </Button>
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  multiple
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
          key={`${model}-${validResolution}`}
          defaultValue={validResolution}
          onValueChange={(v) => {
            const [w, h] = v.split("x").map(Number)
            onChange({ width: w, height: h })
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resolutionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
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
