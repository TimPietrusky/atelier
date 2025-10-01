// Using Web Fetch API types to avoid depending on Next type declarations in lints
import { generateImageWithRunpod } from "@/lib/providers/runpod"
import { getImageModelMeta, resolveModelDimensions } from "@/lib/config"

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
        }
  return new Response(JSON.stringify(body), responseInit)
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
    } = await req.json()

    console.log("\n[api/generate-image] ===== REQUEST =====")
    console.log("Prompt:", prompt)
    console.log("Model:", model)
    console.log("Dimensions:", { width, height, ratio })
    console.log("Steps:", steps, "| Guidance:", guidance, "| Seed:", seed)
    console.log(
      "Has image input:",
      !!(inputs?.imageUrl || (inputs?.images && inputs.images.length))
    )
    if (inputs?.images && inputs.images.length) {
      console.log(
        "Images:",
        inputs.images.map((x: string) => `${String(x).slice(0, 50)}...`)
      )
    }
    console.log("=====================================\n")

    // Validate model and delegate to provider adapter
    const meta = getImageModelMeta(model)
    if (!meta) {
      throw new Error(`Unsupported image model: ${model}`)
    }

    const dims = resolveModelDimensions(meta, { ratio, width, height })

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
    })

    console.log("[api/generate-image] used", result.used)

    return json({
      success: true,
      imageUrl: result.imageUrl,
      executionId: result.id,
      status: result.status,
      metadata: { model },
      applied: { ratio: dims.ratio, width: dims.width, height: dims.height },
      used: result.used,
    })
  } catch (error: any) {
    console.error("\n[api/generate-image] ===== ERROR =====")
    console.error("Message:", error?.message)
    console.error("Cause:", error?.cause)
    if (error?.cause) {
      console.error("Cause details:", JSON.stringify(error.cause, null, 2))
    }
    console.error("====================================\n")
    return json(
      {
        error: "Failed to generate image",
        details: error?.message || String(error),
      },
      500
    )
  }
}
