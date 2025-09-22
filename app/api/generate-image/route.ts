// Using Web Fetch API types to avoid depending on Next type declarations in lints
import { generateImageWithRunpod } from "@/lib/providers/runpod";
import { getImageModelMeta } from "@/lib/config";

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

    // Validate model and delegate to provider adapter
    const meta = getImageModelMeta(model);
    if (!meta) {
      throw new Error(`Unsupported image model: ${model}`);
    }

    const result = await generateImageWithRunpod({
      modelId: meta.id,
      prompt,
      width,
      height,
      ratio,
      num_inference_steps: steps,
      guidance_scale: guidance,
      seed,
      inputs,
      apiKey: process.env.RUNPOD_API_KEY,
    });

    return json({
      success: true,
      imageUrl: result.imageUrl,
      executionId: result.id,
      status: result.status,
      metadata: { model },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return json({ error: "Failed to generate image" }, 500);
  }
}
