import { useState } from 'react';
import { suggestedAiModels, type AiProvider } from '../../shared/ai';

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
  const choices = [...new Set([...models, ...suggestedAiModels[provider], value])].filter(Boolean);
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
