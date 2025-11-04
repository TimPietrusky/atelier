"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getImageModelMeta } from "@/lib/config"
import { getSortedModels, getModelDisplayName } from "@/lib/models"
import { ImageHistoryGrid } from "./image-history-grid"

interface ModelTabProps {
  model: string
  onModelChange: (model: string) => void
  hasImageInput: boolean
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
}

export function ModelTab({
  model,
  onModelChange,
  hasImageInput,
  imageHistory,
  workflowId,
  nodeId,
  selectedImageId,
  onImageClick,
  onLightbox,
  nodeWidth,
}: ModelTabProps) {
  const meta = getImageModelMeta(model)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [availableModels, setAvailableModels] = useState<any[]>([])

  useEffect(() => {
    const loadModels = async () => {
      // Show favorites first, or all if no favorites
      const models = await getSortedModels(false)
      setAvailableModels(models)
    }
    loadModels()
  }, [])

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger className="w-full h-7 text-sm px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {getModelDisplayName(m.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasImageInput && meta && meta.kind !== "img2img" && (
        <div className="text-[10px] text-muted-foreground">
          An input image is connected — consider selecting an edit model.
        </div>
      )}

      {imageHistory.length > 0 && (
        <div
          className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
          onWheel={(e) => {
            e.stopPropagation()
          }}
        >
          <ImageHistoryGrid
            imageHistory={imageHistory}
            workflowId={workflowId}
            nodeId={nodeId}
            selectedImageId={selectedImageId}
            onImageClick={onImageClick}
            onLightbox={onLightbox}
            nodeWidth={nodeWidth}
            isSelectionMode={isSelectionMode}
            selectedImages={selectedImages}
            onSelectionModeChange={setIsSelectionMode}
            onSelectedImagesChange={setSelectedImages}
          />
        </div>
      )}
    </div>
  )
}
