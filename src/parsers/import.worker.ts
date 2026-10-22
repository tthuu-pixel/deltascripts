import { parseTexFile } from './texParser';
import { parseWordFile } from './wordParser';
import { normalizeQuestion } from '../../shared/importReview';
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
    const invalid = questions.filter((q) => !q.statementRaw.trim());
    if (invalid.length) throw new Error('Có câu bị thiếu đề. Hãy kiểm tra file trước khi lưu.');
    const reviewed = questions.map(normalizeQuestion);
    self.postMessage({
      questions: reviewed.map((item) => item.question),
      reports: Object.fromEntries(reviewed.map((item) => [item.question.id, item.report])),
    });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
