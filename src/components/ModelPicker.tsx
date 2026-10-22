import { useState } from 'react';
import { aiProviders, type AiProvider } from '../../shared/ai';

const alternatives: Record<AiProvider, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4.1-nano', 'gpt-5'],
  anthropic: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};
export default function ModelPicker({
  provider,
  value,
  models,
  disabled,
  onChange,
}: {
  provider: AiProvider;
  value: string;
  models: string[];
  disabled?: boolean;
  onChange: (model: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  const choices = [
    ...new Set([value, aiProviders[provider].model, ...models, ...alternatives[provider]]),
  ].filter(Boolean);
  return (
    <div className="model-picker field">
      <label>
        <span>Mô hình</span>
        <select
          aria-label="Mô hình"
          disabled={disabled}
          value={custom ? '__custom__' : value}
          onChange={(e) => {
            const manual = e.target.value === '__custom__';
            setCustom(manual);
            if (!manual) onChange(e.target.value);
          }}
        >
          {choices.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
          <option value="__custom__">Model khác…</option>
        </select>
      </label>
      {custom && (
        <label>
          <span>Tên mô hình khác</span>
          <input
            aria-label="Tên mô hình khác"
            required
            maxLength={200}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
          />
        </label>
      )}
    </div>
  );
}
