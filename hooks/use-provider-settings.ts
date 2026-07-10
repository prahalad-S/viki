"use client";

import { useState, useCallback, useEffect } from "react";
import { PROVIDERS, ProviderId } from "@/lib/providers";

const STORAGE_KEY = "chat_provider_settings";

export interface ProviderSettings {
  providerId: ProviderId;
  modelId: string;
  apiKey: string;
}

function getDefault(): ProviderSettings {
  return {
    providerId: "groq",
    modelId: "llama-3.3-70b-versatile",
    apiKey: "",
  };
}

function load(): ProviderSettings {
  if (typeof window === "undefined") return getDefault();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefault();
    return { ...getDefault(), ...JSON.parse(raw) };
  } catch {
    return getDefault();
  }
}

function save(settings: ProviderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useProviderSettings() {
  const [settings, setSettings] = useState<ProviderSettings>(getDefault());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(load());
  }, []);

  const update = useCallback((updates: Partial<ProviderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      // Reset model when provider changes
      if (updates.providerId && updates.providerId !== prev.providerId) {
        const provider = PROVIDERS.find((p) => p.id === updates.providerId);
        next.modelId = provider?.models[0]?.id ?? "";
      }
      save(next);
      return next;
    });
  }, []);

  return { settings, update };
}
