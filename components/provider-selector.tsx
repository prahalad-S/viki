"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Settings2, Key } from "lucide-react";
import { PROVIDERS } from "@/lib/providers";
import { useProviderSettings } from "@/hooks/use-provider-settings";

export function ProviderSelector() {
  const { settings, update } = useProviderSettings();
  const [open, setOpen] = useState(false);

  const currentProvider = PROVIDERS.find((p) => p.id === settings.providerId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs rounded-full">
            <Settings2 className="size-3" />
            {currentProvider?.name} / {currentProvider?.models.find(m => m.id === settings.modelId)?.name ?? settings.modelId}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-4" />
            AI Provider Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={settings.providerId}
              onValueChange={(val) => update({ providerId: val as typeof settings.providerId })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={settings.modelId}
              onValueChange={(val) => update({ modelId: val ?? undefined })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentProvider?.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <span>{m.name}</span>
                      {m.description && (
                        <span className="text-xs text-muted-foreground">{m.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentProvider?.requiresApiKey && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="size-3" />
                API Key
              </Label>
              <Input
                type="password"
                placeholder={`Enter your ${currentProvider.name} API key`}
                value={settings.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Stored locally in your browser. Never sent to our servers.
              </p>
            </div>
          )}

          {!currentProvider?.requiresApiKey && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {currentProvider?.id === "ollama"
                ? "Make sure Ollama is running locally on port 11434."
                : "No API key required."}
            </div>
          )}

          <Button className="w-full" onClick={() => setOpen(false)}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
