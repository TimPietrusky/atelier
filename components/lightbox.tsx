"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { assetManager } from "@/lib/store/asset-manager"

export interface LightboxImage {
  id: string
  url: string
  isPending?: boolean
}

export interface LightboxProps {
  /** Array of images to display */
  images: LightboxImage[]
  /** ID of the currently displayed image */
  currentImageId: string
  /** Callback when lightbox closes */
  onClose: () => void
  /** Callback when navigating to a different image (to update selection in parent) */
  onNavigate?: (imageId: string) => void
  /** Optional function to generate download filename */
  downloadFilename?: (image: LightboxImage, index: number) => string
}

/**
 * Unified lightbox component for fullscreen image viewing with navigation.
 *
 * Features:
 * - Previous/Next navigation buttons (only shown when available)
 * - Keyboard controls: Arrow Left (←) for previous, Arrow Right (→) for next, Escape to close
 * - Image counter showing current position
 * - Download and close buttons
 * - On-demand image data fetching for memory efficiency
 * - Navigating updates the selected image in parent via onNavigate callback
 * - Rendered via portal to document.body for proper event handling
 */
export function Lightbox({
  images,
  currentImageId,
  onClose,
  onNavigate,
  downloadFilename,
}: LightboxProps) {
  const imagesRef = useRef(images)
  const [imageDataCache, setImageDataCache] = useState<Map<string, string>>(new Map())
  const [isLoadingImage, setIsLoadingImage] = useState(false)

  // Keep images ref in sync (for keyboard handler stability)
  useEffect(() => {
    imagesRef.current = images
  }, [images])

  // Fetch image data on-demand when current image changes
  useEffect(() => {
    async function fetchCurrentImage() {
      if (!currentImage?.url || currentImage.url.startsWith("data:")) {
        // URL already loaded or is a data URL
        return
      }

      if (imageDataCache.has(currentImage.id)) {
        // Already cached
        return
      }

      setIsLoadingImage(true)
      const data = await assetManager.getAssetData(currentImage.id)
      if (data) {
        setImageDataCache((prev) => new Map(prev).set(currentImage.id, data))
      }
      setIsLoadingImage(false)
    }

    fetchCurrentImage()
  }, [currentImageId, imageDataCache])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        e.stopPropagation()
        const history = imagesRef.current
        const currentIndex = history.findIndex((img) => img.id === currentImageId)
        if (currentIndex > 0) {
          const newImage = history[currentIndex - 1]
          if (!newImage.isPending) {
            onNavigate?.(newImage.id)
          }
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        e.stopPropagation()
        const history = imagesRef.current
        const currentIndex = history.findIndex((img) => img.id === currentImageId)
        if (currentIndex >= 0 && currentIndex < history.length - 1) {
          const newImage = history[currentIndex + 1]
          if (!newImage.isPending) {
            onNavigate?.(newImage.id)
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    // Use capture phase to intercept before other handlers
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [currentImageId, onClose, onNavigate])

  const currentImage = images.find((img) => img.id === currentImageId)
  const currentIndex = images.findIndex((img) => img.id === currentImageId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1 && !images[currentIndex + 1]?.isPending

  if (!currentImage || typeof document === "undefined") {
    return null
  }

  // Use cached data if available, otherwise fall back to url or show loading
  const displayUrl = imageDataCache.get(currentImage.id) || currentImage.url

  const handleDownload = async () => {
    const link = document.createElement("a")
    let downloadUrl = displayUrl

    // If we don't have cached data, fetch it
    if (!imageDataCache.has(currentImage.id) && !currentImage.url.startsWith("data:")) {
      const data = await assetManager.getAssetData(currentImage.id)
      if (data) {
        downloadUrl = data
      }
    }

    link.href = downloadUrl
    link.download = downloadFilename?.(currentImage, currentIndex) || `image-${currentImage.id}.png`
    link.click()
  }

  const handlePrevious = () => {
    if (hasPrev) {
      const newImage = images[currentIndex - 1]
      if (!newImage.isPending) {
        onNavigate?.(newImage.id)
      }
    }
  }

  const handleNext = () => {
    if (hasNext) {
      const newImage = images[currentIndex + 1]
      if (!newImage.isPending) {
        onNavigate?.(newImage.id)
      }
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-8"
      onClick={onClose}
    >
      {/* Top right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 bg-background/10 hover:bg-background/20 text-white"
          onClick={(e) => {
            e.stopPropagation()
            handleDownload()
          }}
          title="Download image"
        >
          <Download className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 bg-background/10 hover:bg-background/20 text-white"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Previous button */}
      {hasPrev && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-background/10 hover:bg-background/20 text-white"
          onClick={(e) => {
            e.stopPropagation()
            handlePrevious()
          }}
          title="Previous (←)"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      {/* Next button */}
      {hasNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-background/10 hover:bg-background/20 text-white"
          onClick={(e) => {
            e.stopPropagation()
            handleNext()
          }}
          title="Next (→)"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* Image counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/10 text-white px-3 py-1.5 rounded text-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Main image or loading state */}
      {isLoadingImage && !displayUrl.startsWith("data:") ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm">Loading image...</p>
        </div>
      ) : (
        <img
          src={displayUrl}
          alt="Enlarged view"
          className="max-w-full max-h-full object-contain rounded-none"
          width={1024}
          height={1024}
          loading="lazy"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>,
    document.body
  )
}
