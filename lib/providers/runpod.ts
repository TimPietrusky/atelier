import { generateText, experimental_generateImage as generateImage } from "ai";
import { runpod, createRunpod } from "@runpod/ai-sdk-provider";
import {
  AspectRatio,
  RUNPOD_LLM_MODEL_ID,
  getImageModelMeta,
  resolveModelDimensions,
} from "@/lib/config";

type TextGenParams = {
  modelId?: string;
  prompt: string;
  system?: string;
  apiKey?: string;
};

export async function generateTextWithRunpod(params: TextGenParams) {
  const modelId = params.modelId || RUNPOD_LLM_MODEL_ID;
  const rp = params.apiKey ? createRunpod({ apiKey: params.apiKey }) : runpod;

  const { text } = await generateText({
    model: rp(modelId),
    system: params.system,
    prompt: params.prompt,
  });

  return { text };
}

export type ImageGenParams = {
  modelId: string;
  prompt: string;
  ratio?: AspectRatio;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  // For edit models
  inputs?: { imageUrl?: string; images?: string[] };
  apiKey?: string;
};

export async function generateImageWithRunpod(params: ImageGenParams) {
  const meta = getImageModelMeta(params.modelId);
  if (!meta) throw new Error(`Unsupported image model: ${params.modelId}`);

  const rp = params.apiKey ? createRunpod({ apiKey: params.apiKey }) : runpod;

  const dims = resolveModelDimensions(meta, {
    ratio: (params.ratio || "1:1") as AspectRatio,
    width: params.width,
    height: params.height,
  });

  // Prepare provider options for img2img (RunPod expects providerOptions.runpod.image or .images)
  let providerOptions: any | undefined;
  let sanitizedProviderOptions: any | undefined;
  {
    const inputList: string[] = [];
    if (params.inputs?.images && Array.isArray(params.inputs.images)) {
      inputList.push(...(params.inputs.images.filter(Boolean) as string[]));
    } else if (params.inputs?.imageUrl) {
      inputList.push(params.inputs.imageUrl);
    }

    const toDataUrl = async (src: string): Promise<string> => {
      if (src.startsWith("data:")) return src;
      try {
        const res = await fetch(src);
        const buf = Buffer.from(await res.arrayBuffer());
        const b64 = buf.toString("base64");
        const contentType = res.headers.get("content-type") || "image/png";
        return `data:${contentType};base64,${b64}`;
      } catch {
        return src;
      }
    };

    const dataUrls: string[] = [];
    for (const src of inputList) {
      dataUrls.push(await toDataUrl(src));
    }

    const runpodOpts: any = {};
    if (dataUrls.length >= 1) {
      // Always use images[] for img2img/edit compatibility
      runpodOpts.images = dataUrls;
    }
    const isSeedream = meta.id.startsWith("bytedance/seedream");
    if (typeof params.num_inference_steps === "number") {
      runpodOpts.num_inference_steps = params.num_inference_steps;
    }
    if (!isSeedream && typeof params.guidance_scale === "number") {
      // RunPod expects 'guidance'
      runpodOpts.guidance = params.guidance_scale;
    }
    providerOptions = { runpod: runpodOpts };
    const first = dataUrls[0];
    const mime =
      first && first.startsWith("data:")
        ? first.slice(5, first.indexOf(";"))
        : undefined;
    sanitizedProviderOptions = {
      runpod: {
        ...runpodOpts,
        ...(Array.isArray(runpodOpts.images)
          ? {
              images: (runpodOpts.images as string[]).map(
                (x: string) => `${String(x).substring(0, 32)}...`
              ),
            }
          : {}),
      },
      meta: {
        hasImage: dataUrls.length > 0,
        mime,
        count: dataUrls.length,
      },
    };
  }
  if (!providerOptions) {
    sanitizedProviderOptions = { runpod: {}, meta: { hasImage: false } };
  }

  // Build request using top-level fields per provider docs.
  const requestPayload: any = {
    modelId: meta.id,
    prompt: params.prompt,
    seed: params.seed,
  };
  // Prefer aspectRatio when suitable; otherwise use size
  const useAspect = !meta.sizesByRatio && params.ratio;
  if (useAspect) {
    requestPayload.aspectRatio = dims.ratio;
  } else {
    requestPayload.size = `${dims.width}x${dims.height}`;
  }

  const { image } = (await generateImage({
    model: rp.imageModel(meta.id as any),
    prompt: requestPayload.prompt,
    ...(requestPayload.aspectRatio
      ? { aspectRatio: requestPayload.aspectRatio }
      : {}),
    ...(requestPayload.size ? { size: requestPayload.size } : {}),
    ...(requestPayload.seed !== undefined ? { seed: requestPayload.seed } : {}),
    ...(providerOptions ? { providerOptions } : {}),
  } as any)) as any;

  // Server-side transparency
  try {
    // eslint-disable-next-line no-console
    console.log("[runpod] request payload", {
      model: meta.id,
      prompt: requestPayload.prompt,
      ...(requestPayload.aspectRatio
        ? { aspectRatio: requestPayload.aspectRatio }
        : {}),
      ...(requestPayload.size ? { size: requestPayload.size } : {}),
      ...(requestPayload.seed !== undefined
        ? { seed: requestPayload.seed }
        : {}),
      providerOptions: sanitizedProviderOptions,
    });
  } catch {}

  let imageUrl: string | undefined = image?.url;
  if (!imageUrl && image?.base64) {
    imageUrl = `data:image/png;base64,${image.base64}`;
  }
  if (!imageUrl && image?.uint8Array) {
    const b64 = Buffer.from(image.uint8Array).toString("base64");
    imageUrl = `data:image/png;base64,${b64}`;
  }
  if (!imageUrl && image?.arrayBuffer) {
    const ab = await image.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    imageUrl = `data:image/png;base64,${b64}`;
  }

  if (!imageUrl) throw new Error("RunPod image error: missing image output");

  return {
    id: `img_${Date.now()}`,
    status: "succeeded",
    imageUrl,
    raw: image,
    used: {
      modelId: meta.id,
      prompt: params.prompt,
      ...(requestPayload.aspectRatio
        ? { aspectRatio: requestPayload.aspectRatio }
        : {}),
      ...(requestPayload.size ? { size: requestPayload.size } : {}),
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
      providerOptions: sanitizedProviderOptions,
    },
  };
}
