import { studyGuideContent } from '../shared/studyGuide';
import type { TopicExecutor } from './practical-topics';

// Fill an empty guide only. Preserve every other setting and reject concurrent edits.
export async function seedStudyGuide(execute: TopicExecutor, apply = false) {
  const row = (await execute('SELECT content,version FROM student_settings WHERE id=1', []))
    .results[0];
  if (!row) throw new Error('Chưa có cấu hình trang học sinh. Hãy chạy migrations trước.');
  const content = JSON.parse(String(row.content || '{}'));
  if (typeof content.guideContent === 'string' && content.guideContent.trim())
    return { applied: false, reason: 'existing-content', version: row.version };
  if (!apply)
    return {
      applied: false,
      reason: 'empty-guide',
      version: row.version,
      characters: studyGuideContent.length,
    };
  const result = await execute(
    "UPDATE student_settings SET content=json_set(content,'$.guideContent',?),version=version+1 WHERE id=1 AND version=?",
    [studyGuideContent, row.version],
  );
  if (result.meta?.changes !== 1)
    throw new Error('Cấu hình vừa được sửa ở cửa sổ khác. Hãy kiểm tra lại trước khi bổ sung.');
  return { applied: true, version: Number(row.version) + 1, characters: studyGuideContent.length };
}
