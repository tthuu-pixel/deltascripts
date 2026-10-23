import type { Question } from '../src/types';
import { parseTexText } from './texParser';

// Older upload drafts may already contain a normalized body. Prefer their retained
// original source without changing IDs, preamble or topic/publication metadata.
export function uploadedQuestion(question: Question): Question {
  if (question.sourceType !== 'tex' || !question.originalRaw) return { ...question };
  try {
    const parsed = parseTexText(question.originalRaw);
    if (parsed.length === 1)
      return {
        ...question,
        statementRaw: parsed[0].statementRaw,
        solutionRaw: parsed[0].solutionRaw,
        exerciseEnvironment: parsed[0].exerciseEnvironment,
        raw: question.originalRaw,
        aiRepaired: undefined,
      };
  } catch {
    /* Retain the complete uploaded text even when it cannot be parsed again. */
  }
  return { ...question, raw: question.originalRaw, aiRepaired: undefined };
}
