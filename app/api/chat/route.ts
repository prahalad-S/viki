import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel, ProviderId } from "@/lib/providers";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geolocation, ipAddress } from '@vercel/functions';

interface TextPart { type: 'text'; text: string; }
interface TokenUsage { promptTokens?: number; completionTokens?: number; totalTokens?: number; }

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Get user profile to check blocks and tokens
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_blocked, tokens_left')
      .eq('id', user.id)
      .single();

    if (profile?.is_blocked) {
      return new Response(JSON.stringify({ error: "Your account has been blocked." }), { status: 403 });
    }

    if (profile?.tokens_left !== undefined && profile.tokens_left <= 0) {
      return new Response(JSON.stringify({ error: "You have run out of tokens." }), { status: 402 });
    }

    // Geolocation
    const ip = ipAddress(req) || '127.0.0.1';
    const geo = geolocation(req);
    const country = geo?.country || 'Unknown';
    const state = geo?.countryRegion || 'Unknown';

    // Update profile
    await supabase.from('profiles').update({
      last_seen: new Date().toISOString(),
      ip_address: ip,
      country: country,
      state: state,
    }).eq('id', user.id);

    const body = await req.json();
    const { messages, providerId, modelId, apiKey, baseUrl, chatId } = body as {
      messages: UIMessage[];
      providerId: string;
      modelId: string;
      apiKey?: string;
      baseUrl?: string;
      chatId?: string;
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

    // Save user message to database
    const userMessage = messages[messages.length - 1];
    
    const activeChatId = chatId;
    if (activeChatId) {
       // Check if chat exists
       const { data: chat } = await supabase.from('chats').select('id').eq('id', activeChatId).single();
       if (!chat) {
         // Create chat
         const titleText = userMessage.parts.filter(p => p.type === 'text').map(p => (p as TextPart).text).join('');
         await supabase.from('chats').insert({
            id: activeChatId,
            user_id: user.id,
            title: titleText.substring(0, 50) + (titleText.length > 50 ? '...' : '')
         });
       }
       
       const contentText = userMessage.parts.filter(p => p.type === 'text').map(p => (p as TextPart).text).join('');
       await supabase.from('messages').insert({
        chat_id: activeChatId,
        role: 'user',
        content: contentText
      });
    }

    const model = getModel(providerId as ProviderId, modelId, resolvedApiKey, baseUrl);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model,
      messages: modelMessages,
      system:
        "You are a helpful, intelligent AI assistant. Be concise but thorough. Format code with proper markdown code blocks and language identifiers.",
      onFinish: async ({ text, usage }) => {
         if (activeChatId) {
            await supabase.from('messages').insert({
               chat_id: activeChatId,
               role: 'assistant',
               content: text
            });
         }
         
         const typedUsage = usage as TokenUsage;
         const totalTokens = (typedUsage?.promptTokens || 0) + (typedUsage?.completionTokens || 0) || typedUsage?.totalTokens || 0;
         const { data: currProfile } = await supabase.from('profiles').select('tokens_used, tokens_left').eq('id', user.id).single();
         if (currProfile) {
            await supabase.from('profiles').update({
               tokens_used: (currProfile.tokens_used || 0) + totalTokens,
               tokens_left: (currProfile.tokens_left || 0) - totalTokens
            }).eq('id', user.id);
         }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[chat] Error:", message);
    return new Response(message, { status: 500 });
  }
}
