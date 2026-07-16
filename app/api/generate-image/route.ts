import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geolocation, ipAddress } from '@vercel/functions';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_blocked, tokens_left')
      .eq('id', user.id)
      .single();

    if (profile?.is_blocked) {
      return new Response(JSON.stringify({ error: "Your account has been blocked." }), { status: 403 });
    }

    // Assume 1 image generation = 50 tokens
    if (profile?.tokens_left !== undefined && profile.tokens_left < 50) {
      return new Response(JSON.stringify({ error: "You do not have enough tokens to generate an image." }), { status: 402 });
    }

    const ip = ipAddress(req) || '127.0.0.1';
    const geo = geolocation(req);
    
    await supabase.from('profiles').update({
      last_seen: new Date().toISOString(),
      ip_address: ip,
      country: geo?.country || 'Unknown',
      state: geo?.countryRegion || 'Unknown',
    }).eq('id', user.id);

    const body = await req.json();
    const { prompt, providerId, modelId, apiKey, chatId, image } = body as {
      prompt: string;
      providerId: string;
      modelId: string;
      apiKey?: string;
      chatId?: string;
      image?: string;
    };

    const resolvedApiKey = apiKey || (() => {
      switch (providerId) {
        case "nvidia": return process.env.NVIDIA_API_KEY;
        default: return undefined;
      }
    })();

    console.log(`[generate-image] provider=${providerId} model=${modelId} hasKey=${!!resolvedApiKey} keyPrefix=${resolvedApiKey?.slice(0, 10)}`);

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

    type NvidiaPayload = { prompt: string } | { text_prompts: { text: string }[]; cfg_scale: number; steps: number };
    let endpoint = "";
    let bodyPayload: NvidiaPayload;

    if (providerId === "nvidia") {
      let resolvedModelId = modelId;
      const b64Data = image ? image.split(',')[1] : undefined;
      
      let finalPrompt = prompt;
      
      // Use Vision model to improve the prompt if an image is attached
      if (b64Data && resolvedApiKey) {
          try {
              const visionRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
                  method: "POST",
                  headers: {
                      "Authorization": `Bearer ${resolvedApiKey}`,
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                      model: "meta/llama-3.2-90b-vision-instruct",
                      messages: [
                          {
                              role: "user",
                              content: [
                                  { type: "text", text: `Analyze this image. The user wants to improve or modify it with this request: "${prompt}". Generate a descriptive prompt for a text-to-image model that implements the requested improvements while retaining the core structure of the original image. Keep your response extremely concise, under 500 characters. Respond ONLY with the prompt, nothing else.` },
                                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64Data}` } }
                              ]
                          }
                      ],
                      max_tokens: 1024
                  })
              });
              
              if (visionRes.ok) {
                  const visionData = await visionRes.json();
                  finalPrompt = visionData.choices?.[0]?.message?.content?.trim() || finalPrompt;
                  if (finalPrompt.length > 750) {
                      finalPrompt = finalPrompt.substring(0, 750);
                  }
                  console.log("[generate-image] Improved prompt via Vision:", finalPrompt);
              } else {
                  console.warn("[generate-image] Vision model failed", await visionRes.text());
              }
          } catch (e) {
              console.error("[generate-image] Vision API error:", e);
          }
      }
      
      if (modelId === "black-forest-labs/flux1-dev") {
        resolvedModelId = "black-forest-labs/flux.1-dev";
        bodyPayload = { prompt: finalPrompt } as any; // Flux doesn't support image input
      } else if (modelId === "stabilityai/stable-diffusion-xl-base-1.0") {
        resolvedModelId = "stabilityai/stable-diffusion-xl";
        bodyPayload = { 
          text_prompts: [{ text: finalPrompt }], 
          cfg_scale: 5, 
          steps: 30,
          ...(b64Data ? { init_image: b64Data } : {})
        } as any;
      } else {
        // Fallback for flux.2-klein-4b and others which don't support 'image'
        bodyPayload = { prompt: finalPrompt } as any; 
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
      // Surface NVIDIA's detail message if available
      let detail = response.statusText;
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed.detail || parsed.title || parsed.error || detail;
      } catch { /* not JSON */ }
      return new Response(
        JSON.stringify({ error: `Image generation failed: ${detail}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // NVIDIA NIM returns base64 inside artifacts array
    const b64 = data.artifacts?.[0]?.base64 || data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    let imageUrl = "";
    if (b64) {
      imageUrl = `data:image/jpeg;base64,${b64}`;
    } else if (url) {
      imageUrl = url;
    } else {
      throw new Error("No image data in response");
    }
    
    // Save to history and deduct tokens
    if (chatId) {
       const { data: chat } = await supabase.from('chats').select('id').eq('id', chatId).single();
       if (!chat) {
         await supabase.from('chats').insert({ id: chatId, user_id: user.id, title: prompt.substring(0, 50) });
       }
       
       await supabase.from('messages').insert([
         { 
           chat_id: chatId, 
           role: 'user', 
           content: prompt,
           attachments: image ? [{ type: 'attachment', name: 'uploaded_image', fileType: 'image/jpeg', base64: image }] : null
         },
         { chat_id: chatId, role: 'assistant', content: `![Generated Image](${imageUrl})` }
       ]);
    }
    
    const { data: currProfile } = await supabase.from('profiles').select('tokens_used, tokens_left').eq('id', user.id).single();
    if (currProfile) {
       await supabase.from('profiles').update({
          tokens_used: (currProfile.tokens_used || 0) + 50,
          tokens_left: (currProfile.tokens_left || 0) - 50
       }).eq('id', user.id);
    }

    return new Response(
      JSON.stringify({ url: imageUrl }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[generate-image] Error:", message);
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
