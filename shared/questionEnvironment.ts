import {
  declarationEnd,
  maskTexComments,
  matchingVisibleBrace,
  skipSpace,
  texCommands,
} from './texSyntax';

// Read the outer source environment, skipping comments and macro declarations. This also works
// on a stored header without needing the (possibly very large) answer or drawing body.
export function sourceEnvironment(source: string): string | null {
  const visible = maskTexComments(source.replace(/^\uFEFF/, ''));
  let until = 0;
  try {
    for (const command of texCommands(visible)) {
      if (command.index! < until) continue;
      const end = declarationEnd(visible, command.index!, command[1]);
      if (end >= 0) {
        until = end;
        continue;
      }
      if (command[1] !== 'begin') continue;
      const arg = skipSpace(visible, command.index! + command[0].length);
      const close = matchingVisibleBrace(visible, arg);
      if (close < 0) return null;
      const name = visible.slice(arg + 1, close).trim();
      if (name === 'document') continue;
      return name || null;
    }
  } catch {
    /* An incomplete declaration cannot prove an eligible exercise. */
  }
  return null;
}
export function questionEnvironment(question: {
  sourceType?: string;
  raw?: string;
  exerciseEnvironment?: string | null;
}): string | null {
  if (question.sourceType !== 'tex') return null;
  // A supplied source takes precedence over metadata; an ex cannot be relabelled bt.
  if (question.raw?.trim()) return sourceEnvironment(question.raw);
  return question.exerciseEnvironment || null;
}
export const aiExerciseOnlyMessage =
  'AI tự sửa và phân loại bt; ex không có lựa chọn đáp án được chuyển sang bt. Giữ nguyên TikZ, bỏ immini và lưu bản trước khi sửa.';
