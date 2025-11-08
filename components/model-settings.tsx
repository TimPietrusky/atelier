"use client"

import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { IMAGE_MODELS, ImageModelMeta } from "@/lib/config"
import { getModelDisplayName } from "@/lib/models"
import { getKV, putKV } from "@/lib/store/db"
import { Search, Sparkles, AlertCircle } from "lucide-react"

const FAVORITE_MODELS_KEY = "favoriteModels"

// Recommended models for new users
const RECOMMENDED_MODELS = ["bytedance/seedream-4.0", "bytedance/seedream-4.0-edit"]

interface ModelCardProps {
  model: ImageModelMeta
  isFavorite: boolean
  onToggle: (modelId: string) => void
  searchQuery: string
}

function ModelCard({ model, isFavorite, onToggle, searchQuery }: ModelCardProps) {
  const displayName = getModelDisplayName(model.id)
  const provider = model.id.split("/")[0]
  const isRecommended = RECOMMENDED_MODELS.includes(model.id)

  // Highlight search matches
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/20 text-foreground">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  return (
    <Card
      className={`p-4 border transition-all ${
        isFavorite
          ? "border-white/20 bg-white/5"
          : "border-border bg-background hover:border-border-strong"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{highlightMatch(displayName, searchQuery)}</h3>
            {isRecommended && (
              <span className="text-[10px] p-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 flex items-center">
                <Sparkles className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {highlightMatch(provider, searchQuery)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch checked={isFavorite} onCheckedChange={() => onToggle(model.id)} />
        </div>
      </div>
    </Card>
  )
}

export function ModelSettings() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterKind, setFilterKind] = useState<"all" | "txt2img" | "img2img">("all")
  const [hasProvider, setHasProvider] = useState<boolean | null>(null)

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const saved = await getKV<string[]>(FAVORITE_MODELS_KEY)
        if (saved && saved.length > 0) {
          setFavorites(new Set(saved))
        } else {
          // If no favorites saved, set recommended models as default
          setFavorites(new Set(RECOMMENDED_MODELS))
          await putKV(FAVORITE_MODELS_KEY, RECOMMENDED_MODELS)
        }
      } catch (error) {
        console.error("Failed to load favorite models:", error)
        // Set recommended as default on error too
        setFavorites(new Set(RECOMMENDED_MODELS))
      } finally {
        setLoading(false)
      }
    }
    loadFavorites()
  }, [])

  useEffect(() => {
    const checkProvider = async () => {
      try {
        const res = await fetch("/api/providers", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const hasRunPod = data.credentials?.some(
            (c: any) => c.providerId === "runpod" && c.status === "active"
          )
          setHasProvider(hasRunPod || false)
        }
      } catch (error) {
        console.error("Failed to check credentials:", error)
        setHasProvider(false)
      }
    }
    checkProvider()
  }, [])

  const toggleFavorite = async (modelId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(modelId)) {
      newFavorites.delete(modelId)
    } else {
      newFavorites.add(modelId)
    }
    setFavorites(newFavorites)
    try {
      await putKV(FAVORITE_MODELS_KEY, Array.from(newFavorites))
    } catch (error) {
      console.error("Failed to save favorite models:", error)
    }
  }

  const selectRecommended = async () => {
    const newFavorites = new Set(RECOMMENDED_MODELS)
    setFavorites(newFavorites)
    try {
      await putKV(FAVORITE_MODELS_KEY, Array.from(newFavorites))
    } catch (error) {
      console.error("Failed to save favorite models:", error)
    }
  }

  const unselectAll = async () => {
    const newFavorites = new Set<string>()
    setFavorites(newFavorites)
    try {
      await putKV(FAVORITE_MODELS_KEY, [])
    } catch (error) {
      console.error("Failed to save favorite models:", error)
    }
  }

  const filteredModels = useMemo(() => {
    let models = IMAGE_MODELS

    // Filter by kind
    if (filterKind !== "all") {
      models = models.filter((m) => m.kind === filterKind)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      models = models.filter((model) => {
        const displayName = getModelDisplayName(model.id).toLowerCase()
        const provider = model.id.split("/")[0].toLowerCase()
        const kind = model.kind.toLowerCase()
        return (
          displayName.includes(query) ||
          provider.includes(query) ||
          kind.includes(query) ||
          model.id.toLowerCase().includes(query)
        )
      })
    }

    return models
  }, [searchQuery, filterKind])

  const txt2imgCount = IMAGE_MODELS.filter((m) => m.kind === "txt2img").length
  const img2imgCount = IMAGE_MODELS.filter((m) => m.kind === "img2img").length

  if (loading) {
    return (
      <div>
        <div className="text-sm text-muted-foreground">loading...</div>
      </div>
    )
  }

  return (
    <div>
      {hasProvider === false && (
        <Card className="mb-4 p-3 border border-orange-500/50 bg-orange-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-orange-500 mb-1">Provider Required</p>
              <p className="text-xs text-muted-foreground">
                Configure a provider API key to use these models in your workflows.
              </p>
            </div>
          </div>
        </Card>
      )}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-4">
          Choose which models appear in your model selector. This won't affect existing
          conversations.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="search models, providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectRecommended} className="h-9 text-xs">
              select recommended
            </Button>
            <Button variant="outline" size="sm" onClick={unselectAll} className="h-9 text-xs">
              unselect all
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={filterKind === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterKind("all")}
            className="h-8 text-xs"
          >
            all ({IMAGE_MODELS.length})
          </Button>
          <Button
            variant={filterKind === "txt2img" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterKind("txt2img")}
            className="h-8 text-xs"
          >
            text to image ({txt2imgCount})
          </Button>
          <Button
            variant={filterKind === "img2img" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterKind("img2img")}
            className="h-8 text-xs"
          >
            image to image ({img2imgCount})
          </Button>
        </div>
      </div>

      {filteredModels.length === 0 ? (
        <Card className="p-8 border border-border text-center">
          <p className="text-sm text-muted-foreground">No models found matching "{searchQuery}"</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isFavorite={favorites.has(model.id)}
              onToggle={toggleFavorite}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}
