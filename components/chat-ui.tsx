"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, UIMessage } from "ai";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ProviderSelector } from "@/components/provider-selector";
import { ModeSwitcher } from "@/components/mode-switcher";
import { TokenExhaustedDialog } from "@/components/token-exhausted-dialog";
import { useProviderSettings } from "@/hooks/use-provider-settings";
import { useChatMode } from "@/hooks/use-chat-mode";
import { SendHorizontal, Square, RotateCcw, Bot, User, AlertCircle, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatUI({ id, initialMessages = [] }: { id?: string, initialMessages?: UIMessage[] }) {
  const { settings } = useProviderSettings(); // BYOK from provider settings dialog
  const chatMode = useChatMode();
  const { state: modeState } = chatMode;

  const router = useRouter();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  // Stable UUID for new chats started from root page — must be UUID to match chats.id schema
  const [newChatId] = useState<string>(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString()
  );
  const activeChatId = id ?? newChatId;

  const isImageMode = modeState.mode === "text-to-image";

  // Determine effective provider/model/key
  // If the user has entered their own API key via Provider Settings, use those
  // Otherwise send no key and let the server use env keys
  const effectiveProviderId = isImageMode
    ? "nvidia"
    : (settings.apiKey ? settings.providerId : modeState.generalProviderId);

  const effectiveModelId = isImageMode
    ? modeState.imageModelId
    : (settings.apiKey ? settings.modelId : modeState.generalModelId);

  // Only send the user's own API key for general text chat; for image mode, use the server's env key.
  const effectiveApiKey = isImageMode ? undefined : (settings.apiKey || undefined);

  const prepareRequest = useCallback(
    ({ messages }: { messages: UIMessage[]; id: string }) => ({
      body: {
        messages,
        chatId: activeChatId,
        providerId: effectiveProviderId,
        modelId: effectiveModelId,
        apiKey: effectiveApiKey,
      },
    }),
    [activeChatId, effectiveProviderId, effectiveModelId, effectiveApiKey]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: prepareRequest,
        // Intercept 402 (tokens exhausted)
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          if (res.status === 402) {
            setShowTokenDialog(true);
          }
          return res;
        },
      }),
    [prepareRequest]
  );

  const { messages, setMessages, sendMessage, status, stop, regenerate } = useChat({
    id: activeChatId,
    messages: initialMessages,
    transport,
  });

  // Navigate to chat URL after first message (new chats from root page)
  useEffect(() => {
    if (!id && messages.length > 0 && window.location.pathname === "/") {
      router.push(`/chat/${activeChatId}`);
    }
  }, [messages, id, activeChatId, router]);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const isLoading = status === "streaming" || status === "submitted" || isGeneratingImage;
  const error = status === "error";

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (isImageMode) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsGeneratingImage(true);

      const userMessageId = Date.now().toString();
      setMessages((prev) => [...prev, { id: userMessageId, role: "user", parts: [{ type: "text", text }] }]);

      try {
        if (!id && window.location.pathname === "/") {
          router.push(`/chat/${activeChatId}`);
        }

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            providerId: "nvidia",
            modelId: modeState.imageModelId,
            apiKey: effectiveApiKey,
            chatId: activeChatId,
          }),
        });

        if (res.status === 402) {
          setShowTokenDialog(true);
          setMessages((prev) => prev.filter((m) => m.id !== userMessageId));
          return;
        }

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            parts: [{ type: "text", text: `![Generated Image](${data.url})` }],
            // tag so we can render differently
            annotations: [{ type: "image-generated" }],
          } as UIMessage,
        ]);
      } catch (err) {
        console.error("Image generation failed:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            parts: [{ type: "text", text: "❌ Failed to generate image. Please check your API key and try again." }],
          },
        ]);
      } finally {
        setIsGeneratingImage(false);
      }
    } else {
      sendMessage({ role: "user", parts: [{ type: "text", text }] });
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  }, [input, isLoading, isImageMode, sendMessage, setMessages, modeState.imageModelId, effectiveApiKey, id, activeChatId, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmptyChat = messages.length === 0;

  // Helper: detect if message is a generated image (contains markdown image syntax)
  const isImageMessage = (msg: UIMessage) => {
    const text = msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
    return /!\[.*?\]\(.*?\)/.test(text) && msg.role === "assistant";
  };

  return (
    <>
      {/* Token Exhausted Dialog */}
      <TokenExhaustedDialog
        open={showTokenDialog}
        onClose={() => setShowTokenDialog(false)}
      />

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/80 sticky top-0 z-10">
        <SidebarTrigger className="-ml-1" />
        <div className="flex-1" />
        <ProviderSelector />
        <ThemeToggle />
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {isEmptyChat ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-20 space-y-4">
            <div className="flex aspect-square size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Bot className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">How can I help you?</h1>
              <p className="text-muted-foreground max-w-md">
                {isImageMode
                  ? "Describe what you want to see and I'll generate an image for you."
                  : "Ask me anything — I can write code, explain concepts, analyze data, and much more."}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => {
              const isImgMsg = isImageMessage(msg);
              const textContent = msg.parts.filter(isTextUIPart).map((p) => p.text).join("");

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground mt-1">
                      {isImgMsg ? <ImageIcon className="size-4" /> : <Bot className="size-4" />}
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : isImgMsg
                        ? "bg-muted/30 rounded-tl-sm p-2"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{textContent}</p>
                    ) : isImgMsg ? (
                      // Render generated image nicely — extract URL from markdown
                      <GeneratedImageMessage content={textContent} />
                    ) : (
                      <MarkdownRenderer content={textContent} />
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex-shrink-0 flex aspect-square size-8 items-center justify-center rounded-full bg-secondary mt-1">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Streaming / generating indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground mt-1">
                  {isImageMode ? <ImageIcon className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  {isImageMode ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="animate-pulse">🎨</span>
                      Generating image…
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
                <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Error</p>
                  <p className="text-destructive/80">
                    Something went wrong. Check your API key or try a different provider.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 h-7 text-xs border-destructive/30 text-destructive hover:text-destructive"
                  onClick={() => regenerate()}
                >
                  <RotateCcw className="size-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}

            {/* Regenerate button */}
            {!isLoading && messages.length > 0 && !error && !isImageMode && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1.5"
                  onClick={() => regenerate()}
                >
                  <RotateCcw className="size-3" />
                  Regenerate response
                </Button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col bg-muted/50 border rounded-2xl px-4 pt-3 pb-2 focus-within:ring-1 focus-within:ring-ring transition-all gap-2">
            {/* Textarea */}
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isImageMode
                    ? "Describe the image you want to generate…"
                    : "Ask anything… (Enter to send, Shift+Enter for new line)"
                }
                className="flex-1 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 min-h-[24px] max-h-[200px] placeholder:text-muted-foreground/60"
                rows={1}
                disabled={isLoading}
              />
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="flex-shrink-0 rounded-xl size-9"
                  onClick={stop}
                >
                  <Square className="size-4 fill-current" />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  className="flex-shrink-0 rounded-xl size-9"
                  disabled={!input.trim()}
                  onClick={handleSend}
                >
                  <SendHorizontal className="size-4" />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>

            {/* Bottom bar: mode switcher */}
            <div className="flex items-center">
              <ModeSwitcher chatMode={chatMode} disabled={isLoading} />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Generated Image Message ──────────────────────────────────────────────────

function GeneratedImageMessage({ content }: { content: string }) {
  // Extract image URL from markdown: ![alt](url)
  const match = content.match(/!\[.*?\]\((.*?)\)/);
  const src = match?.[1];

  if (!src) {
    return <MarkdownRenderer content={content} />;
  }

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Generated image"
        className="rounded-xl max-w-full h-auto shadow-md border border-border"
        style={{ maxHeight: 512 }}
      />
      <p className="text-[10px] text-muted-foreground text-center">AI-generated image</p>
    </div>
  );
}
