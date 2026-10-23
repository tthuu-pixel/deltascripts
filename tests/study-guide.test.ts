import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './runtime';
import { seedStudyGuide } from '../server/study-guide';
import { studyGuideContent } from '../shared/studyGuide';

test('guide content fills an empty page once and preserves custom settings and later edits', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const original = {
    heroTitle: 'Lớp của tôi',
    guideTitle: 'Hiểu bài hơn mỗi ngày',
    guideContent: '',
    tabs: [{ key: 'guide', label: 'Tự học', visible: true }],
  };
  await runtime.db
    .prepare('UPDATE student_settings SET content=?,version=3 WHERE id=1')
    .bind(JSON.stringify(original))
    .run();
  const execute = async (sql: string, params: unknown[]) => {
    const result = await runtime.db
      .prepare(sql)
      .bind(...params)
      .all();
    return { results: result.results, meta: { changes: result.meta.changes } };
  };
  assert.equal((await seedStudyGuide(execute)).reason, 'empty-guide');
  assert.equal(
    (await runtime.db.prepare('SELECT version FROM student_settings').first())!.version,
    3,
  );
  assert.equal((await seedStudyGuide(execute, true)).applied, true);
  const saved = (await runtime.db
    .prepare('SELECT content,version FROM student_settings WHERE id=1')
    .first())!;
  assert.equal(saved.version, 4);
  assert.deepEqual(JSON.parse(String(saved.content)), {
    ...original,
    guideContent: studyGuideContent,
  });
  assert.equal((await seedStudyGuide(execute, true)).reason, 'existing-content');
  await runtime.db
    .prepare(
      "UPDATE student_settings SET content=json_set(content,'$.guideContent',?),version=version+1 WHERE id=1",
    )
    .bind('Nội dung do chủ web sửa.')
    .run();
  assert.equal((await seedStudyGuide(execute, true)).applied, false);
  assert.equal(
    JSON.parse(
      String((await runtime.db.prepare('SELECT content FROM student_settings').first())!.content),
    ).guideContent,
    'Nội dung do chủ web sửa.',
  );
  // A stale seed cannot overwrite an edit made after its read.
  await runtime.db
    .prepare("UPDATE student_settings SET content=json_set(content,'$.guideContent','') WHERE id=1")
    .run();
  await assert.rejects(
    seedStudyGuide(async (sql, params) => {
      if (sql.startsWith('UPDATE'))
        await runtime.db.prepare('UPDATE student_settings SET version=version+1 WHERE id=1').run();
      return execute(sql, params);
    }, true),
    /vừa được sửa/,
  );
});
