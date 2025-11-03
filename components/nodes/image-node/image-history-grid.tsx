"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, Check, Share2, Trash2, Loader2, Maximize2 } from "lucide-react"
import { workflowStore } from "@/lib/store/workflows"
import { assetManager } from "@/lib/store/asset-manager"

interface ImageHistoryGridProps {
  imageHistory: Array<{
    id: string
    url: string
    isPending?: boolean
    metadata?: any
    executionId?: string
    assetRef?: any
  }>
  workflowId?: string
  nodeId: string
  selectedImageId: string | null
  onImageClick: (metadata: any, imageId: string) => void
  onLightbox: (imageId: string) => void
  nodeWidth: number
  isSelectionMode: boolean
  selectedImages: Set<string>
  onSelectionModeChange: (mode: boolean) => void
  onSelectedImagesChange: (images: Set<string>) => void
}

export function ImageHistoryGrid({
  imageHistory,
  workflowId,
  nodeId,
  selectedImageId,
  onImageClick,
  onLightbox,
  nodeWidth,
  isSelectionMode,
  selectedImages,
  onSelectionModeChange,
  onSelectedImagesChange,
}: ImageHistoryGridProps) {
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState<"single" | "multiple">("single")
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Use capture phase to intercept wheel events before ReactFlow
  useEffect(() => {
    const element = scrollContainerRef.current
    if (!element) return

    const handleWheel = (e: WheelEvent) => {
      // Always prevent ReactFlow zoom when mouse is over image history
      e.stopPropagation()
      
      const canScroll = element.scrollHeight > element.clientHeight
      if (canScroll) {
        e.preventDefault()
        element.scrollTop += e.deltaY
      }
    }

    element.addEventListener("wheel", handleWheel, { capture: true, passive: false })
    return () => {
      element.removeEventListener("wheel", handleWheel, { capture: true } as any)
    }
  }, [])

  // Calculate grid columns based on node width
  const getGridCols = (width: number) => {
    const contentWidth = width - 24
    if (contentWidth < 280) return 2
    if (contentWidth < 360) return 3
    if (contentWidth < 440) return 4
    return 5
  }
  const gridCols = getGridCols(nodeWidth)

  return (
    <div 
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
      onWheel={(e) => {
        e.stopPropagation()
      }}
    >
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
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
                                return new File([blob], `image-${imgId}.png`, { type: "image/png" })
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
                          workflowStore.removeFromResultHistory(workflowId, nodeId, imgId)
                        })
                      }
                      onSelectedImagesChange(new Set())
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
                  onSelectedImagesChange(allIds)
                }}
              >
                all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => {
                  onSelectionModeChange(false)
                  onSelectedImagesChange(new Set())
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
              onClick={() => onSelectionModeChange(true)}
            >
              select
            </Button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border-strong) transparent",
        }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {imageHistory.map((item, idx) => {
            const isSelected = selectedImageId === item.id
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
                      className="block w-full h-full object-cover cursor-pointer rounded-none nodrag"
                      width={512}
                      height={512}
                      loading="lazy"
                      draggable={!item.isPending}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                      }}
                      onDragStart={(e) => {
                        if (item.isPending) {
                          e.preventDefault()
                          return
                        }
                        e.stopPropagation()
                        e.dataTransfer.effectAllowed = "copy"
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({
                            type: "image-from-history",
                            assetRef: item.assetRef,
                            imageUrl: item.url,
                            nodeId: nodeId,
                          })
                        )
                        // Set global drag source
                        import("./drag-state").then(({ dragState }) => {
                          dragState.setDragSource(nodeId)
                        })
                        if (e.currentTarget instanceof HTMLImageElement) {
                          const dragImage = e.currentTarget.cloneNode(true) as HTMLImageElement
                          dragImage.style.width = "100px"
                          dragImage.style.height = "100px"
                          dragImage.style.objectFit = "cover"
                          document.body.appendChild(dragImage)
                          dragImage.style.position = "absolute"
                          dragImage.style.top = "-1000px"
                          e.dataTransfer.setDragImage(dragImage, 50, 50)
                          setTimeout(() => document.body.removeChild(dragImage), 0)
                        }
                      }}
                      onDragEnd={(e) => {
                        // Clear global drag source
                        import("./drag-state").then(({ dragState }) => {
                          dragState.setDragSource(null)
                        })
                        // Also clear on drag end event
                        e.stopPropagation()
                      }}
                      onClick={() => {
                        if (isSelectionMode) {
                          const next = new Set(selectedImages)
                          if (next.has(item.id)) {
                            next.delete(item.id)
                          } else {
                            next.add(item.id)
                          }
                          onSelectedImagesChange(next)
                        } else {
                          if (item.metadata) {
                            onImageClick(item.metadata, item.id)
                          } else {
                            onLightbox(item.id)
                          }
                        }
                      }}
                    />
                    {isSelectionMode && selectedImages.has(item.id) && (
                      <div className="absolute top-1 left-1 w-5 h-5 bg-[var(--node-image)] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity pointer-events-none ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    />
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
                            onLightbox(item.id)
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
                        workflowStore.removeFromResultHistory(workflowId, nodeId, deleteTarget)
                      } else if (deleteMode === "multiple") {
                        for (const imgId of selectedImages) {
                          const item = imageHistory.find((i) => i.id === imgId)
                          if (item?.assetRef) {
                            await assetManager.deleteAsset(item.assetRef, { force: true })
                          }
                          workflowStore.removeFromResultHistory(workflowId, nodeId, imgId)
                        }
                      }
                    }
                    onSelectedImagesChange(new Set())
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
                  onClick={() => setDeletePopoverOpen(false)}
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
    </div>
  )
}

