"use client";

const KEY_STORAGE = "openrouter-api-key";
const MODEL_STORAGE = "openrouter-model";

export const AI_MODELS = [
  { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 (fast)" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setApiKey(key: string) {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}

export function getModel(): string {
  if (typeof window === "undefined") return AI_MODELS[0].value;
  return localStorage.getItem(MODEL_STORAGE) ?? AI_MODELS[0].value;
}

export function setModel(model: string) {
  localStorage.setItem(MODEL_STORAGE, model);
}
