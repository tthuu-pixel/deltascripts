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
const fixtureTopics = [
  {
    id: randomUUID(),
    title: 'Căn thức của lớp',
    category: 'Đại số',
    description: 'Bài học do quản trị viên biên soạn.',
    theory: String.raw`Căn bậc hai $\sqrt{49}=7$.`,
    icon: 'radical',
    color: 'blue',
    published: 1,
    number: 1,
  },
  {
    id: randomUUID(),
    title: 'Đường tròn của lớp',
    category: 'Hình học',
    description: 'Bài học hình học của lớp.',
    theory: '',
    icon: 'circle',
    color: 'red',
    published: 1,
    number: 6,
  },
  {
    id: randomUUID(),
    title: 'Chuyên đề nháp chưa công bố',
    category: 'Đại số',
    description: '',
    theory: 'Nội dung riêng',
    icon: 'topics',
    color: 'yellow',
    published: 0,
    number: 2,
  },
];
for (const [index, topic] of fixtureTopics.entries()) {
  await db
    .prepare(
      'INSERT INTO topics(id,title,category,description,theory,icon,color,published,position) VALUES(?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      topic.id,
      topic.title,
      topic.category,
      topic.description,
      topic.theory,
      topic.icon,
      topic.color,
      topic.published,
      index,
    )
    .run();
  await db
    .prepare(
      'INSERT INTO question_topics(question_id,topic_id) SELECT id,? FROM questions WHERE active=1 AND number=?',
    )
    .bind(topic.id, topic.number)
    .run();
}
await db
  .prepare('UPDATE topics SET examples=? WHERE id=?')
  .bind('Ví dụ riêng của lớp: giải $x+1=3$ được $x=2$.', fixtureTopics[0].id)
  .run();
process.on('SIGTERM', async () => {
  await runtime.close();
  process.exit(0);
});
