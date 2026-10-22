import { drawingPreamble, environmentRanges } from './texSyntax.ts';

/** Separate a complete TeX document without modifying its mathematics or drawing declarations. */
export function readLessonSource(input: string) {
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const documents = environmentRanges(source, ['document']);
  if (!documents.length) return { theory: source, preamble: '' };
  if (documents.length !== 1) throw new Error('Bài học chỉ nên có một môi trường document.');
  const document = documents[0];
  return {
    theory: source.slice(document.bodyStart, document.bodyEnd).trim(),
    preamble: drawingPreamble(source.slice(0, document.start)),
  };
}
