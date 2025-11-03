"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Library, X, Download, Maximize2 } from "lucide-react"
import { assetManager, type AssetRef } from "@/lib/store/asset-manager"
import { SourceImageItem } from "./source-image-item"

interface SourceTabProps {
  localImages: string[]
  uploadedAssetRefs: AssetRef[]
  onChange: (config: Record<string, any>) => void
  onRequestLibrarySelection?: () => void
  onLightbox: (imageId: string) => void
  nodeWidth: number
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDraggingGlobally?: boolean
}

export function SourceTab({
  localImages,
  uploadedAssetRefs,
  onChange,
  onRequestLibrarySelection,
  onLightbox,
  nodeWidth,
  onDragOver,
  onDragLeave,
  onDrop,
  isDraggingGlobally = false,
}: SourceTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Use capture phase to intercept wheel events before ReactFlow
  useEffect(() => {
    const element = scrollContainerRef.current
    if (!element) return

    const handleWheel = (e: WheelEvent) => {
      // Always prevent ReactFlow zoom when mouse is over source images
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const assetRefs = []
    const existingRefs = uploadedAssetRefs || []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
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
        console.error("[SourceTab] Failed to save uploaded image:", err)
      }
    }

    if (assetRefs.length > 0) {
      onChange({
        uploadedAssetRefs: [...existingRefs, ...assetRefs],
        mode: "uploaded",
      })
    }
  }

  const handleDelete = async (idx: number) => {
    try {
      const refs = [...uploadedAssetRefs]
      if (refs[idx]) {
        await assetManager.deleteAsset(refs[idx], { force: true })
      }
      const newRefs = refs.filter((_, i) => i !== idx)
      onChange({
        uploadedAssetRefs: newRefs,
        mode: newRefs.length > 0 ? "uploaded" : "generate",
      })
    } catch (err) {
      console.error("[SourceTab] Failed to delete source image:", err)
    }
  }

  return (
    <div
      className="flex flex-col gap-2 flex-1 min-h-0"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileUpload(e.target.files)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }}
      />

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
            onRequestLibrarySelection?.()
          }}
        >
          <Library className="w-4 h-4" />
          <span className="text-xs">library</span>
        </Button>
      </div>

      {localImages.length > 0 ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {localImages.length} image{localImages.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ contentVisibility: "auto" }}
          >
            {localImages.length === 1 ? (
              <div className="relative w-full border group cursor-pointer">
                <img
                  src={localImages[0] || "/placeholder.svg"}
                  alt="Source image"
                  className="block w-full h-auto rounded-none"
                  style={{ maxHeight: "100%" }}
                  loading="lazy"
                  onClick={() => onLightbox(`uploaded-0`)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLightbox(`uploaded-0`)
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
                      link.href = localImages[0]
                      link.download = `source-image.png`
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
                      handleDelete(0)
                    }}
                    title="Remove image"
                  >
                    <X className="w-3 h-3 text-white" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 120px), 1fr))",
                  gridAutoRows: "min-content",
                  gridAutoFlow: "row dense",
                }}
              >
                {localImages.map((img, idx) => (
                  <SourceImageItem
                    key={`uploaded-${idx}`}
                    img={img}
                    idx={idx}
                    onLightbox={() => onLightbox(`uploaded-${idx}`)}
                    onDelete={() => handleDelete(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <div
            className="relative w-full border-2 border-dashed border-[var(--border-strong)] bg-muted/20 flex items-center justify-center cursor-pointer transition-colors hover:border-[var(--node-image)] hover:bg-[var(--node-image)]/5"
            style={{
              aspectRatio: "1/1",
              minHeight: "200px",
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {!isDraggingGlobally && (
              <div className="flex flex-col items-center gap-2 text-center px-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">drop image here</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
