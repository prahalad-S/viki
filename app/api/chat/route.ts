import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel, ProviderId } from "@/lib/providers";
import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, providerId, modelId, apiKey, baseUrl } = body as {
      messages: UIMessage[];
      providerId: string;
      modelId: string;
      apiKey?: string;
      baseUrl?: string;
    };

    const resolvedApiKey = apiKey || (() => {
      switch (providerId) {
        case "groq": return process.env.GROQ_API_KEY;
        case "google": return process.env.GOOGLE_API_KEY;
        case "openai": return process.env.OPENAI_API_KEY;
        case "openrouter": return process.env.OPENROUTER_API_KEY;
        case "nvidia": return process.env.NVIDIA_API_KEY;
        default: return undefined;
      }
    })();

    console.log(`[chat] provider=${providerId} model=${modelId} hasKey=${!!resolvedApiKey}`);

    if (!providerId || !modelId) {
      return new Response(
        JSON.stringify({ error: "Missing provider or model" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = getModel(providerId as ProviderId, modelId, resolvedApiKey, baseUrl);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model,
      messages: modelMessages,
      system:
        "You are a helpful, intelligent AI assistant. Be concise but thorough. Format code with proper markdown code blocks and language identifiers.",
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[chat] Error:", message);
    return new Response(message, { status: 500 });
  }
}
