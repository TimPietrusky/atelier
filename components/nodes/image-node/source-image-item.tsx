"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Maximize2 } from "lucide-react"

interface SourceImageItemProps {
  img: string
  idx: number
  onDelete: () => void
  onLightbox: () => void
}

export function SourceImageItem({ img, idx, onDelete, onLightbox }: SourceImageItemProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      const naturalWidth = imgRef.current.naturalWidth
      const naturalHeight = imgRef.current.naturalHeight
      if (naturalWidth > 0 && naturalHeight > 0) {
        setAspectRatio(naturalWidth / naturalHeight)
      }
    }
  }, [img])

  return (
    <div
      className="relative overflow-hidden rounded-none border group cursor-pointer"
      style={{
        aspectRatio: aspectRatio ? `${aspectRatio}` : "1/1",
        minHeight: "120px",
      }}
    >
      <img
        ref={imgRef}
        src={img || "/placeholder.svg"}
        alt={`Source image ${idx + 1}`}
        className="block w-full h-full object-cover rounded-none"
        loading="lazy"
        onLoad={(e) => {
          const target = e.target as HTMLImageElement
          const naturalWidth = target.naturalWidth
          const naturalHeight = target.naturalHeight
          if (naturalWidth > 0 && naturalHeight > 0) {
            setAspectRatio(naturalWidth / naturalHeight)
          }
        }}
        onClick={onLightbox}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
          onClick={(e) => {
            e.stopPropagation()
            onLightbox()
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
            onDelete()
          }}
          title="Remove image"
        >
          <X className="w-3 h-3 text-white" />
        </Button>
      </div>
    </div>
  )
}

