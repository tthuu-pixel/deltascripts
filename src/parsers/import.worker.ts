import { isTopicTexArchive, parseTopicTexArchive } from '../../shared/topicTexArchive';
import { parseRepairableTex } from '../../shared/essayNormalization';
import { parseWordFile } from './wordParser';
import { parseTexText } from '../../shared/texParser';
import { normalizeQuestion } from '../../shared/importReview';
self.onmessage = async (
  event: MessageEvent<
    File[] | { files: File[]; preserveSource: boolean; restoreExports?: boolean }
  >,
) => {
  try {
    const questions = [];
    const fileErrors: string[] = [];
    const acceptedFiles: string[] = [];
    const preserveSource = !Array.isArray(event.data) && event.data.preserveSource;
    const files = Array.isArray(event.data) ? event.data : event.data.files;
    const restoreExports = !Array.isArray(event.data) && event.data.restoreExports;
    for (const file of files) {
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error('File vượt 20 MB.');
        const source = /\.tex$/i.test(file.name) ? await file.text() : '';
        const archive = isTopicTexArchive(source, file.name);
        if (archive && !restoreExports)
          throw new Error(
            'File tải từ chuyên đề: dùng nút “Nhập file TeX (.tex)” để cập nhật câu gốc.',
          );
        const parsed = archive
          ? parseTopicTexArchive(source)
          : /\.docx$/i.test(file.name)
            ? await parseWordFile(file)
            : /\.tex$/i.test(file.name)
              ? (preserveSource ? parseTexText : parseRepairableTex)(source)
              : (() => {
                  throw new Error('Chỉ hỗ trợ file Word .docx hoặc LaTeX .tex.');
                })();
        if (!parsed.length) throw new Error('Không tìm thấy câu hỏi.');
        questions.push(...parsed);
        acceptedFiles.push(file.name);
      } catch (error) {
        fileErrors.push(`${file.name}: ${(error as Error).message}`);
      }
    }
    if (!questions.length) throw new Error(fileErrors.join(' ') || 'Không tìm thấy câu hỏi.');
    const reviewed = questions.map((q) =>
      preserveSource ? { question: q, report: undefined } : normalizeQuestion(q),
    );
    self.postMessage({
      fileErrors,
      acceptedFiles,
      questions: reviewed.map((item) => item.question),
      reports: Object.fromEntries(reviewed.map((item) => [item.question.id, item.report])),
    });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
