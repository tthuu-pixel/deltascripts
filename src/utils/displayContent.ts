import { normalizeTexContent } from '../parsers/texParser';
import { compileTikz } from '../services/compileTikz';

export const processContentForDisplay = async (raw: string): Promise<string> => {
  if (!raw || typeof raw !== 'string') {
    return "Câu hỏi này chưa có nội dung.";
  }

  console.log("Before normalize length:", raw?.length);

  // 0. Escape < in math to prevent HTML truncation
  // We only escape < that are not part of valid HTML tags
  const safeRaw = raw.replace(/<(?!\/?(p|div|br|strong|table|tr|td|ol|ul|li|img|span|a|b|i|u|em|h[1-6])(?=>|\s|\/))/gi, '&lt;');

  // 1. Normalize raw content
  let normalized = normalizeTexContent(safeRaw);
  console.log("After normalize length:", normalized?.length);

  // 2. Extract TikZ blocks
  const tikzRegex = /\\begin\{tikzpicture\}(.*?)\\end\{tikzpicture\}/gs;
  const matches = [...normalized.matchAll(tikzRegex)];

  if (matches.length > 0) {
    console.log(`processContentForDisplay: ${matches.length} tikz block(s) found`);
    
    // 3. Process each block
    for (const match of matches) {
      const fullBlock = match[0];
      
      // Fix corrupted TikZ block if it was already normalized
      const tikzSource = fullBlock
        .replace(/<br\s*\/?>/gi, '\\\\')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      try {
        const resultHtml = await compileTikz(tikzSource);
        normalized = normalized.replace(fullBlock, resultHtml);
      } catch (error) {
        console.error("processContentForDisplay: tikz compile error", error);
        const placeholder = `<div class="tikz-placeholder p-4 bg-gray-100 border border-gray-300 rounded text-center text-gray-500 italic my-2">[Hình minh họa TikZ]</div>`;
        normalized = normalized.replace(fullBlock, placeholder);
      }
    }
  }

  console.log("processContentForDisplay: final rendered html ready");
  return normalized;
};
