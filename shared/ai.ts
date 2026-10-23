export const aiProviders = {
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-3.8-flash',
  },
  openai: { label: 'OpenAI / GPT', baseUrl: 'https://api.openai.com/v1', model: 'gpt-6.1-sol' },
  anthropic: {
    label: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-5-5',
  },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash' },
} as const;
export type AiProvider = keyof typeof aiProviders;
// Checked against official provider SDKs/cookbooks on 2026-10-23.
// These are suggestions; account model discovery and existing saved IDs remain supported.
export const suggestedAiModels: Record<AiProvider, readonly string[]> = {
  gemini: ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-3.5-flash-lite'],
  openai: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'],
  anthropic: [
    'claude-sonnet-5-5',
    'claude-opus-5-5',
    'claude-haiku-5-5',
    'claude-mythos-5-1',
    'claude-fable-5-1',
  ],
  deepseek: ['deepseek-flash', 'deepseek-v4-pro'],
};

export interface AiSettings {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  hasKey: boolean;
  version: number;
  encryptionReady: boolean;
}
export interface AiSuggestion {
  id: string;
  topicIds: string[];
  reason: string;
}
