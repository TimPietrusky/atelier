"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  X,
  GripVertical,
  Image as ImageIcon,
  Download,
  Trash2,
  Search,
  RotateCcw,
  Maximize2,
  Check,
  Share2,
} from "lucide-react"
import { listAllAssets, getAssetStats } from "@/lib/utils/list-all-assets"
import { assetManager, type Asset } from "@/lib/store/asset-manager"
import { useWorkflowStore } from "@/lib/store/workflows-zustand"
import { Lightbox } from "@/components/lightbox"

interface MediaManagerProps {
  onClose: () => void
  onSelectAsset?: (assetId: string) => void
  selectionMode?: boolean // If true, show "Use" and "Cancel" buttons
  onUseAsset?: (assetId: string) => void // Called when "Use" is clicked in selection mode
}

interface MediaSettings {
  sortBy: "date" | "size" | "workflow" | "model"
  sortOrder: "asc" | "desc"
  filterWorkflow: string | "all"
  filterModel: string | "all"
  searchQuery: string
}

const defaultSettings: MediaSettings = {
  sortBy: "date",
  sortOrder: "desc",
  filterWorkflow: "all",
  filterModel: "all",
  searchQuery: "",
}

export function MediaManagerComponent({
  onClose,
  onSelectAsset,
  selectionMode = false,
  onUseAsset,
}: MediaManagerProps) {
  const [assets, setAssets] = useState<Asset[]>([])
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

  // Load assets on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const allAssets = await listAllAssets()
      const assetStats = await getAssetStats()
      setAssets(allAssets)
      setStats(assetStats)
      setIsLoading(false)
    }

    load()
  }, [])

  // Filter and sort assets
  let filtered = [...assets]

  // Filter by search query
  if (settings.searchQuery) {
    const query = settings.searchQuery.toLowerCase()
    filtered = filtered.filter(
      (a) =>
        a.metadata?.prompt?.toLowerCase().includes(query) ||
        a.metadata?.model?.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query)
    )
  }

  // Filter by workflow
  if (settings.filterWorkflow !== "all") {
    filtered = filtered.filter((a) => a.metadata?.workflowId === settings.filterWorkflow)
  }

  // Filter by model
  if (settings.filterModel !== "all") {
    filtered = filtered.filter((a) => a.metadata?.model === settings.filterModel)
  }

  // Sort
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

  // Get unique workflows and models for filters
  const uniqueWorkflows = Array.from(
    new Set(assets.map((a) => a.metadata?.workflowId).filter(Boolean))
  )
  const uniqueModels = Array.from(new Set(assets.map((a) => a.metadata?.model).filter(Boolean)))

  const handleDeleteAsset = async (assetId: string) => {
    try {
      // Check if asset is in use
      const result = await assetManager.deleteAsset({ kind: "idb", assetId })

      if (!result.success && result.usage && result.usage.length > 0) {
        // Asset is in use, show popover to confirm force deletion
        setAssetToDelete({ id: assetId, usage: result.usage })
        setDeletePopoverOpen(true)
      } else if (result.success) {
        // Successfully deleted
        const allAssets = await listAllAssets()
        setAssets(allAssets)
        const assetStats = await getAssetStats()
        setStats(assetStats)
      }
    } catch (err) {
      console.error("Failed to delete asset:", err)
    }
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return
    try {
      const forceResult = await assetManager.deleteAsset(
        { kind: "idb", assetId: assetToDelete.id },
        { force: true }
      )
      if (forceResult.success) {
        // Reload assets
        const allAssets = await listAllAssets()
        setAssets(allAssets)
        const assetStats = await getAssetStats()
        setStats(assetStats)
      }
    } catch (err) {
      console.error("Failed to force delete asset:", err)
    } finally {
      setDeletePopoverOpen(false)
      setAssetToDelete(null)
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
                onClick={() => {
                  selectedAssets.forEach((assetId) => {
                    const asset = assets.find((a) => a.id === assetId)
                    if (asset) handleDownloadAsset(asset)
                  })
                }}
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 hover:bg-[var(--surface-elevated)]"
                title="Share selected"
                onClick={async () => {
                  if (navigator.share && selectedAssets.size > 0) {
                    try {
                      const files = await Promise.all(
                        Array.from(selectedAssets).map(async (assetId) => {
                          const asset = assets.find((a) => a.id === assetId)
                          if (asset?.data) {
                            const response = await fetch(asset.data)
                            const blob = await response.blob()
                            return new File([blob], `${assetId}.png`, { type: "image/png" })
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
                <Share2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 hover:bg-[var(--surface-elevated)]"
                title="Delete selected"
                onClick={async () => {
                  for (const assetId of selectedAssets) {
                    await handleDeleteAsset(assetId)
                  }
                  setSelectedAssets(new Set())
                }}
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

          {/* Reset Button with Popover Confirmation */}
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

      {/* Assets Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-24">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-[var(--border-strong)] border-t-transparent animate-spin" />
              <p className="text-lg text-muted-foreground font-medium">Loading assets...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-24">
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
          ) : (
            filtered.map((asset, index) => (
              <div
                key={asset.id || `asset-${index}`}
                className="group relative aspect-square rounded-none overflow-hidden cursor-pointer border"
                style={{
                  borderColor:
                    selectedAssetId === asset.id || lightboxAssetId === asset.id
                      ? "var(--node-image)"
                      : "var(--border)",
                  boxShadow:
                    selectedAssetId === asset.id || lightboxAssetId === asset.id
                      ? "rgba(255, 255, 255, 0.5) -2px 2px 0px"
                      : "none",
                }}
                onClick={() => {
                  if (isSelectionMode) {
                    setSelectedAssets((prev) => {
                      const next = new Set(prev)
                      if (next.has(asset.id)) {
                        next.delete(asset.id)
                      } else {
                        next.add(asset.id)
                      }
                      return next
                    })
                  } else {
                    setSelectedAssetId(asset.id)
                    if (selectionMode) {
                      // Just select it
                    } else {
                      onSelectAsset?.(asset.id)
                    }
                  }
                }}
              >
                <img
                  src={asset.data}
                  alt={asset.metadata?.prompt || "Asset"}
                  className="w-full h-full object-cover rounded-none"
                  width={512}
                  height={512}
                  loading="lazy"
                />

                {/* Selection indicator */}
                {isSelectionMode && selectedAssets.has(asset.id) && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-[var(--node-image)] rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Overlay with actions (hidden in selection mode) */}
                {!isSelectionMode && (
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity flex flex-col items-center justify-between p-3"
                    style={{
                      opacity: selectedAssetId === asset.id || lightboxAssetId === asset.id ? 1 : 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1"
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAssetId !== asset.id && lightboxAssetId !== asset.id) {
                        e.currentTarget.style.opacity = "0"
                      }
                    }}
                  >
                    <div className="flex items-center justify-end w-full gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxAssetId(asset.id)
                          setSelectedAssetId(asset.id)
                        }}
                        className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                        title="View fullscreen"
                      >
                        <Maximize2 className="w-3 h-3 text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadAsset(asset)
                        }}
                        className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                        title="Download image"
                      >
                        <Download className="w-3 h-3 text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAsset(asset.id)
                        }}
                        className="h-6 w-6 p-0 bg-black/70 hover:bg-black/90"
                        title="Delete image"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </Button>
                    </div>

                    {/* Asset info */}
                    <div className="w-full">
                      <p className="text-sm text-white font-medium truncate mb-1">
                        {asset.metadata?.prompt || "Untitled"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-white/80">
                        <span>{asset.metadata?.model?.split("/")[1] || "Unknown"}</span>
                        <span>{((asset.bytes || 0) / 1024).toFixed(0)}KB</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

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
                <Check className="w-4 h-4 mr-1" />
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
            url: asset.data,
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
