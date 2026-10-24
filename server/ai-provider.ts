import { type AiProvider } from '../shared/ai';
import { HttpError, requireValue } from './errors';

export class AiServiceError extends HttpError {
  constructor(
    message: string,
    public kind: 'timeout' | 'connection' | 'quota' | 'configuration' | 'unavailable',
    public retryAfterMs: number,
    status = 502,
  ) {
    super(status, message);
  }
}

export interface ProviderConfig {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
}
export async function providerRequest(
  config: ProviderConfig,
  path: string,
  options: { fetchGemini?: typeof fetch; requestTimeoutMs?: number },
  body?: unknown,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.provider === 'gemini') headers['x-goog-api-key'] = config.apiKey;
  else if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else headers.Authorization = `Bearer ${config.apiKey}`;
  let response: Response;
  const signal = AbortSignal.timeout(options.requestTimeoutMs || 45_000);
  try {
    response = await (options.fetchGemini || fetch)(`${config.baseUrl}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
      signal,
    });
  } catch {
    if (signal.aborted)
      throw new AiServiceError(
        'AI phản hồi quá thời gian chờ. Vui lòng thử lại.',
        'timeout',
        60000,
      );
    throw new AiServiceError('Kết nối đến dịch vụ AI tạm gián đoạn.', 'connection', 60000);
  }
  if (!response.ok) {
    const configuration = [401, 402, 403, 404].includes(response.status);
    const retry = response.headers.get('Retry-After');
    const retryAfterMs =
      response.status === 429 && retry
        ? Math.max(
            1000,
            Math.min(
              15 * 60000,
              /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now() || 60000,
            ),
          )
        : configuration
          ? 15 * 60000
          : 60000;
    throw new AiServiceError(
      response.status === 429
        ? 'Dịch vụ AI đang hết hạn mức. Hãy thử lại sau.'
        : response.status === 402
          ? 'Tài khoản dịch vụ AI không đủ số dư hoặc chưa bật thanh toán (HTTP 402). Kiểm tra tài khoản của nhà cung cấp.'
          : response.status === 401 || response.status === 403
            ? `API key không hợp lệ hoặc không có quyền dùng dịch vụ (HTTP ${response.status}). Kiểm tra lại key và Base URL trong Cấu hình AI.`
            : response.status === 404
              ? 'Không tìm thấy model hoặc đường dẫn API (HTTP 404). Kiểm tra & lấy model trong Cấu hình AI để chọn model được tài khoản hỗ trợ.'
              : `Dịch vụ AI từ chối yêu cầu (HTTP ${response.status}). Kiểm tra key, model và Base URL.`,
      configuration ? 'configuration' : response.status === 429 ? 'quota' : 'unavailable',
      retryAfterMs,
      response.status === 429 ? 429 : configuration ? 503 : 502,
    );
  }
  const reader = response.body?.getReader();
  requireValue(reader, 'Dịch vụ AI trả dữ liệu trống.', 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) {
        await reader.cancel();
        throw new HttpError(502, 'Kết quả AI vượt giới hạn, hãy chọn ít câu hơn.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (signal.aborted)
      throw new AiServiceError(
        'AI phản hồi quá thời gian chờ. Vui lòng thử lại.',
        'timeout',
        60000,
      );
    throw new AiServiceError(
      'Kết nối đến dịch vụ AI bị gián đoạn khi nhận kết quả.',
      'connection',
      60000,
    );
  }
  const bytes = new Uint8Array(size);
  let cursor = 0;
  for (const part of chunks) {
    bytes.set(part, cursor);
    cursor += part.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(502, 'Dịch vụ AI trả dữ liệu không hợp lệ.');
  }
}
export async function providerModels(
  config: ProviderConfig,
  options: { fetchGemini?: typeof fetch; requestTimeoutMs?: number },
) {
  const data = await providerRequest(config, 'models', options);
  const models =
    config.provider === 'gemini'
      ? (data.models || [])
          .filter(
            (m: any) =>
              !m.supportedGenerationMethods ||
              m.supportedGenerationMethods.includes('generateContent'),
          )
          .map((m: any) => String(m.name || '').replace(/^models\//, ''))
      : (data.data || []).map((m: any) => m.id);
  return {
    models: models
      .filter((m: unknown) => typeof m === 'string' && /^[\w./:-]{1,200}$/.test(m))
      .slice(0, 300),
  };
}

export async function generateReply(
  config: ProviderConfig,
  options: { fetchGemini?: typeof fetch; requestTimeoutMs?: number },
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  json = false,
): Promise<string> {
  let data: any;
  let output: string;
  const model = config.model.replace(/^models\//, '');
  const modernGemini = /^gemini-[34][.-]/.test(model);
  const modernGpt = /^gpt-6(?:[.-]|$)/.test(model);
  if (config.provider === 'gemini') {
    data = await providerRequest(
      config,
      `models/${encodeURIComponent(config.model.replace(/^models\//, ''))}:generateContent`,
      options,
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          ...(json ? { responseMimeType: 'application/json' } : {}),
          maxOutputTokens: /^gemini-4[.-]/.test(model)
            ? Math.max(maxTokens, 32768)
            : modernGemini
              ? Math.max(maxTokens, 8192)
              : maxTokens,
          ...(modernGemini ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
        },
      },
    );
    output = (data.candidates?.[0]?.content?.parts || [])
      .filter((p: any) => !p.thought)
      .map((p: any) => p.text || '')
      .join('');
  } else if (config.provider === 'anthropic') {
    data = await providerRequest(config, 'messages', options, {
      model: config.model,
      max_tokens: maxTokens,
      system,
      messages,
    });
    output = (data.content || [])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  } else {
    data = await providerRequest(config, 'chat/completions', options, {
      model: config.model,
      ...(config.provider === 'openai'
        ? {
            max_completion_tokens: modernGpt ? Math.max(maxTokens, 16384) : maxTokens,
            ...(modernGpt ? { reasoning_effort: 'low' } : {}),
          }
        : { max_tokens: maxTokens }),
      messages: [{ role: 'system', content: system }, ...messages],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    output = data.choices?.[0]?.message?.content || '';
  }
  requireValue(
    data.candidates?.[0]?.finishReason !== 'MAX_TOKENS' &&
      data.choices?.[0]?.finish_reason !== 'length' &&
      data.stop_reason !== 'max_tokens',
    'AI chưa tạo đủ câu trả lời trong giới hạn xử lý. Hãy thử lại hoặc chọn mô hình khác.',
    502,
  );
  requireValue(
    typeof output === 'string' && output.trim(),
    'AI chưa trả lời được yêu cầu này.',
    502,
  );
  return output;
}
