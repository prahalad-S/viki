import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { LanguageModel } from "ai";

export type ProviderId =
  | "openai"
  | "google"
  | "groq"
  | "openrouter"
  | "ollama";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  description: string;
  requiresApiKey: boolean;
  models: ModelConfig[];
  baseUrl?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    name: "Google Gemini",
    description: "Google's Gemini family of models",
    requiresApiKey: true,
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Fast & capable", contextWindow: 1000000 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Most capable", contextWindow: 2000000 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast & efficient", contextWindow: 1000000 },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference with open models",
    requiresApiKey: true,
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", description: "Meta's best open model", contextWindow: 128000 },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", description: "Fast & free tier", contextWindow: 128000 },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "Mixture of experts", contextWindow: 32768 },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", description: "Google's Gemma model", contextWindow: 8192 },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o and other OpenAI models",
    requiresApiKey: true,
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "Most capable", contextWindow: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast & affordable", contextWindow: 128000 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast & cheap", contextWindow: 16385 },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access hundreds of models via one API",
    requiresApiKey: true,
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", description: "Free tier" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", description: "Free reasoning model" },
      { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B (Free)", description: "Free Google model" },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", description: "Free fast model" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Run models locally on your machine",
    requiresApiKey: false,
    baseUrl: "http://localhost:11434/v1",
    models: [
      { id: "llama3.2", name: "Llama 3.2", description: "Meta's local model" },
      { id: "mistral", name: "Mistral 7B", description: "Fast local model" },
      { id: "deepseek-r1", name: "DeepSeek R1", description: "Reasoning model" },
      { id: "gemma3", name: "Gemma 3", description: "Google's local model" },
    ],
  },
];

export function getModel(
  providerId: ProviderId,
  modelId: string,
  apiKey?: string,
  baseUrl?: string
): LanguageModel {
  switch (providerId) {
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    case "groq": {
      const groq = createGroq({ apiKey });
      return groq(modelId);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter(modelId);
    }
    case "ollama": {
      const ollama = createOpenAI({
        apiKey: "ollama",
        baseURL: baseUrl || "http://localhost:11434/v1",
      });
      return ollama(modelId);
    }
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}
