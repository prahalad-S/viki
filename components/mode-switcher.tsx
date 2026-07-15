"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import { ChatMode, useChatMode } from "@/hooks/use-chat-mode";
import { ImageIcon, MessageSquare } from "lucide-react";

// All image models (nvidia only for now)
const IMAGE_MODELS = PROVIDERS.flatMap((p) =>
  p.models
    .filter((m) => m.type === "image")
    .map((m) => ({ providerId: p.id, providerName: p.name, ...m }))
);

interface ModeSwitcherProps {
  chatMode: ReturnType<typeof useChatMode>;
  disabled?: boolean;
}

export function ModeSwitcher({ chatMode, disabled }: ModeSwitcherProps) {
  const { state, setMode, setGeneralModel, setImageModel } = chatMode;
  const isGeneral = state.mode === "general";
  const isImage = state.mode === "text-to-image";

  const modes: { id: ChatMode; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <MessageSquare className="size-3" /> },
    { id: "text-to-image", label: "Text to Image", icon: <ImageIcon className="size-3" /> },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Mode pills */}
      <div className="flex items-center rounded-lg bg-muted/70 border p-0.5 gap-0.5">
        {modes.map((m) => {
          const active = state.mode === m.id;
          return (
            <button
              key={m.id}
              disabled={disabled}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.icon}
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Model selector */}
      {isGeneral && (
        <Select
          value={`${state.generalProviderId}:::${state.generalModelId}`}
          onValueChange={(val) => {
            if (!val) return;
            const parts = val.split(":::");
            const pid = parts[0] ?? "groq";
            const mid = parts[1] ?? "";
            setGeneralModel(pid, mid);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 text-xs rounded-lg border-dashed w-auto max-w-[200px] gap-1.5 px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="text-xs">
            {PROVIDERS.filter((p) =>
              p.models.some((m) => m.type !== "image")
            ).map((p) => {
              const textModels = p.models.filter((m) => m.type !== "image");
              return (
                <div key={p.id}>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {p.name}
                  </div>
                  {textModels.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={`${p.id}:::${m.id}`}
                      className="text-xs pl-4"
                    >
                      {m.name}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {isImage && (
        <Select
          value={state.imageModelId}
          onValueChange={(val) => { if (val) setImageModel(val); }}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 text-xs rounded-lg border-dashed w-auto max-w-[220px] gap-1.5 px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="text-xs">
            {IMAGE_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <div className="flex flex-col">
                  <span>{m.name}</span>
                  {m.description && (
                    <span className="text-[10px] text-muted-foreground">{m.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
