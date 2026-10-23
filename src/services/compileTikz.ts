import { buildTikzDocument } from '../../shared/tikz';
import { readTikzCache, tikzCacheKey, writeTikzCache } from './tikzCache';

const cache = new Map<string, Promise<string>>();
let running = 0;
const queue: (() => void)[] = [];
async function slot() {
  if (running < 2) running++;
  else await new Promise<void>((resolve) => queue.push(resolve));
}
function release() {
  const next = queue.shift();
  if (next) next();
  else running--;
}
const validPng = (base64: unknown): base64 is string =>
  typeof base64 === 'string' &&
  /^iVBORw0KGgo[A-Za-z0-9+/=\s]+$/.test(base64) &&
  base64.length <= 8_000_000;
const imageHtml = (base64: string) =>
  `<img src="data:image/png;base64,${base64}" alt="Hình minh họa TikZ" class="tikz-rendered-image rounded" loading="lazy"/>`;

async function compile(source: string): Promise<string> {
  const endpoint = import.meta.env?.VITE_TIKZ_API_URL || 'https://tikz-fly.fly.dev';
  const full = buildTikzDocument(source);
  const key = await tikzCacheKey(full, endpoint);
  const saved = await readTikzCache(key);
  if (validPng(saved)) return imageHtml(saved);
  await slot();
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: full }),
      signal: AbortSignal.timeout(15_000),
    });
    let base64 = '';
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      if (!response.ok || data.ok === false || data.success === false) {
        const detail = [data.error, data.message, data.log, data.stderr, data.details]
          .filter((value) => typeof value === 'string')
          .join('\n');
        const line = detail.match(
          /(?:!\s*)?(?:Undefined control sequence|Package [^\n]+ Error|LaTeX Error|Missing [^\n]+|Emergency stop)[^\n]*/,
        )?.[0];
        throw new Error(
          line
            ? `Lỗi biên dịch TikZ: ${line.slice(0, 300)}`
            : `Dịch vụ TikZ chưa biên dịch được hình (HTTP ${response.status}). Kiểm tra cú pháp và macro của hình.`,
        );
      }
      base64 =
        data.base64 ||
        data.image ||
        data.image_base64 ||
        data.png ||
        data.png_base64 ||
        data.result?.base64 ||
        data.output?.base64 ||
        '';
      base64 = typeof base64 === 'string' ? base64.replace(/^data:image\/png;base64,/, '') : '';
    } else {
      if (!response.ok) throw new Error(`Dịch vụ TikZ chưa sẵn sàng (HTTP ${response.status}).`);
      if (!response.headers.get('content-type')?.includes('image/png'))
        throw new Error('Dịch vụ TikZ không trả về ảnh PNG.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      base64 = btoa(binary);
    }
    if (!validPng(base64)) throw new Error('Dịch vụ TikZ không trả về ảnh PNG hợp lệ.');
    await writeTikzCache(key, base64);
    return imageHtml(base64);
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
      throw new Error('Biên dịch TikZ quá thời gian chờ. Hãy thử lại.');
    if (error instanceof TypeError)
      throw new Error('Không kết nối được dịch vụ TikZ. Hãy thử lại.');
    throw error;
  } finally {
    release();
  }
}
export function compileTikz(source: string): Promise<string> {
  if (!cache.has(source)) {
    const promise = compile(source).catch((error) => {
      cache.delete(source);
      throw error;
    });
    cache.set(source, promise);
    if (cache.size > 40) cache.delete(cache.keys().next().value!);
  }
  return cache.get(source)!;
}
