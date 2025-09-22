import { generateText, experimental_generateImage as generateImage } from "ai";
import { runpod, createRunpod } from "@runpod/ai-sdk-provider";
import {
  AspectRatio,
  RUNPOD_API_BASE,
  RUNPOD_API_KEY,
  RUNPOD_LLM_MODEL_ID,
  getImageModelMeta,
  ratioToSize,
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
  inputs?: { imageUrl?: string };
  apiKey?: string;
};

export async function generateImageWithRunpod(params: ImageGenParams) {
  const meta = getImageModelMeta(params.modelId);
  if (!meta) throw new Error(`Unsupported image model: ${params.modelId}`);

  const rp = params.apiKey ? createRunpod({ apiKey: params.apiKey }) : runpod;

  const ratio: AspectRatio = (params.ratio || "1:1") as AspectRatio;
  if (!meta.supportedAspectRatios.includes(ratio)) {
    throw new Error(
      `Aspect ratio ${ratio} not supported by model ${
        meta.id
      }. Supported: ${meta.supportedAspectRatios.join(", ")}`
    );
  }

  const { image } = (await generateImage({
    model: rp.imageModel(meta.id as any),
    prompt: params.prompt,
    aspectRatio: ratio,
  } as any)) as any;

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
  };
}
