export type AspectRatio = "1:1" | "4:3" | "3:4";

export interface ImageModelMeta {
  id: string;
  endpointSlug: string;
  kind: "txt2img" | "img2img";
  supportedAspectRatios: AspectRatio[];
  // Specific constraints for certain ratios (e.g., Seedream 4.0 supports only 1:1 with specific sizes)
  sizesByRatio?: Record<AspectRatio, number[]>;
  // Capability flags to drive UI and request shaping
  supportsGuidance?: boolean; // whether provider supports 'guidance'
}

export const RUNPOD_API_BASE = "https://api.runpod.ai/v2";
export const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";

// Default LLM model (as provided by the user)
export const RUNPOD_LLM_MODEL_ID = "qwen/qwen3-32b-awq";

// Registry of supported image models (as provided by the user)
export const IMAGE_MODELS: ImageModelMeta[] = [
  {
    id: "bytedance/seedream-3.0",
    endpointSlug: "seedream-3.0",
    kind: "txt2img",
    supportedAspectRatios: ["1:1", "4:3", "3:4"],
    supportsGuidance: false,
  },
  {
    id: "bytedance/seedream-4.0",
    endpointSlug: "seedream-4.0",
    kind: "txt2img",
    supportedAspectRatios: ["1:1"],
    sizesByRatio: { "1:1": [1024, 1536, 2048, 4096] },
    supportsGuidance: false,
  },
  {
    id: "bytedance/seedream-4.0-edit",
    endpointSlug: "seedream-4.0-edit",
    kind: "img2img",
    supportedAspectRatios: ["1:1"],
    sizesByRatio: { "1:1": [1024, 1536, 2048, 4096] },
    supportsGuidance: false,
  },
  {
    id: "black-forest-labs/flux-1-schnell",
    endpointSlug: "flux-1-schnell",
    kind: "txt2img",
    supportedAspectRatios: ["1:1", "4:3", "3:4"],
    supportsGuidance: true,
  },
  {
    id: "black-forest-labs/flux-1-dev",
    endpointSlug: "flux-1-dev",
    kind: "txt2img",
    supportedAspectRatios: ["1:1", "4:3", "3:4"],
    supportsGuidance: true,
  },
  {
    id: "black-forest-labs/flux-1-kontext-dev",
    endpointSlug: "flux-1-kontext-dev",
    kind: "txt2img",
    supportedAspectRatios: ["1:1", "4:3", "3:4"],
    supportsGuidance: true,
  },
  {
    id: "qwen/qwen-image",
    endpointSlug: "qwen-image",
    kind: "txt2img",
    supportedAspectRatios: ["1:1", "4:3", "3:4"],
    supportsGuidance: true,
  },
  {
    id: "qwen/qwen-image-edit",
    endpointSlug: "qwen-image-edit",
    kind: "img2img",
    supportedAspectRatios: ["1:1", "4:3", "3:4"],
    supportsGuidance: true,
  },
];

export function getImageModelMeta(modelId: string): ImageModelMeta | undefined {
  if (modelId === "sdxl") {
    // Legacy support for existing route default
    return {
      id: "sdxl",
      endpointSlug: "sdxl",
      kind: "txt2img",
      supportedAspectRatios: ["1:1", "4:3", "3:4"],
    };
  }
  return IMAGE_MODELS.find((m) => m.id === modelId);
}

export function ratioToSize(ratio: AspectRatio): {
  width: number;
  height: number;
} {
  switch (ratio) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "3:4":
      return { width: 768, height: 1024 };
  }
}

export function resolveModelDimensions(
  meta: ImageModelMeta,
  requested: { ratio?: AspectRatio; width?: number; height?: number }
): { ratio: AspectRatio; width: number; height: number } {
  // Choose a valid ratio
  const desiredRatio = (requested.ratio ||
    meta.supportedAspectRatios[0]) as AspectRatio;
  const ratio: AspectRatio = meta.supportedAspectRatios.includes(desiredRatio)
    ? desiredRatio
    : meta.supportedAspectRatios[0];

  // Prefer requested width/height if valid for model; otherwise pick closest allowed size
  if (
    meta.sizesByRatio &&
    meta.sizesByRatio[ratio] &&
    meta.sizesByRatio[ratio]!.length > 0
  ) {
    const candidates = meta.sizesByRatio[ratio] as number[];
    const requestedMax = Math.max(requested.width || 0, requested.height || 0);
    const fallback = candidates.includes(1024) ? 1024 : candidates[0]!;
    const target =
      requestedMax > 0
        ? candidates.reduce(
            (prev, cur) =>
              Math.abs(cur - requestedMax) < Math.abs(prev - requestedMax)
                ? cur
                : prev,
            fallback
          )
        : fallback;
    if (ratio === "1:1") return { ratio, width: target, height: target };
    if (ratio === "4:3")
      return { ratio, width: target, height: Math.round((target * 3) / 4) };
    if (ratio === "3:4")
      return { ratio, width: Math.round((target * 3) / 4), height: target };
  }

  // Generic sizes
  const base = ratioToSize(ratio);
  // If user provided dimensions, honor them if they match the ratio; else use base
  const w = requested.width && requested.height ? requested.width : base.width;
  const h =
    requested.width && requested.height ? requested.height : base.height;
  return { ratio, width: w, height: h };
}
