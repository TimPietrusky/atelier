"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { useReactFlow } from "@xyflow/react"

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const handleZoomIn = () => {
    zoomIn({ duration: 200 })
  }

  const handleZoomOut = () => {
    zoomOut({ duration: 200 })
  }

  const handleFitView = () => {
    fitView({ duration: 200, padding: 0.2 })
  }

  return (
    <div className="flex items-center gap-0.5 bg-background/90 backdrop-blur-sm border border-border/50 rounded-md p-0.5 h-8">
      <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-7 w-7 hover:bg-muted" title="Zoom In">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-7 w-7 hover:bg-muted" title="Zoom Out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleFitView} className="h-7 w-7 hover:bg-muted" title="Fit View">
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
