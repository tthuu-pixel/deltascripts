import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRuntime } from './runtime.ts';
import { createTeacher } from '../server/auth.ts';
import { upsertQuestions } from '../server/app.ts';
import { parseTexText } from '../shared/texParser.ts';
const runtime = await createRuntime({ port: 3101, origin: 'http://127.0.0.1:3100' });
const { db } = runtime;
await createTeacher(db, 'browser@example.test', 'browser-test-password');
await db.query('INSERT INTO access_codes(code) VALUES(?)', ['E2E00001']);
await upsertQuestions(
  db,
  Array.from({ length: 7 }, (_, i) => ({
    id: randomUUID(),
    label: `Câu ${i + 1}`,
    number: i + 1,
    sourceType: 'tex',
    statementRaw: `Tính $${i + 1}+1$. ${i === 0 ? '<img src="x" onerror="window.__xss=1"><a href="javascript:window.__xss=2">bad</a>' : ''}${i === 1 ? String.raw`\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}` : ''}`,
    solutionRaw: 'Lời giải $2$.',
  })),
);
for (const file of ['skill-geometry.tex', 'skill-chart.tex']) {
  const questions = parseTexText(
    await readFile(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'),
  );
  await db.query('DELETE FROM questions WHERE number=?', [questions[0].number]);
  await upsertQuestions(db, questions);
}
process.on('SIGTERM', async () => {
  await runtime.close();
  process.exit(0);
});
