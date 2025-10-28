"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Image as ImageIcon, Download, Trash2, Search, RotateCcw } from "lucide-react"
import { listAllAssets, getAssetStats } from "@/lib/utils/list-all-assets"
import { assetManager, type Asset, type AssetMetadata } from "@/lib/store/asset-manager"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"
import { Lightbox } from "@/components/lightbox"
import { VirtualizedAssetGrid } from "@/components/virtualized-asset-grid"

interface MediaManagerProps {
  onClose: () => void
  onSelectAsset?: (assetId: string) => void
  selectionMode?: boolean
  onUseAsset?: (assetId: string) => void
}

interface MediaSettings {
  sortBy: "date" | "size" | "workflow" | "model"
  sortOrder: "asc" | "desc"
  filterWorkflow: string | "all"
  filterModel: string | "all"
  searchQuery: string
  filterSource: string | "all"
}

const defaultSettings: MediaSettings = {
  sortBy: "date",
  sortOrder: "desc",
  filterWorkflow: "all",
  filterModel: "all",
  searchQuery: "",
  filterSource: "all",
}

export function MediaManagerComponent({
  onClose,
  onSelectAsset,
  selectionMode = false,
  onUseAsset,
}: MediaManagerProps) {
  const [assets, setAssets] = useState<AssetMetadata[]>([])
  const [settings, setSettings] = useState<MediaSettings>(defaultSettings)
  const [stats, setStats] = useState<any>(null)
  const [resetPopoverOpen, setResetPopoverOpen] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const workflows = useWorkflowStore((s) => s.workflows)
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; usage?: any[] } | null>(null)
  const [lightboxAssetId, setLightboxAssetId] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })

  // Load media settings from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("media-manager-settings")
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Save settings to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("media-manager-settings", JSON.stringify(settings))
    } catch {}
  }, [settings])

  // Load assets on mount (metadata only)
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const allAssets = await listAllAssets(true) // excludeData: true
      const assetStats = await getAssetStats()
      setAssets(allAssets as AssetMetadata[])
      setStats(assetStats)
      setIsLoading(false)
    }

    load()
  }, [])

  // Track container dimensions for virtual grid
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Filter and sort assets
  let filtered = [...assets]

  if (settings.searchQuery) {
    const query = settings.searchQuery.toLowerCase()
    filtered = filtered.filter(
      (a) =>
        a.metadata?.prompt?.toLowerCase().includes(query) ||
        a.metadata?.model?.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query)
    )
  }

  if (settings.filterWorkflow !== "all") {
    filtered = filtered.filter((a) => a.metadata?.workflowId === settings.filterWorkflow)
  }

  if (settings.filterModel !== "all") {
    filtered = filtered.filter((a) => a.metadata?.model === settings.filterModel)
  }

  if (settings.filterSource !== "all") {
    filtered = filtered.filter((a) => a.metadata?.source === settings.filterSource)
  }

  filtered.sort((a, b) => {
    let comparison = 0

    switch (settings.sortBy) {
      case "date":
        comparison = (a.createdAt || 0) - (b.createdAt || 0)
        break
      case "size":
        comparison = (a.bytes || 0) - (b.bytes || 0)
        break
      case "workflow":
        comparison = (a.metadata?.workflowId || "").localeCompare(b.metadata?.workflowId || "")
        break
      case "model":
        comparison = (a.metadata?.model || "").localeCompare(b.metadata?.model || "")
        break
    }

    return settings.sortOrder === "asc" ? comparison : -comparison
  })

  const uniqueWorkflows = Array.from(
    new Set(assets.map((a) => a.metadata?.workflowId).filter(Boolean))
  )
  const uniqueModels = Array.from(new Set(assets.map((a) => a.metadata?.model).filter(Boolean)))
  const uniqueSources = Array.from(new Set(assets.map((a) => a.metadata?.source).filter(Boolean)))

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const result = await assetManager.deleteAsset({ kind: "idb", assetId })

      if (!result.success && result.usage && result.usage.length > 0) {
        setAssetToDelete({ id: assetId, usage: result.usage })
        setDeletePopoverOpen(true)
      }
    } catch (err) {
      console.error("Failed to delete asset:", err)
    }
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return
    try {
      await assetManager.deleteAsset({ kind: "idb", assetId: assetToDelete.id }, { force: true })
      // Reload after single deletion
      const allAssets = await listAllAssets(true)
      setAssets(allAssets as AssetMetadata[])
      const assetStats = await getAssetStats()
      setStats(assetStats)
    } catch (err) {
      console.error("Failed to force delete asset:", err)
    } finally {
      setDeletePopoverOpen(false)
      setAssetToDelete(null)
    }
  }

  const handleDeleteSelectedAssets = async () => {
    try {
      // Delete all in parallel
      await Promise.all(
        Array.from(selectedAssets).map((assetId) =>
          assetManager.deleteAsset({ kind: "idb", assetId })
        )
      )

      // Remove from state (no reload needed)
      setAssets((prev) => prev.filter((a) => !selectedAssets.has(a.id)))

      // Recalculate stats from remaining assets
      setStats((prev) => {
        const deletedBytes = Array.from(selectedAssets).reduce((sum, id) => {
          const deleted = assets.find((a) => a.id === id)
          return sum + (deleted?.bytes || 0)
        }, 0)
        return {
          ...prev,
          totalAssets: prev.totalAssets - selectedAssets.size,
          totalBytes: Math.max(0, prev.totalBytes - deletedBytes),
          totalMB: (Math.max(0, prev.totalBytes - deletedBytes) / 1024 / 1024).toFixed(2),
        }
      })

      setSelectedAssets(new Set())
    } catch (err) {
      console.error("Failed to delete assets:", err)
    }
  }

  const handleDownloadAsset = (asset: Asset) => {
    const link = document.createElement("a")
    link.href = asset.data
    link.download = `${asset.id}.png`
    link.click()
  }

  const handleResetSettings = () => {
    setSettings(defaultSettings)
    setResetPopoverOpen(false)
  }

  const columnCount = Math.max(3, Math.floor(containerDimensions.width / 220))
  const rowHeight = 220

  return (
    <div className="h-full w-full bg-background flex flex-col relative z-[60]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-[var(--text-secondary)]" />
          <div>
            <h1 className="text-2xl font-bold">
              {selectionMode ? "Select Image from Library" : "Media Library"}
            </h1>
            {stats && (
              <p className="text-sm text-muted-foreground">
                {assets.length} assets • {stats.totalMB} MB total
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSelectionMode && selectedAssets.size > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 hover:bg-[var(--surface-elevated)]"
                title="Download selected"
                onClick={async () => {
                  for (const assetId of selectedAssets) {
                    const data = await assetManager.getAssetData(assetId)
                    if (data) {
                      const asset: Asset = {
                        id: assetId,
                        kind: "idb",
                        type: "image",
                        data,
                      }
                      handleDownloadAsset(asset)
                    }
                  }
                }}
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 hover:bg-[var(--surface-elevated)]"
                title="Delete selected"
                onClick={handleDeleteSelectedAssets}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </>
          )}
          {isSelectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSelectionMode(false)
                setSelectedAssets(new Set())
              }}
              className="h-9 px-4"
            >
              Cancel
            </Button>
          )}
          {!isSelectionMode && (
            <>
              {!selectionMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="h-9 px-4"
                >
                  Select
                </Button>
              )}
              {selectionMode && (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      const allIds = new Set(filtered.map((a) => a.id))
                      setSelectedAssets(allIds)
                    }}
                    className="h-11 px-6 text-base font-normal bg-transparent border border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] rounded"
                  >
                    All
                  </Button>
                  <Button
                    size="lg"
                    disabled={!selectedAssetId}
                    onClick={() => {
                      if (selectedAssetId && onUseAsset) {
                        onUseAsset(selectedAssetId)
                      }
                    }}
                    className="h-11 px-8 text-base font-semibold bg-white text-black hover:bg-white/90 rounded"
                  >
                    Use Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onClose}
                    className="h-11 px-6 text-base font-normal bg-transparent border border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] rounded"
                  >
                    Cancel
                  </Button>
                </>
              )}
              {!selectionMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 px-3 hover:bg-[var(--surface-elevated)]"
                >
                  <X className="w-5 h-5 mr-2" />
                  Back to Canvas
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 space-y-4">
        {/* Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by prompt, model, or ID..."
            value={settings.searchQuery}
            onChange={(e) => setSettings({ ...settings, searchQuery: e.target.value })}
            className="pl-10 h-10 text-base"
          />
        </div>

        {/* Filters and Sort Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Workflow Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Workflow:</span>
            <Select
              value={settings.filterWorkflow}
              onValueChange={(value) => setSettings({ ...settings, filterWorkflow: value })}
            >
              <SelectTrigger className="h-9 text-sm min-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {uniqueWorkflows.map((wfId) => {
                  const wfIdStr = String(wfId)
                  return (
                    <SelectItem key={wfIdStr} value={wfIdStr}>
                      {workflows[wfIdStr]?.name || wfIdStr}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Model:</span>
            <Select
              value={settings.filterModel}
              onValueChange={(value) => setSettings({ ...settings, filterModel: value })}
            >
              <SelectTrigger className="h-9 text-sm min-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {uniqueModels.map((model) => {
                  const modelStr = String(model)
                  return (
                    <SelectItem key={modelStr} value={modelStr}>
                      {modelStr.split("/")[1] || modelStr}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Source:</span>
            <Select
              value={settings.filterSource}
              onValueChange={(value) => setSettings({ ...settings, filterSource: value })}
            >
              <SelectTrigger className="h-9 text-sm min-w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((source) => {
                  const sourceStr = String(source)
                  return (
                    <SelectItem key={sourceStr} value={sourceStr}>
                      {sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select
              value={settings.sortBy}
              onValueChange={(value: any) => setSettings({ ...settings, sortBy: value })}
            >
              <SelectTrigger className="h-9 text-sm w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="workflow">Workflow</SelectItem>
                <SelectItem value="model">Model</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select
            value={settings.sortOrder}
            onValueChange={(value: any) => setSettings({ ...settings, sortOrder: value })}
          >
            <SelectTrigger className="h-9 text-sm w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Popover open={resetPopoverOpen} onOpenChange={setResetPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <p className="text-sm text-foreground">Reset all filters and sorting to default?</p>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResetPopoverOpen(false)}
                    className="h-8 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleResetSettings}
                    className="h-8 text-sm bg-[var(--status-error)] text-white hover:bg-[var(--status-error)]/90"
                  >
                    Yes, Reset
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Assets Grid - Virtual Scrolling */}
      <div ref={containerRef} className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-[var(--border-strong)] border-t-transparent animate-spin" />
              <p className="text-lg text-muted-foreground font-medium">Loading assets...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg text-muted-foreground font-medium mb-2">
                {assets.length === 0 ? "No media yet" : "No results found"}
              </p>
              <p className="text-sm text-muted-foreground/70">
                {assets.length === 0
                  ? "Generated images will appear here"
                  : "Try adjusting your filters"}
              </p>
            </div>
          </div>
        ) : (
          containerDimensions.width > 0 && (
            <VirtualizedAssetGrid
              assets={filtered}
              columnCount={columnCount}
              rowHeight={rowHeight}
              onSelectAsset={setSelectedAssetId}
              onDeleteAsset={handleDeleteAsset}
              onDownloadAsset={handleDownloadAsset}
              onMaximize={setLightboxAssetId}
              selectedAssetId={selectedAssetId}
              lightboxAssetId={lightboxAssetId}
              isSelectionMode={isSelectionMode}
              selectedAssets={selectedAssets}
              onToggleSelection={(assetId) => {
                setSelectedAssets((prev) => {
                  const next = new Set(prev)
                  if (next.has(assetId)) {
                    next.delete(assetId)
                  } else {
                    next.add(assetId)
                  }
                  return next
                })
              }}
              containerHeight={containerDimensions.height}
              containerWidth={containerDimensions.width}
            />
          )
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-card/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">
            Showing {filtered.length} of {assets.length} assets
          </span>
          <span className="text-muted-foreground">
            {stats ? `${stats.totalMB} MB • ${stats.totalAssets} total` : ""}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Popover */}
      <Popover open={deletePopoverOpen} onOpenChange={setDeletePopoverOpen}>
        <PopoverContent side="top" align="center" className="w-80 p-3 z-[10000]">
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium mb-1">asset is in use</p>
              {assetToDelete?.usage && assetToDelete.usage.length > 0 && (
                <>
                  <p className="text-muted-foreground text-xs mb-2">
                    used in {assetToDelete.usage.length} workflow
                    {assetToDelete.usage.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 mb-2">
                    {assetToDelete.usage.slice(0, 3).map((u: any, i: number) => (
                      <li key={i}>
                        • {u.workflowName} ({u.nodeTitle})
                      </li>
                    ))}
                    {assetToDelete.usage.length > 3 && (
                      <li>• ...and {assetToDelete.usage.length - 3} more</li>
                    )}
                  </ul>
                  <p className="text-xs text-red-500">
                    force delete? this will break those workflows
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeletePopoverOpen(false)
                  setAssetToDelete(null)
                }}
                className="h-7 px-3"
              >
                <X className="w-4 h-4 mr-1" />
                cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConfirmDelete}
                className="h-7 px-3 text-red-500 hover:text-red-500 hover:bg-red-500/10"
              >
                delete
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Image Lightbox */}
      {lightboxAssetId && (
        <Lightbox
          images={filtered.map((asset) => ({
            id: asset.id,
            url: "", // Will be loaded on-demand when lightbox opens
          }))}
          currentImageId={lightboxAssetId}
          onClose={() => setLightboxAssetId(null)}
          onNavigate={(assetId) => {
            setLightboxAssetId(assetId)
            setSelectedAssetId(assetId)
          }}
          downloadFilename={(image) => {
            const asset = filtered.find((a) => a.id === image.id)
            const model = asset?.metadata?.model || "unknown"
            return `${model}-${image.id}.png`
          }}
        />
      )}
    </div>
  )
}

export { MediaManagerComponent as MediaManager }
