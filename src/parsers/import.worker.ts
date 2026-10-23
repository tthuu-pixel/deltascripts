import { parseTexFile } from './texParser';
import { parseWordFile } from './wordParser';
import { normalizeQuestion } from '../../shared/importReview';
self.onmessage = async (event: MessageEvent<File[]>) => {
  try {
    const questions = [];
    const fileErrors: string[] = [];
    for (const file of event.data) {
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error('File vượt 20 MB.');
        if (/\.docx$/i.test(file.name)) questions.push(...(await parseWordFile(file)));
        else if (/\.tex$/i.test(file.name)) questions.push(...(await parseTexFile(file)));
        else throw new Error('Chỉ hỗ trợ file Word .docx hoặc LaTeX .tex.');
      } catch (error) {
        fileErrors.push(`${file.name}: ${(error as Error).message}`);
      }
    }
    if (!questions.length) throw new Error(fileErrors.join(' ') || 'Không tìm thấy câu hỏi.');
    const reviewed = questions.map(normalizeQuestion);
    self.postMessage({
      fileErrors,
      questions: reviewed.map((item) => item.question),
      reports: Object.fromEntries(reviewed.map((item) => [item.question.id, item.report])),
    });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
