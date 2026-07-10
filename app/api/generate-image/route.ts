import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, providerId, modelId, apiKey } = body as {
      prompt: string;
      providerId: string;
      modelId: string;
      apiKey?: string;
    };

    const resolvedApiKey = apiKey || (() => {
      switch (providerId) {
        case "nvidia": return process.env.NVIDIA_API_KEY;
        default: return undefined;
      }
    })();

    if (!resolvedApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key for image generation" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "No prompt provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let endpoint = "";
    let bodyPayload: any = {};

    if (providerId === "nvidia") {
      // NIM API uses model-specific endpoints
      let resolvedModelId = modelId;
      if (modelId === "black-forest-labs/flux1-dev") {
        resolvedModelId = "black-forest-labs/flux.1-dev";
        bodyPayload = { prompt: prompt };
      } else if (modelId === "stabilityai/stable-diffusion-xl-base-1.0") {
        resolvedModelId = "stabilityai/stable-diffusion-xl";
        bodyPayload = { text_prompts: [{ text: prompt }], cfg_scale: 5, steps: 30 };
      } else {
        bodyPayload = { prompt: prompt };
      }

      endpoint = `https://ai.api.nvidia.com/v1/genai/${resolvedModelId}`;
    } else {
      return new Response(
        JSON.stringify({ error: `Provider ${providerId} not supported for image generation` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resolvedApiKey}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-image] API error:", errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.statusText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // NVIDIA NIM returns base64 inside artifacts array
    const b64 = data.artifacts?.[0]?.base64 || data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    if (b64) {
      return new Response(
        JSON.stringify({ url: `data:image/jpeg;base64,${b64}` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else if (url) {
      return new Response(
        JSON.stringify({ url }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("No image data in response");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[generate-image] Error:", message);
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
