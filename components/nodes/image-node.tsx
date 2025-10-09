"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  ImageIcon,
  X,
  Download,
  Loader2,
  Copy,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { workflowStore } from "@/lib/store/workflows"
import { useAssets } from "@/lib/hooks/use-asset"
import { workflowEngine } from "@/lib/workflow-engine"
import { assetManager } from "@/lib/store/asset-manager"

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
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; id: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [clearPopoverOpen, setClearPopoverOpen] = useState(false)
  const imageHistoryRef = useRef<any[]>([])

  // Resolve asset references from resultHistory
  // useMemo to prevent recreating the array on every render (which would cause infinite loop)
  const resultHistory = useMemo(
    () => (data?.resultHistory || []).filter((r: any) => r.type === "image"),
    [data?.resultHistory]
  )
  const resolvedAssets = useAssets(resultHistory)

  // Keep metadata with resolved assets
  const assetsWithMetadata = useMemo(() => {
    return resolvedAssets.map((asset, idx) => ({
      ...asset,
      metadata: resultHistory[idx]?.metadata,
    }))
  }, [resolvedAssets, resultHistory])

  // Determine mode early (needed for pending count logic)
  const mode: string =
    data.config?.mode ||
    (data.config?.uploadedAssetRef || data.config?.localImage ? "uploaded" : "generate")

  // Get pending placeholders from queue (queued/running jobs for this node)
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    const updatePending = () => {
      // Skip pending count for uploaded mode (it won't be executed during runs)
      if (!data.workflowId || mode === "uploaded") {
        setPendingCount(0)
        return
      }

      // Get execution IDs that already have results in this node's history
      const completedExecutionIds = new Set(
        (data?.resultHistory || [])
          .filter((r: any) => r.type === "image" && r.metadata?.executionId)
          .map((r: any) => r.metadata.executionId)
      )

      // Get all executions for this workflow
      const executions = workflowEngine.getAllExecutions()
      const pending = executions.filter((e) => {
        if (e.workflowId !== data.workflowId) return false
        if (e.status !== "queued" && e.status !== "running") return false

        // Skip if this execution already has a result for this node
        if (completedExecutionIds.has(e.id)) return false

        // Check if this node exists in the workflow snapshot
        // This covers both queued jobs and running jobs that haven't reached this node yet
        const snapshot = workflowEngine.getQueueSnapshot?.(e.id)
        const hasThisNode = snapshot?.nodes?.some((n: any) => n.id === id)
        return hasThisNode || false
      })

      setPendingCount(pending.length)
    }

    // Register listener for instant updates (supports multiple listeners per node)
    const unsubscribe = workflowEngine.addExecutionChangeListener(updatePending)
    updatePending() // Initial check

    return unsubscribe
  }, [data.workflowId, id, data?.resultHistory, mode])

  // Map to include id for deletions, most recent first, plus pending placeholders
  const imageHistory: Array<{ id: string; url: string; isPending?: boolean; metadata?: any }> =
    useMemo(() => {
      const actual = [...assetsWithMetadata].reverse()
      const placeholders = Array.from({ length: pendingCount }, (_, i) => ({
        id: `pending-${i}`,
        url: "",
        isPending: true,
      }))
      const result = [...placeholders, ...actual]
      imageHistoryRef.current = result // Keep ref in sync
      return result
    }, [assetsWithMetadata, pendingCount])

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

  const [localImage, setLocalImage] = useState<string | undefined>(undefined)

  const handleViewSettings = (metadata: any, resultId: string) => {
    setSelectedMetadata(metadata)
    setSelectedImageId(resultId)
    // Notify parent via callback (passed through data) with metadata and resultId for toggle logic
    // The panel will react to this event automatically (no need to call onOpenInspector)
    if (data.onMetadataSelected) {
      data.onMetadataSelected(metadata, resultId)
    }
  }

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!enlargedImage) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        e.stopPropagation()
        // Navigate using ref to avoid re-registering listener on every image generation
        const history = imageHistoryRef.current
        const currentIndex = history.findIndex((img) => img.id === enlargedImage.id)
        if (currentIndex > 0) {
          const newImage = history[currentIndex - 1]
          if (!newImage.isPending) {
            setEnlargedImage({ url: newImage.url, id: newImage.id })
            setSelectedImageId(newImage.id)
          }
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        e.stopPropagation()
        const history = imageHistoryRef.current
        const currentIndex = history.findIndex((img) => img.id === enlargedImage.id)
        if (currentIndex >= 0 && currentIndex < history.length - 1) {
          const newImage = history[currentIndex + 1]
          if (!newImage.isPending) {
            setEnlargedImage({ url: newImage.url, id: newImage.id })
            setSelectedImageId(newImage.id)
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        setEnlargedImage(null)
      }
    }

    // Use capture phase to intercept before ReactFlow gets the event
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [enlargedImage]) // Only re-register when lightbox opens/closes, not on every image generation

  const handleCopySettings = (metadata: any) => {
    if (!metadata?.inputsUsed || !workflowId) return

    const settings: Record<string, any> = {}

    // Copy relevant settings from metadata
    if (metadata.model) settings.model = metadata.model
    if (metadata.inputsUsed.ratio) settings.ratio = metadata.inputsUsed.ratio
    if (metadata.inputsUsed.width) settings.width = metadata.inputsUsed.width
    if (metadata.inputsUsed.height) settings.height = metadata.inputsUsed.height
    if (metadata.inputsUsed.steps) settings.steps = metadata.inputsUsed.steps
    if (metadata.inputsUsed.guidance) settings.guidance = metadata.inputsUsed.guidance
    if (metadata.inputsUsed.seed) settings.seed = metadata.inputsUsed.seed

    // Apply to current node
    workflowStore.updateNodeConfig(workflowId, id, settings)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Load from AssetManager if we have an AssetRef
        if (data.config?.uploadedAssetRef) {
          const asset = await assetManager.loadAsset(data.config.uploadedAssetRef)
          if (!cancelled && asset) setLocalImage(asset.data)
        } else if (data.config?.localImage) {
          // Fallback: use localImage directly (legacy support)
          if (!cancelled) setLocalImage(data.config.localImage)
        } else {
          // Clear if both are undefined
          if (!cancelled) setLocalImage(undefined)
        }
      } catch (err) {
        console.error("[ImageNode] Failed to load uploaded image:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, data.config?.uploadedAssetRef, data.config?.localImage])

  return (
    <>
      <NodeContainer
        ref={containerRef}
        nodeType="image-gen"
        isRunning={isRunning}
        isSelected={selected}
        handles={{
          target: {
            id: "image-input",
            className:
              "w-4 h-4 border-2 border-background hover:scale-110 transition-all !left-[-8px]",
            style: { background: "var(--node-image)" },
          },
          source: {
            id: "image-output",
            className:
              "w-4 h-4 border-2 border-background hover:scale-110 transition-all !right-[-8px]",
            style: { background: "var(--node-image)" },
          },
        }}
      >
        <NodeHeader
          icon={<ImageIcon className="w-3 h-3" style={{ color: "var(--node-image)" }} />}
          title="image"
          onSettingsClick={data?.onOpenInspector}
        />

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
                  {imageHistory.filter((i) => !i.isPending).length} image
                  {imageHistory.filter((i) => !i.isPending).length !== 1 ? "s" : ""}
                  {pendingCount > 0 && (
                    <span className="text-muted-foreground/50"> (+{pendingCount} pending)</span>
                  )}
                </span>
                <Popover open={clearPopoverOpen} onOpenChange={setClearPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-40 hover:opacity-100 transition-opacity"
                      title="Clear all images"
                    >
                      <Trash2 className="w-3 h-3 text-[var(--text-muted)]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="end" className="w-64 p-3">
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium mb-1">
                          clear all {imageHistory.filter((i) => !i.isPending).length} images?
                        </p>
                        <p className="text-muted-foreground text-xs">this cannot be undone</p>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setClearPopoverOpen(false)}
                          className="h-7 px-3"
                        >
                          <X className="w-4 h-4 mr-1" />
                          cancel
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (workflowId) {
                              workflowStore.clearResultHistory(workflowId, id)
                            }
                            setClearPopoverOpen(false)
                          }}
                          className="h-7 px-3 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          clear
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Scrollable section: Image grid only */}
          {imageHistory.length > 0 && (
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
              style={{
                contentVisibility: "auto",
              }}
            >
              <div
                className={`grid gap-2`}
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {imageHistory.map((item, idx) => (
                  <div
                    key={item.id || `${item.url}-${idx}`}
                    className={`relative overflow-hidden rounded-none border group ${
                      item.isPending ? "cursor-default" : "cursor-pointer"
                    }`}
                    style={{
                      aspectRatio: "1/1",
                      borderColor:
                        selectedImageId === item.id || enlargedImage?.id === item.id
                          ? "var(--node-image)"
                          : "var(--border)",
                    }}
                  >
                    {item.isPending ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted/40 animate-pulse">
                        <Loader2 className="w-6 h-6 text-muted-foreground/50 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img
                          src={item.url || "/placeholder.svg"}
                          alt={`Generation ${imageHistory.length - idx}`}
                          className="block w-full h-full object-cover cursor-pointer rounded-none"
                          width={512}
                          height={512}
                          loading="lazy"
                          onClick={() => {
                            if (item.metadata) {
                              handleViewSettings(item.metadata, item.id)
                            } else {
                              setSelectedImageId(item.id)
                            }
                          }}
                        />
                        {/* Gradient overlay - visual only, clicks pass through */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        {/* Action buttons - positioned in top right */}
                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEnlargedImage({ url: item.url, id: item.id })
                              setSelectedImageId(item.id)
                            }}
                            title="View fullscreen"
                          >
                            <Maximize2 className="w-3 h-3 text-white" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                            onClick={(e) => {
                              e.stopPropagation()
                              const link = document.createElement("a")
                              link.href = item.url
                              link.download = `image-${item.id}.png`
                              link.click()
                            }}
                            title="Download image"
                          >
                            <Download className="w-3 h-3 text-white" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (workflowId && item.id) {
                                workflowStore.removeFromResultHistory(workflowId, id, item.id)
                              }
                            }}
                            title="Remove this image"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </Button>
                        </div>
                      </>
                    )}
                    {!item.isPending && idx === 0 && (
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
            <div className="relative overflow-hidden rounded-none border group">
              <img
                src={localImage || "/placeholder.svg"}
                alt="Local image"
                className="block w-full h-auto max-h-[320px] object-contain rounded-none"
                width={512}
                height={512}
                loading="lazy"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  ;(async () => {
                    try {
                      // Delete from AssetManager if we have an AssetRef
                      if (data.config?.uploadedAssetRef) {
                        await assetManager.deleteAsset(data.config.uploadedAssetRef, {
                          force: true,
                        })
                      }
                    } catch (err) {
                      console.error("[ImageNode] Failed to delete uploaded image:", err)
                    }
                    setLocalImage(undefined)
                    data?.onChange?.({
                      localImage: undefined,
                      uploadedAssetRef: undefined,
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
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = async () => {
                    const url = String(reader.result)
                    try {
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
                      data?.onChange?.({
                        uploadedAssetRef: assetRef,
                        mode: "uploaded",
                      })
                    } catch (err) {
                      console.error("[ImageNode] Failed to save uploaded image:", err)
                      // Fallback to direct data URL
                      data?.onChange?.({ localImage: url, mode: "uploaded" })
                    }
                  }
                  reader.readAsDataURL(file)
                }}
              />
              <div
                className="h-32 border-2 border-dashed border-border/30 rounded-none flex items-center justify-center text-muted-foreground/50 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderColor: "var(--border)",
                }}
              >
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <span className="text-xs">click to upload</span>
                </div>
              </div>
            </>
          )}
        </NodeContent>
      </NodeContainer>

      {/* Image Lightbox Modal - rendered via portal */}
      {enlargedImage &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-8"
            onClick={() => setEnlargedImage(null)}
          >
            {/* Top right controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-background/10 hover:bg-background/20 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  const link = document.createElement("a")
                  link.href = enlargedImage.url
                  link.download = `image-${enlargedImage.id}.png`
                  link.click()
                }}
                title="Download image"
              >
                <Download className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-background/10 hover:bg-background/20 text-white"
                onClick={() => setEnlargedImage(null)}
                title="Close (Esc)"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Previous button */}
            {(() => {
              const currentIndex = imageHistory.findIndex((img) => img.id === enlargedImage.id)
              const hasPrev = currentIndex > 0
              return hasPrev ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-background/10 hover:bg-background/20 text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    const newImage = imageHistory[currentIndex - 1]
                    if (!newImage.isPending) {
                      setEnlargedImage({ url: newImage.url, id: newImage.id })
                      setSelectedImageId(newImage.id)
                    }
                  }}
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
              ) : null
            })()}

            {/* Next button */}
            {(() => {
              const currentIndex = imageHistory.findIndex((img) => img.id === enlargedImage.id)
              const hasNext =
                currentIndex < imageHistory.length - 1 && !imageHistory[currentIndex + 1]?.isPending
              return hasNext ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-background/10 hover:bg-background/20 text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    const newImage = imageHistory[currentIndex + 1]
                    if (!newImage.isPending) {
                      setEnlargedImage({ url: newImage.url, id: newImage.id })
                      setSelectedImageId(newImage.id)
                    }
                  }}
                  title="Next (→)"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              ) : null
            })()}

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/10 text-white px-3 py-1.5 rounded text-sm">
              {(() => {
                const currentIndex = imageHistory.findIndex((img) => img.id === enlargedImage.id)
                return `${currentIndex + 1} / ${imageHistory.length}`
              })()}
            </div>

            <img
              src={enlargedImage.url}
              alt="Enlarged view"
              className="max-w-full max-h-full object-contain rounded-none"
              width={1024}
              height={1024}
              loading="lazy"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </>
  )
}
