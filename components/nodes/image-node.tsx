"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { ImageIcon } from "lucide-react"
import { NodeContainer, NodeHeader, NodeContent } from "@/components/node-components"
import { Lightbox } from "@/components/lightbox"
import { useAssets } from "@/lib/hooks/use-asset"
import { workflowEngine } from "@/lib/workflow-engine"
import { assetManager, type AssetRef } from "@/lib/store/asset-manager"
import { ModelTab } from "./image-node/model-tab"
import { SourceTab } from "./image-node/source-tab"
import { DropZone } from "./image-node/drop-zone"

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
  const workflowId = data.workflowId
  const [model, setModel] = useState(data.config?.model || "black-forest-labs/flux-1-schnell")
  const nodeWidth = width || 256
  const containerRef = useRef<HTMLDivElement>(null)
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null)
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [dragOverSource, setDragOverSource] = useState(false)
  const [isDraggingGlobally, setIsDraggingGlobally] = useState(false)

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
    return mode === "uploaded" ? "source" : "model"
  })

  // Save activeTab to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem(`image-node-tab-${id}`, activeTab)
  }, [activeTab, id])

  // Listen for global drag state changes - show drop zone globally when dragging starts
  useEffect(() => {
    const handleDragStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ sourceNodeId: string | null }>
      const sourceNodeId = customEvent.detail.sourceNodeId
      // Show drop zone if dragging from a different node (not this one)
      setIsDraggingGlobally(sourceNodeId !== null && sourceNodeId !== id)
    }

    // Also listen for drag end to clear state
    const handleDragEnd = () => {
      setIsDraggingGlobally(false)
    }

    window.addEventListener("image-drag-state-changed", handleDragStateChange)
    document.addEventListener("dragend", handleDragEnd)
    return () => {
      window.removeEventListener("image-drag-state-changed", handleDragStateChange)
      document.removeEventListener("dragend", handleDragEnd)
    }
  }, [id])

  // Resolve asset references from resultHistory
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
  const imageHistory: Array<{
    id: string
    url: string
    isPending?: boolean
    metadata?: any
    executionId?: string
    assetRef?: AssetRef
  }> = useMemo(() => {
    const actual = [...assetsWithMetadata].reverse()

    if (!data.workflowId || mode === "uploaded") {
      return actual
    }

    const completedExecutionIds = new Set(
      actual.filter((item) => item.metadata?.executionId).map((item) => item.metadata.executionId)
    )

    const executions = workflowEngine.getAllExecutions()
    const pendingExecutions = executions.filter((e) => {
      if (e.workflowId !== data.workflowId) return false
      if (e.status !== "queued" && e.status !== "running") return false
      if (completedExecutionIds.has(e.id)) return false
      const snapshot = workflowEngine.getQueueSnapshot?.(e.id)
      const hasThisNode = snapshot?.nodes?.some((n: any) => n.id === id)
      return hasThisNode || false
    })

    const placeholders = pendingExecutions.map((e) => ({
      id: `pending-${e.id}`,
      url: "",
      isPending: true,
      executionId: e.id,
    }))

    return [...placeholders, ...actual]
  }, [assetsWithMetadata, data.workflowId, id, mode, queueVersion])

  const isRunning = data.status === "running"

  const [localImages, setLocalImages] = useState<string[]>([])

  const handleViewSettings = (metadata: any, resultId: string) => {
    setSelectedMetadata(metadata)
    setSelectedImageId(resultId)
    if (data.onMetadataSelected) {
      data.onMetadataSelected(metadata, resultId)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loadedImages: string[] = []

        if (
          data.config?.uploadedAssetRefs &&
          Array.isArray(data.config.uploadedAssetRefs) &&
          data.config.uploadedAssetRefs.length > 0
        ) {
          for (const ref of data.config.uploadedAssetRefs) {
            try {
              const asset = await assetManager.loadAsset(ref)
              if (asset && asset.data) {
                loadedImages.push(asset.data)
              }
            } catch (err) {
              console.error("[ImageNode] Failed to load asset:", ref, err)
            }
          }
        } else if (data.config?.uploadedAssetRef) {
          const asset = await assetManager.loadAsset(data.config.uploadedAssetRef)
          if (asset && asset.data) loadedImages.push(asset.data)
        } else if (data.config?.localImage) {
          loadedImages.push(data.config.localImage)
        }

        if (!cancelled) {
          setLocalImages(loadedImages)
        }
      } catch (err) {
        console.error("[ImageNode] Failed to load uploaded images:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, data.config?.uploadedAssetRefs, data.config?.uploadedAssetRef, data.config?.localImage])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverSource(false)

    // Check if dragging from same node
    const { dragState } = await import("./image-node/drag-state")
    if (dragState.isFromSameNode(id)) {
      return
    }

    try {
      const dragData = e.dataTransfer.getData("application/json")
      if (dragData) {
        const parsed = JSON.parse(dragData)
        if (parsed.type === "image-from-history" && parsed.assetRef) {
          if (activeTab !== "source") {
            setActiveTab("source")
            await new Promise((resolve) => setTimeout(resolve, 50))
          }

          const existingRefs = data.config?.uploadedAssetRefs || []
          const assetRef: AssetRef = parsed.assetRef

          const exists = existingRefs.some(
            (ref: AssetRef) => ref.kind === assetRef.kind && ref.assetId === assetRef.assetId
          )
          if (exists) {
            return
          }

          const newRefs = [...existingRefs, assetRef]

          if (data?.onChange) {
            data.onChange({
              uploadedAssetRefs: newRefs,
              mode: "uploaded",
            })
          }
          return
        }
      }
    } catch (err) {
      console.error("[ImageNode] Failed to handle drop:", err)
    }
  }

  const handleDragOver = async (e: React.DragEvent) => {
    const dragData = e.dataTransfer.types
    if (dragData.includes("application/json")) {
      // Check if dragging from same node
      const { dragState } = await import("./image-node/drag-state")
      if (dragState.isFromSameNode(id)) {
        e.dataTransfer.dropEffect = "none"
        return
      }
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "copy"
      setDragOverSource(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (
      e.currentTarget === e.target ||
      (e.currentTarget.contains(e.relatedTarget as Node) === false &&
        e.relatedTarget !== e.currentTarget)
    ) {
      setDragOverSource(false)
    }
  }

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
          <div
            className="flex-1 flex flex-col min-h-0 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {activeTab === "model" && (
              <ModelTab
                model={model}
                onModelChange={(v) => {
                  setModel(v)
                  if (data?.onChange) data.onChange({ model: v })
                }}
                hasImageInput={data?.hasImageInput || false}
                imageHistory={imageHistory}
                workflowId={workflowId}
                nodeId={id}
                selectedImageId={selectedImageId}
                onImageClick={handleViewSettings}
                onLightbox={setLightboxImageId}
                nodeWidth={nodeWidth}
              />
            )}

            {activeTab === "source" && (
              <SourceTab
                localImages={localImages}
                uploadedAssetRefs={data.config?.uploadedAssetRefs || []}
                onChange={(cfg) => {
                  if (data?.onChange) data.onChange(cfg)
                }}
                onRequestLibrarySelection={data?.onRequestLibrarySelection}
                onLightbox={setLightboxImageId}
                nodeWidth={nodeWidth}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                isDraggingGlobally={isDraggingGlobally}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragOverSource(false)

                  // Check if dragging from same node
                  const { dragState } = await import("./image-node/drag-state")
                  if (dragState.isFromSameNode(id)) {
                    return
                  }

                  try {
                    // Handle file drops (only in source tab)
                    const files = e.dataTransfer.files
                    if (files && files.length > 0) {
                      const assetRefs = []
                      const existingRefs = data.config?.uploadedAssetRefs || []

                      for (let i = 0; i < files.length; i++) {
                        const file = files[i]
                        if (!file.type.startsWith("image/")) continue

                        try {
                          const url = await new Promise<string>((resolve) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(String(reader.result))
                            reader.readAsDataURL(file)
                          })

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
                    }
                  } catch (err) {
                    console.error("[ImageNode] Failed to handle drop:", err)
                  }
                }}
              />
            )}

            <DropZone isVisible={isDraggingGlobally || dragOverSource} activeTab={activeTab} />
          </div>
        </NodeContent>
      </NodeContainer>

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
