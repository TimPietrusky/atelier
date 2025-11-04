import { IMAGE_MODELS, ImageModelMeta } from "./config"
import { getKV } from "./store/db"

const FAVORITE_MODELS_KEY = "favoriteModels"

export function getModelDisplayName(modelId: string): string {
  const modelName = modelId.split("/").pop() || modelId
  return modelName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export async function getSortedModels(includeAll: boolean = false): Promise<ImageModelMeta[]> {
  const favorites = await getKV<string[]>(FAVORITE_MODELS_KEY)
  const favoriteSet = favorites && favorites.length > 0 ? new Set(favorites) : null

  // If no favorites set (null or empty), return all models in default order
  if (!favoriteSet) {
    return IMAGE_MODELS
  }

  const favoriteModels: ImageModelMeta[] = []
  const otherModels: ImageModelMeta[] = []

  for (const model of IMAGE_MODELS) {
    if (favoriteSet.has(model.id)) {
      favoriteModels.push(model)
    } else if (includeAll) {
      otherModels.push(model)
    }
  }

  // If we have favorites and not including all, show only favorites
  if (favoriteModels.length > 0 && !includeAll) {
    return favoriteModels
  }

  // Show favorites first, then others
  return [...favoriteModels, ...otherModels]
}

