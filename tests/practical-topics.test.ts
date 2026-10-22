import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { practicalTopics, seedPracticalTopics } from '../server/practical-topics';
import { defaultStudentSettings, topicIcons } from '../shared/content';
import { upsertQuestions } from '../server/app';

test('practical catalog reuses authored topics, adds drafts without grade groups, preserves sources and is safe to rerun', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const execute = async (sql: string, params: unknown[]) =>
    runtime.db
      .prepare(sql)
      .bind(...params)
      .all();
  assert.equal(practicalTopics.length, 18);
  assert.equal(new Set(practicalTopics.map((topic) => topic.title)).size, 18);
  assert.equal(new Set(practicalTopics.map((topic) => topic.category)).size, 4);
  for (const topic of practicalTopics) {
    assert(topic.title.length <= 160 && topic.description.length <= 500);
    assert(topicIcons.includes(topic.icon));
    assert(!/lớp\s*[89]/i.test(JSON.stringify(topic)));
  }
  const id = crypto.randomUUID();
  const source = String.raw`\begin{vd}Đề gốc $x+1=3$.\loigiai{$x=2$.}\end{vd}`;
  await runtime.db
    .prepare(
      "INSERT INTO topics(id,title,category,theory,examples,preamble,description,icon,color,published) VALUES(?,?,'Đại số',?,?,?,'Mô tả riêng','equation','red',1)",
    )
    .bind(id, 'Giải bài toán bằng cách lập phương trình', source, source, String.raw`\def\R{3}`)
    .run();
  await upsertQuestions(runtime.db, [
    {
      id: crypto.randomUUID(),
      label: 'Nguồn gốc',
      number: 1,
      sourceType: 'tex',
      statementRaw: 'Bài cũ',
      solutionRaw: 'Lời giải cũ',
      raw: source,
      published: true,
      topicIds: [id],
    },
  ]);
  const before = (await execute('SELECT * FROM questions', [])).results;
  const linksBefore = (await execute('SELECT * FROM question_topics', [])).results;
  const tabs = defaultStudentSettings.tabs.map((tab) =>
    tab.key === 'topics'
      ? {
          ...tab,
          label: 'Nắm chắc kiến thức',
          description: 'Hệ thống kiến thức lớp 9 theo từng chuyên đề.',
        }
      : tab,
  );
  await runtime.db
    .prepare('UPDATE student_settings SET content=? WHERE id=1')
    .bind(JSON.stringify({ ...defaultStudentSettings, heroTitle: 'Trang riêng của tôi', tabs }))
    .run();
  const preview = await seedPracticalTopics(execute);
  assert.equal(preview.added, 17);
  assert.equal(preview.applied, false);
  assert.equal((await execute('SELECT * FROM topics', [])).results.length, 1);
  const first = await seedPracticalTopics(execute, true);
  assert.equal(first.added, 17);
  assert.equal(first.reused, 1);
  const rows = (await execute('SELECT * FROM topics ORDER BY position,id', [])).results;
  assert.equal(rows.length, 18);
  assert.equal(rows[2].id, id);
  assert.equal(rows[2].theory, source);
  assert.equal(rows[2].examples, source);
  assert.equal(rows[2].description, 'Mô tả riêng');
  assert.equal(rows[2].color, 'red');
  assert.equal(rows[2].published, 1);
  assert(
    rows
      .filter((row) => row.id !== id)
      .every(
        (row) =>
          row.published === 0 &&
          row.theory === '' &&
          row.examples === '' &&
          row.question_count === 0,
      ),
  );
  assert.deepEqual((await execute('SELECT * FROM questions', [])).results, before);
  assert.deepEqual((await execute('SELECT * FROM question_topics', [])).results, linksBefore);
  const settings = (await execute('SELECT * FROM student_settings', [])).results[0];
  const content = JSON.parse(String(settings.content));
  assert.equal(content.heroTitle, 'Trang riêng của tôi');
  assert.equal(content.tabs[0].label, 'Nắm chắc kiến thức');
  assert.equal(content.tabs[0].description, 'Hệ thống kiến thức theo từng chuyên đề.');
  assert.deepEqual(content.tabs.slice(1), tabs.slice(1));
  const second = await seedPracticalTopics(execute, true);
  assert.equal(second.added, 0);
  assert.equal(second.reused, 18);
  assert.deepEqual((await execute('SELECT * FROM topics ORDER BY position,id', [])).results, rows);
  assert.deepEqual((await execute('SELECT * FROM student_settings', [])).results[0], settings);
  // A renamed seed remains the same topic with its user's title on the next explicit run.
  await runtime.db
    .prepare("UPDATE topics SET title='Tên tôi đã chỉnh',version=version+1 WHERE id=?")
    .bind(practicalTopics[0].id)
    .run();
  assert.equal((await seedPracticalTopics(execute, true)).added, 0);
  assert.equal(
    (await runtime.db
      .prepare('SELECT title FROM topics WHERE id=?')
      .bind(practicalTopics[0].id)
      .first())!.title,
    'Tên tôi đã chỉnh',
  );
});
