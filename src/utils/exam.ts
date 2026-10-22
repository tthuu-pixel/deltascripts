import type { Question } from '../types';
export const EXAM_DURATION = 120 * 60 * 1000;
export interface SavedExam {
  questions: Question[];
  endAt: number | null;
  showAnswers: boolean;
  createdAt: number;
}
export function validExam(value: any): value is SavedExam {
  return (
    !!value &&
    Array.isArray(value.questions) &&
    value.questions.length === 7 &&
    new Set(value.questions.map((q: any) => q.number)).size === 7 &&
    value.questions.every(
      (q: any) =>
        q &&
        Number.isInteger(q.number) &&
        q.number >= 1 &&
        q.number <= 7 &&
        typeof q.statementRaw === 'string' &&
        typeof q.solutionRaw === 'string',
    ) &&
    (value.endAt === null ||
      (Number.isFinite(value.endAt) && value.endAt <= Date.now() + EXAM_DURATION + 5000)) &&
    typeof value.showAnswers === 'boolean' &&
    Number.isFinite(value.createdAt) &&
    Date.now() - value.createdAt < 7 * 24 * 60 * 60 * 1000
  );
}
export function remainingSeconds(endAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
