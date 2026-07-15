"use client";

import { useState, useCallback, useEffect } from "react";

export type ChatMode = "general" | "text-to-image";

export interface ChatModeState {
  mode: ChatMode;
  generalProviderId: string;
  generalModelId: string;
  imageModelId: string;
}

const STORAGE_KEY = "chat_mode_settings";

const DEFAULTS: ChatModeState = {
  mode: "general",
  generalProviderId: "groq",
  generalModelId: "llama-3.3-70b-versatile",
  imageModelId: "black-forest-labs/flux1-dev",
};

function load(): ChatModeState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(state: ChatModeState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useChatMode() {
  const [state, setState] = useState<ChatModeState>(DEFAULTS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
  }, []);

  const setMode = useCallback((mode: ChatMode) => {
    setState((prev) => {
      const next = { ...prev, mode };
      save(next);
      return next;
    });
  }, []);

  const setGeneralModel = useCallback((providerId: string, modelId: string) => {
    setState((prev) => {
      const next = { ...prev, generalProviderId: providerId, generalModelId: modelId };
      save(next);
      return next;
    });
  }, []);

  const setImageModel = useCallback((modelId: string) => {
    setState((prev) => {
      const next = { ...prev, imageModelId: modelId };
      save(next);
      return next;
    });
  }, []);

  return { state, setMode, setGeneralModel, setImageModel };
}
