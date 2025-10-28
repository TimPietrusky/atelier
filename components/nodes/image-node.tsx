"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import {
  ImageIcon,
  X,
  Download,
  Loader2,
  Maximize2,
  Trash2,
  Check,
  Library,
  Upload,
  Share2,
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
import { Lightbox } from "@/components/lightbox"
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
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [clearPopoverOpen, setClearPopoverOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState<"single" | "multiple">("single")

  // Determine mode early (needed for pending count logic and smart tab selection)
  const mode: string =
    data.config?.mode ||
    (data.config?.uploadedAssetRefs?.length > 0 ||
    data.config?.uploadedAssetRef ||
    data.config?.localImage
      ? "uploaded"
      : "generate")

  // Initialize activeTab from sessionStorage
  const [activeTab, setActiveTab] = useState<"model" | "source">(() => {
    if (typeof window !== "undefined") {
      const savedTab = sessionStorage.getItem(`image-node-tab-${id}`) as "model" | "source" | null
      if (savedTab) return savedTab
    }
    // Smart default: if we have input images, show source tab
    return mode === "uploaded" ? "source" : "model"
  })

  // Save activeTab to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem(`image-node-tab-${id}`, activeTab)
  }, [activeTab, id])

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
      assetRef: resultHistory[idx]?.assetRef,
    }))
  }, [resolvedAssets, resultHistory])

  // Track queue changes to force re-render when executions update
  const [queueVersion, setQueueVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = workflowEngine.addExecutionChangeListener(() => {
      setQueueVersion((v) => v + 1)
    })
    return unsubscribe
  }, [])

  // Map to include id for deletions, most recent first, plus pending placeholders
  // Placeholders are matched by execution ID to prevent jumping when images arrive
  // Calculate pending executions synchronously to avoid timing issues
  const imageHistory: Array<{
    id: string
    url: string
    isPending?: boolean
    metadata?: any
    executionId?: string
    assetRef?: string
  }> = useMemo(() => {
    const actual = [...assetsWithMetadata].reverse()

    // Skip pending placeholders for uploaded mode
    if (!data.workflowId || mode === "uploaded") {
      return actual
    }

    // Get execution IDs that already have results in this node's history
    const completedExecutionIds = new Set(
      actual.filter((item) => item.metadata?.executionId).map((item) => item.metadata.executionId)
    )

    // Get all pending executions for this workflow and node (calculate synchronously)
    const executions = workflowEngine.getAllExecutions()
    const pendingExecutions = executions.filter((e) => {
      if (e.workflowId !== data.workflowId) return false
      if (e.status !== "queued" && e.status !== "running") return false

      // Skip if this execution already has a result for this node
      if (completedExecutionIds.has(e.id)) return false

      // Check if this node exists in the workflow snapshot
      const snapshot = workflowEngine.getQueueSnapshot?.(e.id)
      const hasThisNode = snapshot?.nodes?.some((n: any) => n.id === id)
      return hasThisNode || false
    })

    // Create placeholders for pending executions
    const placeholders = pendingExecutions.map((e) => ({
      id: `pending-${e.id}`,
      url: "",
      isPending: true,
      executionId: e.id,
    }))

    return [...placeholders, ...actual]
  }, [assetsWithMetadata, data.workflowId, id, mode, queueVersion])

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

  const [localImages, setLocalImages] = useState<string[]>([])

  // Show empty state (upload buttons) when there's no content to display
  const showEmptyState = imageHistory.length === 0 && localImages.length === 0

  const handleViewSettings = (metadata: any, resultId: string) => {
    setSelectedMetadata(metadata)
    setSelectedImageId(resultId)
    // Notify parent via callback (passed through data) with metadata and resultId for toggle logic
    // The panel will react to this event automatically (no need to call onOpenInspector)
    if (data.onMetadataSelected) {
      data.onMetadataSelected(metadata, resultId)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loadedImages: string[] = []

        // Load from AssetManager if we have multiple AssetRefs
        if (data.config?.uploadedAssetRefs && data.config.uploadedAssetRefs.length > 0) {
          for (const ref of data.config.uploadedAssetRefs) {
            const asset = await assetManager.loadAsset(ref)
            if (asset) loadedImages.push(asset.data)
          }
        } else if (data.config?.uploadedAssetRef) {
          // Legacy: single asset ref
          const asset = await assetManager.loadAsset(data.config.uploadedAssetRef)
          if (asset) loadedImages.push(asset.data)
        } else if (data.config?.localImage) {
          // Legacy: direct data URL
          loadedImages.push(data.config.localImage)
        }

        if (!cancelled) setLocalImages(loadedImages)
      } catch (err) {
        console.error("[ImageNode] Failed to load uploaded images:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, data.config?.uploadedAssetRefs, data.config?.uploadedAssetRef, data.config?.localImage])

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

        {/* Tab buttons */}
        <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-border">
          <button
            onClick={() => setActiveTab("model")}
            className={`px-2 py-1 text-xs font-medium transition-colors border-b-2 ${
              activeTab === "model"
                ? "border-[var(--node-image)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            model
          </button>
          <button
            onClick={() => setActiveTab("source")}
            className={`px-2 py-1 text-xs font-medium transition-colors border-b-2 ${
              activeTab === "source"
                ? "border-[var(--node-image)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            source
          </button>
        </div>

        <NodeContent>
          {/* Model Tab */}
          {activeTab === "model" && (
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <Select
                value={model}
                onValueChange={(v) => {
                  setModel(v)
                  if (data?.onChange) data.onChange({ model: v })
                }}
              >
                <SelectTrigger className="w-full h-7 text-sm px-2">
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
                <div className="text-[10px] text-muted-foreground">
                  An input image is connected — consider selecting an edit model.
                </div>
              )}

              {/* Generated images history */}
              {imageHistory.length > 0 && (
                <div className="mt-2 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {isSelectionMode && selectedImages.size > 0 ? (
                        `${selectedImages.size} selected`
                      ) : (
                        <>
                          {imageHistory.filter((i) => !i.isPending).length} image
                          {imageHistory.filter((i) => !i.isPending).length !== 1 ? "s" : ""}
                          {imageHistory.filter((i) => i.isPending).length > 0 && (
                            <span className="text-muted-foreground/50">
                              {" "}
                              (+{imageHistory.filter((i) => i.isPending).length} pending)
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      {isSelectionMode ? (
                        <>
                          {selectedImages.size > 0 && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                                title="Download selected"
                                onClick={() => {
                                  selectedImages.forEach((imgId) => {
                                    const item = imageHistory.find((i) => i.id === imgId)
                                    if (item?.url) {
                                      const link = document.createElement("a")
                                      link.href = item.url
                                      link.download = `image-${imgId}.png`
                                      link.click()
                                    }
                                  })
                                }}
                              >
                                <Download className="w-3 h-3 text-[var(--text-muted)]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                                title="Share selected"
                                onClick={async () => {
                                  if (navigator.share && selectedImages.size > 0) {
                                    try {
                                      const files = await Promise.all(
                                        Array.from(selectedImages).map(async (imgId) => {
                                          const item = imageHistory.find((i) => i.id === imgId)
                                          if (item?.url) {
                                            const response = await fetch(item.url)
                                            const blob = await response.blob()
                                            return new File([blob], `image-${imgId}.png`, {
                                              type: "image/png",
                                            })
                                          }
                                          return null
                                        })
                                      )
                                      const validFiles = files.filter((f) => f !== null) as File[]
                                      if (validFiles.length > 0) {
                                        await navigator.share({ files: validFiles })
                                      }
                                    } catch (err) {
                                      console.error("Share failed:", err)
                                    }
                                  }
                                }}
                              >
                                <Share2 className="w-3 h-3 text-[var(--text-muted)]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                                title="Remove selected from history"
                                onClick={() => {
                                  if (workflowId) {
                                    selectedImages.forEach((imgId) => {
                                      workflowStore.removeFromResultHistory(workflowId, id, imgId)
                                    })
                                  }
                                  setSelectedImages(new Set())
                                }}
                              >
                                <X className="w-3 h-3 text-[var(--text-muted)]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                                title="Delete selected from library"
                                onClick={() => {
                                  setDeleteMode("multiple")
                                  setDeletePopoverOpen(true)
                                }}
                              >
                                <Trash2 className="w-3 h-3 text-[var(--text-muted)]" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const allIds = new Set(
                                imageHistory.filter((i) => !i.isPending).map((i) => i.id)
                              )
                              setSelectedImages(allIds)
                            }}
                          >
                            all
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setIsSelectionMode(false)
                              setSelectedImages(new Set())
                            }}
                          >
                            cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs opacity-40 hover:opacity-100 transition-opacity"
                          onClick={() => setIsSelectionMode(true)}
                        >
                          select
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Image grid */}
                  <div
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{
                      contentVisibility: "auto",
                    }}
                  >
                    <div
                      className={`grid gap-2`}
                      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                    >
                      {imageHistory.map((item, idx) => {
                        const isSelected =
                          selectedImageId === item.id || lightboxImageId === item.id
                        return (
                          <div
                            key={item.id || `${item.url}-${idx}`}
                            className={`relative overflow-hidden rounded-none border group ${
                              item.isPending ? "cursor-default" : "cursor-pointer"
                            }`}
                            style={{
                              aspectRatio: "1/1",
                              borderColor: isSelected ? "var(--node-image)" : "var(--border)",
                              boxShadow: isSelected
                                ? "rgba(255, 255, 255, 0.5) -2px 2px 0px"
                                : "none",
                            }}
                          >
                            {item.isPending ? (
                              <div className="w-full h-full flex items-center justify-center">
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
                                    if (isSelectionMode) {
                                      setSelectedImages((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(item.id)) {
                                          next.delete(item.id)
                                        } else {
                                          next.add(item.id)
                                        }
                                        return next
                                      })
                                    } else {
                                      if (item.metadata) {
                                        handleViewSettings(item.metadata, item.id)
                                      } else {
                                        setSelectedImageId(item.id)
                                      }
                                    }
                                  }}
                                />
                                {/* Selection indicator */}
                                {isSelectionMode && selectedImages.has(item.id) && (
                                  <div className="absolute top-1 left-1 w-5 h-5 bg-[var(--node-image)] rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                {/* Gradient overlay - visual only, clicks pass through */}
                                <div
                                  className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity pointer-events-none ${
                                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  }`}
                                />
                                {/* Action buttons - positioned in top right (hidden in selection mode) */}
                                {!isSelectionMode && (
                                  <div
                                    className={`absolute top-1 right-1 flex items-center gap-1 transition-opacity ${
                                      isSelected
                                        ? "opacity-100"
                                        : "opacity-0 group-hover:opacity-100"
                                    }`}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setLightboxImageId(item.id)
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
                                        setDeleteTarget(item.id)
                                        setDeleteMode("single")
                                        setDeletePopoverOpen(true)
                                      }}
                                      title="Remove this image"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                            {!item.isPending && idx === 0 && (
                              <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                                latest
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Source Tab */}
          {activeTab === "source" && (
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files
                  if (!files || files.length === 0) return

                  const assetRefs = []
                  const existingRefs = data.config?.uploadedAssetRefs || []

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
                      console.error("[ImageNode] Failed to save uploaded image:", err)
                    }
                  }

                  if (assetRefs.length > 0) {
                    data?.onChange?.({
                      uploadedAssetRefs: [...existingRefs, ...assetRefs],
                      mode: "uploaded",
                    })
                  }

                  // Reset file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
              />

              {/* Action buttons: Upload or Open Library */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-muted/30 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  style={{ borderColor: "var(--border-strong)" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-xs">upload</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-muted/30 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  style={{ borderColor: "var(--border-strong)" }}
                  onClick={() => {
                    if (data?.onRequestLibrarySelection) {
                      data.onRequestLibrarySelection()
                    }
                  }}
                >
                  <Library className="w-4 h-4" />
                  <span className="text-xs">library</span>
                </Button>
              </div>

              {/* Display selected images */}
              {localImages.length > 0 && (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {localImages.length} image{localImages.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Uploaded images grid */}
                  <div
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{
                      contentVisibility: "auto",
                    }}
                  >
                    <div
                      className={`grid gap-2`}
                      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                    >
                      {localImages.map((img, idx) => (
                        <div
                          key={`uploaded-${idx}`}
                          className="relative overflow-hidden rounded-none border group cursor-pointer"
                          style={{ aspectRatio: "1/1" }}
                        >
                          <img
                            src={img || "/placeholder.svg"}
                            alt={`Source image ${idx + 1}`}
                            className="block w-full h-full object-cover rounded-none"
                            width={512}
                            height={512}
                            loading="lazy"
                            onClick={() => setLightboxImageId(`uploaded-${idx}`)}
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          {/* Action buttons */}
                          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                              onClick={(e) => {
                                e.stopPropagation()
                                setLightboxImageId(`uploaded-${idx}`)
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
                                link.href = img
                                link.download = `source-image-${idx + 1}.png`
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
                                ;(async () => {
                                  try {
                                    // Delete from AssetManager
                                    const refs = data.config?.uploadedAssetRefs || []
                                    if (refs[idx]) {
                                      await assetManager.deleteAsset(refs[idx], { force: true })
                                    }
                                    // Remove from array
                                    const newRefs = [...refs]
                                    newRefs.splice(idx, 1)
                                    data?.onChange?.({
                                      uploadedAssetRefs: newRefs,
                                      mode: newRefs.length > 0 ? "uploaded" : "generate",
                                    })
                                  } catch (err) {
                                    console.error("[ImageNode] Failed to delete source image:", err)
                                  }
                                })()
                              }}
                              title="Remove image"
                            >
                              <X className="w-3 h-3 text-white" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </NodeContent>
      </NodeContainer>

      {/* Delete confirmation popover */}
      {deletePopoverOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setDeletePopoverOpen(false)}
          style={{ backgroundColor: "transparent" }}
        >
          <div
            className="absolute w-72 p-3 border border-border rounded-md bg-background shadow-lg"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium mb-1">
                  delete{" "}
                  {deleteMode === "multiple"
                    ? `${selectedImages.size} image${selectedImages.size !== 1 ? "s" : ""}`
                    : "image"}{" "}
                  from library?
                </p>
                <p className="text-muted-foreground text-xs mb-2">this cannot be undone</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-xs text-red-500 hover:text-red-500 hover:bg-red-500/10 border-red-500/20"
                  onClick={async () => {
                    if (workflowId) {
                      if (deleteMode === "single" && deleteTarget) {
                        const item = imageHistory.find((i) => i.id === deleteTarget)
                        if (item?.assetRef) {
                          await assetManager.deleteAsset(item.assetRef, { force: true })
                        }
                        workflowStore.removeFromResultHistory(workflowId, id, deleteTarget)
                      } else if (deleteMode === "multiple") {
                        for (const imgId of selectedImages) {
                          const item = imageHistory.find((i) => i.id === imgId)
                          if (item?.assetRef) {
                            await assetManager.deleteAsset(item.assetRef, { force: true })
                          }
                          workflowStore.removeFromResultHistory(workflowId, id, imgId)
                        }
                      }
                    }
                    setSelectedImages(new Set())
                    setDeletePopoverOpen(false)
                  }}
                >
                  delete permanently
                </Button>
              </div>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeletePopoverOpen(false)
                  }}
                  className="h-7 px-3"
                >
                  <X className="w-4 h-4 mr-1" />
                  cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImageId && (
        <Lightbox
          images={
            lightboxImageId.startsWith("uploaded-") && localImages.length > 0
              ? localImages.map((img, idx) => ({ id: `uploaded-${idx}`, url: img }))
              : imageHistory
          }
          currentImageId={lightboxImageId}
          onClose={() => setLightboxImageId(null)}
          onNavigate={(imageId) => {
            setLightboxImageId(imageId)
            setSelectedImageId(imageId)
          }}
          downloadFilename={(image) => `image-${image.id}.png`}
        />
      )}
    </>
  )
}
