"use client"

import { useState, useEffect } from "react"
import { Grid } from "react-window"
import { assetManager, type Asset, type AssetMetadata } from "@/lib/store/asset-manager"
import { Download, Maximize2, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VirtualizedAssetGridProps {
  assets: AssetMetadata[]
  columnCount: number
  rowHeight: number
  onSelectAsset: (assetId: string) => void
  onDeleteAsset: (assetId: string) => void
  onDownloadAsset: (asset: Asset) => void
  onMaximize: (assetId: string) => void
  selectedAssetId: string | null
  lightboxAssetId: string | null
  isSelectionMode: boolean
  selectedAssets: Set<string>
  onToggleSelection: (assetId: string) => void
  containerHeight: number
  containerWidth: number
}

interface CachedAsset extends AssetMetadata {
  data?: string
  isLoadingData?: boolean
}

interface CellProps {
  assetId: string
  cachedAssets: Map<string, CachedAsset>
}

const AssetCell = ({
  columnIndex,
  rowIndex,
  style,
  assets,
  columnCount,
  cachedAssets,
  onSelectAsset,
  onDeleteAsset,
  onDownloadAsset,
  onMaximize,
  selectedAssetId,
  lightboxAssetId,
  isSelectionMode,
  selectedAssets,
  onToggleSelection,
  fetchAssetData,
}: {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  assets: AssetMetadata[]
  columnCount: number
  cachedAssets: Map<string, CachedAsset>
  onSelectAsset: (assetId: string) => void
  onDeleteAsset: (assetId: string) => void
  onDownloadAsset: (asset: Asset) => void
  onMaximize: (assetId: string) => void
  selectedAssetId: string | null
  lightboxAssetId: string | null
  isSelectionMode: boolean
  selectedAssets: Set<string>
  onToggleSelection: (assetId: string) => void
  fetchAssetData: (assetId: string) => Promise<void>
}) => {
  const index = rowIndex * columnCount + columnIndex
  if (index >= assets.length) {
    return <div style={style} />
  }

  const assetMetadata = assets[index]
  const cachedAsset = (cachedAssets.get(assetMetadata.id) || assetMetadata) as CachedAsset

  useEffect(() => {
    fetchAssetData(assetMetadata.id)
  }, [assetMetadata.id])

  return (
    <div
      style={style}
      className="p-2"
      onClick={() => {
        if (isSelectionMode) {
          onToggleSelection(assetMetadata.id)
        } else {
          onSelectAsset(assetMetadata.id)
        }
      }}
    >
      <div
        className="relative w-full h-full rounded-none overflow-hidden cursor-pointer border bg-slate-900"
        style={{
          borderColor:
            selectedAssetId === assetMetadata.id || lightboxAssetId === assetMetadata.id
              ? "var(--node-image)"
              : "var(--border)",
          boxShadow:
            selectedAssetId === assetMetadata.id || lightboxAssetId === assetMetadata.id
              ? "rgba(255, 255, 255, 0.5) -2px 2px 0px"
              : "none",
        }}
      >
        {cachedAsset.data ? (
          <img
            src={cachedAsset.data}
            alt={cachedAsset.metadata?.prompt || "Asset"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {isSelectionMode && selectedAssets.has(assetMetadata.id) && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-[var(--node-image)] rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {!isSelectionMode && cachedAsset.data && (
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity flex flex-col items-center justify-between p-2"
            style={{
              opacity:
                selectedAssetId === assetMetadata.id || lightboxAssetId === assetMetadata.id
                  ? 1
                  : 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1"
            }}
            onMouseLeave={(e) => {
              if (selectedAssetId !== assetMetadata.id && lightboxAssetId !== assetMetadata.id) {
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
                  onMaximize(assetMetadata.id)
                }}
                className="h-5 w-5 p-0 bg-black/70 hover:bg-black/90"
                title="View fullscreen"
              >
                <Maximize2 className="w-3 h-3 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (cachedAsset.data) {
                    const asset: Asset = {
                      ...cachedAsset,
                      data: cachedAsset.data,
                    } as Asset
                    onDownloadAsset(asset)
                  }
                }}
                className="h-5 w-5 p-0 bg-black/70 hover:bg-black/90"
                title="Download image"
              >
                <Download className="w-3 h-3 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteAsset(assetMetadata.id)
                }}
                className="h-5 w-5 p-0 bg-black/70 hover:bg-black/90"
                title="Delete image"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </Button>
            </div>

            <div className="w-full text-center">
              <p className="text-xs text-white font-medium truncate mb-1">
                {cachedAsset.metadata?.prompt || "Untitled"}
              </p>
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>{cachedAsset.metadata?.model?.split("/")[1] || "Unknown"}</span>
                <span>{((cachedAsset.bytes || 0) / 1024).toFixed(0)}KB</span>
              </div>
              <p className="text-xs text-white/60 mt-1">
                {new Date(cachedAsset.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function VirtualizedAssetGrid({
  assets,
  columnCount,
  rowHeight,
  onSelectAsset,
  onDeleteAsset,
  onDownloadAsset,
  onMaximize,
  selectedAssetId,
  lightboxAssetId,
  isSelectionMode,
  selectedAssets,
  onToggleSelection,
  containerHeight,
  containerWidth,
}: VirtualizedAssetGridProps) {
  const [cachedAssets, setCachedAssets] = useState<Map<string, CachedAsset>>(new Map())

  useEffect(() => {
    const newCache = new Map<string, CachedAsset>()
    assets.forEach((asset) => {
      if (!cachedAssets.has(asset.id)) {
        newCache.set(asset.id, { ...asset })
      }
    })
    if (newCache.size > 0) {
      setCachedAssets((prev) => new Map([...prev, ...newCache]))
    }
  }, [assets])

  const fetchAssetData = async (assetId: string) => {
    if (cachedAssets.has(assetId)) {
      const cached = cachedAssets.get(assetId)!
      if (cached.data !== undefined || cached.isLoadingData) return
    }

    setCachedAssets((prev) => {
      const next = new Map(prev)
      const asset = next.get(assetId)
      if (asset) {
        next.set(assetId, { ...asset, isLoadingData: true })
      }
      return next
    })

    const data = await assetManager.getAssetData(assetId)
    setCachedAssets((prev) => {
      const next = new Map(prev)
      const asset = next.get(assetId)
      if (asset) {
        next.set(assetId, { ...asset, data: data || undefined, isLoadingData: false })
      }
      return next
    })
  }

  const columnWidth = containerWidth / columnCount
  const itemCount = Math.ceil(assets.length / columnCount)

  const cellData = {
    assets,
    columnCount,
    cachedAssets,
    onSelectAsset,
    onDeleteAsset,
    onDownloadAsset,
    onMaximize,
    selectedAssetId,
    lightboxAssetId,
    isSelectionMode,
    selectedAssets,
    onToggleSelection,
    fetchAssetData,
  }

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={columnWidth}
      defaultHeight={containerHeight}
      defaultWidth={containerWidth}
      rowCount={itemCount}
      rowHeight={rowHeight}
      cellComponent={AssetCell}
      cellProps={cellData as any}
    />
  )
}
