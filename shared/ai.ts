export const aiProviders = {
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
  },
  openai: { label: 'OpenAI / GPT', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  anthropic: {
    label: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-5',
  },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
} as const;
export type AiProvider = keyof typeof aiProviders;
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
  number: number | null;
  topicIds: string[];
  reason: string;
}
