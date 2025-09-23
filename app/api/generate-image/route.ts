// Using Web Fetch API types to avoid depending on Next type declarations in lints
import { generateImageWithRunpod } from "@/lib/providers/runpod";
import { getImageModelMeta, resolveModelDimensions } from "@/lib/config";

function json(body: unknown, init?: number | ResponseInit) {
  const responseInit: ResponseInit =
    typeof init === "number"
      ? { status: init, headers: { "Content-Type": "application/json" } }
      : {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(init as ResponseInit)?.headers,
          },
        };
  return new Response(JSON.stringify(body), responseInit);
}

export async function POST(req: Request) {
  try {
    const {
      prompt,
      model = "sdxl",
      width,
      height,
      ratio,
      steps,
      guidance,
      seed,
      inputs,
    } = await req.json();

    console.log("[api/generate-image] request", {
      prompt,
      model,
      width,
      height,
      ratio,
      steps,
      guidance,
      seed,
      hasImage: !!(
        inputs?.imageUrl ||
        (inputs?.images && inputs.images.length)
      ),
      images:
        inputs?.images && inputs.images.length
          ? inputs.images.map((x: string) => `${String(x).slice(0, 32)}...`)
          : inputs?.imageUrl
          ? [`${String(inputs.imageUrl).slice(0, 32)}...`]
          : undefined,
    });

    // Validate model and delegate to provider adapter
    const meta = getImageModelMeta(model);
    if (!meta) {
      throw new Error(`Unsupported image model: ${model}`);
    }

    const dims = resolveModelDimensions(meta, { ratio, width, height });

    const result = await generateImageWithRunpod({
      modelId: meta.id,
      prompt,
      width: dims.width,
      height: dims.height,
      ratio: dims.ratio,
      num_inference_steps: steps,
      guidance_scale: guidance,
      seed,
      inputs,
      apiKey: process.env.RUNPOD_API_KEY,
    });

    console.log("[api/generate-image] used", result.used);

    return json({
      success: true,
      imageUrl: result.imageUrl,
      executionId: result.id,
      status: result.status,
      metadata: { model },
      applied: { ratio: dims.ratio, width: dims.width, height: dims.height },
      used: result.used,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return json({ error: "Failed to generate image" }, 500);
  }
}
