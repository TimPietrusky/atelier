"use client"

import { useEffect, useState, useRef } from "react"
import { ImageIcon, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { NodeContainer, NodeHeader, NodeContent } from "@/components/node-components"
import { getImageModelMeta } from "@/lib/config"
import { idbDeleteImage, idbGetImage, idbPutImage } from "@/lib/store/idb"
import { workflowStore } from "@/lib/store/workflows"

export function ImageNode({
  data,
  id,
  selected,
  width,
}: {
  data: any
  id: string
  selected?: boolean
  width?: number
}) {
  // workflowId is passed via data.workflowId from the canvas
  const workflowId = data.workflowId
  const [model, setModel] = useState(data.config?.model || "black-forest-labs/flux-1-schnell")
  const meta = getImageModelMeta(model)
  const nodeWidth = width || 256
  const containerRef = useRef<HTMLDivElement>(null)

  // Map resultHistory to include id for deletions
  const imageHistory: Array<{ id: string; url: string }> = (data?.resultHistory || [])
    .filter((r: any) => r.type === "image")
    .map((r: any) => ({ id: r.id, url: r.data }))
    .reverse() // Most recent first

  const isRunning = data.status === "running"

  // Calculate grid columns based on node width: responsive scaling from 2-5 cols
  // After 5 cols, images naturally grow bigger as the node expands
  const getGridCols = (width: number) => {
    // Account for padding (p-3 = 24px total horizontal padding)
    const contentWidth = width - 24
    if (contentWidth < 280) return 2 // ~304px node width
    if (contentWidth < 360) return 3 // ~384px node width
    if (contentWidth < 440) return 4 // ~464px node width
    return 5 // 464px+ node width
  }
  const gridCols = getGridCols(nodeWidth)

  // Debug: log width changes (remove after testing)
  useEffect(() => {
    console.log("[ImageNode] Width:", nodeWidth, "Cols:", gridCols)
  }, [nodeWidth, gridCols])
  const [localImage, setLocalImage] = useState<string | undefined>(
    data.config?.localImage || undefined
  )
  const mode: string =
    data.config?.mode ||
    (data.config?.localImageRef || data.config?.localImage ? "uploaded" : "generate")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!localImage && data.config?.localImageRef && typeof indexedDB !== "undefined") {
          const url = await idbGetImage(data.config.localImageRef)
          if (!cancelled && url) setLocalImage(url)
        } else if (
          data.config?.localImage &&
          !data.config?.localImageRef &&
          typeof indexedDB !== "undefined"
        ) {
          const key = `img_${id}`
          await idbPutImage(key, data.config.localImage)
          if (!cancelled) setLocalImage(data.config.localImage)
          data?.onChange?.({
            localImageRef: key,
            localImage: undefined,
            mode: "uploaded",
          })
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [id, data.config?.localImageRef, data.config?.localImage])

  return (
    <NodeContainer
      ref={containerRef}
      isRunning={isRunning}
      isSelected={selected}
      handles={{
        target: {
          id: "image-input",
          className:
            "w-4 h-4 bg-accent border-2 border-background hover:bg-accent/80 transition-colors !left-[-8px]",
          style: { background: "#40e0d0" },
        },
        source: {
          id: "image-output",
          className:
            "w-4 h-4 bg-primary border-2 border-background hover:bg-primary/80 transition-colors !right-[-8px]",
          style: { background: "#ff0080" },
        },
      }}
    >
      <NodeHeader icon={<ImageIcon className="w-3 h-3 text-purple-500" />} title="image" />

      <NodeContent>
        {/* Fixed section: Model selector and header - doesn't scroll */}
        <div className="space-y-2 flex-shrink-0">
          {mode !== "uploaded" && (
            <div className="bg-muted/30 rounded-md px-2 border border-border/30">
              <Select
                value={model}
                onValueChange={(v) => {
                  setModel(v)
                  if (data?.onChange) data.onChange({ model: v })
                }}
              >
                <SelectTrigger className="w-full h-7 text-sm border-none bg-transparent p-0 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
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
              {data?.hasImageInput && meta && meta.kind !== "img2img" && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  An input image is connected — consider selecting an edit model.
                </div>
              )}
            </div>
          )}

          {imageHistory.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {imageHistory.length} image
                {imageHistory.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  if (workflowId) {
                    workflowStore.clearResultHistory(workflowId, id)
                  }
                }}
                title="Clear all images"
              >
                clear
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable section: Image grid only */}
        {imageHistory.length > 0 && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div
              className={`grid gap-2`}
              style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
            >
              {imageHistory.map((item, idx) => (
                <div
                  key={item.id || `${item.url}-${idx}`}
                  className="relative overflow-hidden rounded border group"
                  style={{ aspectRatio: "1/1" }}
                >
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt={`Generation ${imageHistory.length - idx}`}
                    className="block w-full h-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (workflowId && item.id) {
                        workflowStore.removeFromResultHistory(workflowId, id, item.id)
                      }
                    }}
                    title="Remove this image"
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </Button>
                  {idx === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                      latest
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {imageHistory.length === 0 && localImage && (
          <div className="relative overflow-hidden rounded border group">
            <img
              src={localImage || "/placeholder.svg"}
              alt="Local image"
              className="block w-full h-auto max-h-[320px] object-contain"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                ;(async () => {
                  try {
                    if (data.config?.localImageRef && typeof indexedDB !== "undefined") {
                      await idbDeleteImage(data.config.localImageRef)
                    }
                  } catch {}
                  setLocalImage(undefined)
                  data?.onChange?.({
                    localImage: undefined,
                    localImageRef: undefined,
                    mode: "generate",
                  })
                })()
              }}
              title="Remove image"
            >
              <X className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        )}
        {imageHistory.length === 0 && !localImage && (
          <div className="h-32 border-2 border-dashed border-border/30 rounded flex items-center justify-center text-muted-foreground/50">
            <div className="text-center">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span className="text-xs">Image</span>
            </div>
          </div>
        )}
      </NodeContent>
    </NodeContainer>
  )
}
