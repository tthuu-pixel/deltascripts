import { parseTexFile } from './texParser';
import { parseWordFile } from './wordParser';
self.onmessage = async (event: MessageEvent<File[]>) => {
  try {
    const questions = [];
    for (const file of event.data) {
      if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: file vượt 20 MB.`);
      if (/\.docx$/i.test(file.name)) questions.push(...(await parseWordFile(file)));
      else if (/\.tex$/i.test(file.name)) questions.push(...(await parseTexFile(file)));
      else throw new Error(`Không hỗ trợ file ${file.name}.`);
    }
    if (!questions.length) throw new Error('Không tìm thấy câu hỏi.');
    const invalid = questions.filter((q) => q.number < 1 || q.number > 7 || !q.statementRaw.trim());
    if (invalid.length)
      throw new Error('Có câu bị thiếu đề hoặc số câu ngoài 1–7. Hãy kiểm tra file trước khi lưu.');
    self.postMessage({ questions });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
