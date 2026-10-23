import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {
  curriculumSource,
  curriculumTopics,
  curriculumIds,
  retiredTopicTargets,
  rewriteCurriculum,
  validateCurriculum,
  type ExecuteCurriculum,
} from '../server/curriculum';
import { createRuntime } from './runtime';
import { upsertQuestions } from '../server/app';
import { prepareContent } from '../src/utils/displayContent';

test('authored curriculum covers all source types and renders every formula without custom document macros', () => {
  validateCurriculum();
  const codes = new Set<string>();
  let formulas = 0;
  for (const [i, t] of curriculumSource.entries()) {
    assert.equal(t.code, `CĐ${String(i + 1).padStart(2, '0')}`);
    assert.equal(t.examples.length, 2);
    for (const type of t.types) {
      assert(!codes.has(type.code));
      codes.add(type.code);
      assert(type.recognition && type.method);
    }
    for (const text of [
      ...t.knowledge,
      t.caution,
      ...t.types.flatMap((x) => [x.title, x.recognition, x.method, ...(x.variants || [])]),
      ...t.examples.flatMap((x) => [x.question, x.solution]),
    ]) {
      const maths = [...text.matchAll(/\$([^$]+)\$/g)];
      assert.equal((text.match(/\$/g) || []).length, maths.length * 2, `Unpaired math: ${text}`);
      for (const m of maths) {
        katex.renderToString(m[1], { throwOnError: true, strict: false });
        formulas++;
      }
    }
    for (const section of [curriculumTopics[i].theory, curriculumTopics[i].examples]) {
      const html = prepareContent(section).html;
      assert(html.includes('topic-curriculum'));
      assert(
        !/\\(?:DauHieu|TuKhoa|HuongGiai|ViTri|begin\{(?:dang|chuyende|longtable)\})/.test(html),
      );
    }
  }
  assert.equal(codes.size, 112);
  assert(formulas > 250);
});

async function fixture(t: TestContext) {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const execute: ExecuteCurriculum = async (sql, params) => {
    const r = await runtime.db
      .prepare(sql)
      .bind(...params)
      .all();
    return { results: r.results, meta: { changes: r.meta.changes } };
  };
  for (const id of new Set([
    ...curriculumIds.filter((id) => !id.startsWith('d7102026')),
    ...Object.keys(retiredTopicTargets),
  ])) {
    await execute(
      "INSERT INTO topics(id,title,description,theory,examples,published) VALUES(?,?,'Mô tả cũ','Lý thuyết cũ','Ví dụ cũ',0)",
      [id, 'Cũ ' + id],
    );
  }
  const oldIds = Object.keys(retiredTopicTargets);
  await upsertQuestions(runtime.db, [
    {
      id: crypto.randomUUID(),
      label: 'Nguồn giữ nguyên',
      number: 1,
      sourceType: 'tex',
      raw: String.raw`\begin{bt}Đề $x+2=3$.\loigiai{$x=1$.}\end{bt}`,
      statementRaw: 'Đề $x+2=3$.',
      solutionRaw: '$x=1$.',
      topicIds: [oldIds[0], retiredTopicTargets[oldIds[0]], oldIds[2]],
      published: true,
    },
    {
      id: crypto.randomUUID(),
      label: 'Bản nháp',
      number: 2,
      sourceType: 'tex',
      raw: String.raw`\begin{ex}Đề nháp\end{ex}`,
      statementRaw: 'Đề nháp',
      solutionRaw: '',
      topicIds: [oldIds[3]],
      published: false,
    },
  ]);
  await execute('UPDATE exam_settings SET content=? WHERE id=1', [
    JSON.stringify([
      {
        position: 1,
        description: 'Mô tả riêng',
        topicIds: [oldIds[0], retiredTopicTargets[oldIds[0]], oldIds[2]],
      },
    ]),
  ]);
  return { runtime, execute };
}

test('explicit rewrite publishes 14 topics, merges memberships/config, preserves sources/settings and is idempotent', async (t) => {
  const { execute } = await fixture(t);
  const sources = (await execute('SELECT * FROM questions ORDER BY id', [])).results;
  const student = (await execute('SELECT * FROM student_settings', [])).results;
  const preview = await rewriteCurriculum(execute);
  assert.deepEqual(preview, {
    topics: 14,
    types: 112,
    examples: 28,
    updated: 10,
    created: 4,
    merged: 9,
    applied: false,
  });
  assert.equal((await execute('SELECT count(*) n FROM topics', [])).results[0].n, 19);
  await rewriteCurriculum(execute, true);
  const topics = (await execute('SELECT * FROM topics ORDER BY position', [])).results;
  assert.equal(topics.length, 14);
  assert(topics.every((t) => t.published === 1 && t.theory && t.examples));
  assert.deepEqual((await execute('SELECT * FROM questions ORDER BY id', [])).results, sources);
  assert.deepEqual((await execute('SELECT * FROM student_settings', [])).results, student);
  const links = (await execute('SELECT * FROM question_topics', [])).results;
  assert.equal(links.length, 3);
  assert(links.every((l) => !retiredTopicTargets[String(l.topic_id)]));
  for (const topic of topics) {
    const n = (
      await execute(
        'SELECT count(*) n FROM question_topics qt JOIN questions q ON q.id=qt.question_id WHERE qt.topic_id=? AND q.active=1 AND q.published=1',
        [topic.id],
      )
    ).results[0].n;
    assert.equal(topic.question_count, n);
  }
  const exam = (await execute('SELECT * FROM exam_settings WHERE id=1', [])).results[0];
  const slots = JSON.parse(String(exam.content));
  assert.equal(slots[0].description, 'Mô tả riêng');
  assert.equal(slots[0].topicIds.length, 2);
  const again = await rewriteCurriculum(execute, true);
  assert.equal(again.updated + again.created + again.merged, 0);
  assert.deepEqual((await execute('SELECT * FROM topics ORDER BY position', [])).results, topics);
  assert.deepEqual((await execute('SELECT * FROM exam_settings WHERE id=1', [])).results[0], exam);
  await execute("INSERT INTO topics(id,title) VALUES('outside','Mục mới của chủ trang')", []);
  await assert.rejects(() => rewriteCurriculum(execute, true), /ngoài kế hoạch/);
});

test('concurrent topic edits stop the guarded catalog statement before changing other topics', async (t) => {
  const { execute } = await fixture(t);
  let raced = false;
  await assert.rejects(
    () =>
      rewriteCurriculum(async (sql, params) => {
        if (!raced && sql.startsWith('INSERT INTO topics')) {
          raced = true;
          await execute(
            "UPDATE topics SET theory='Chủ trang vừa sửa',version=version+1 WHERE id=?",
            [curriculumIds[0]],
          );
        }
        return execute(sql, params);
      }, true),
    /đã thay đổi/,
  );
  assert.equal((await execute('SELECT count(*) n FROM topics', [])).results[0].n, 19);
  assert.equal(
    (await execute('SELECT theory FROM topics WHERE id=?', [curriculumIds[0]])).results[0].theory,
    'Chủ trang vừa sửa',
  );
});

test('concurrent exam edits or new memberships keep old topics, and a rerun finishes safely', async (t) => {
  const { execute } = await fixture(t);
  let raced = false;
  await assert.rejects(
    () =>
      rewriteCurriculum(async (sql, params) => {
        if (!raced && sql.startsWith('UPDATE exam_settings')) {
          raced = true;
          await execute('UPDATE exam_settings SET version=version+1 WHERE id=1', []);
        }
        return execute(sql, params);
      }, true),
    /vừa thay đổi/,
  );
  assert.equal((await execute('SELECT count(*) n FROM topics', [])).results[0].n, 23);
  const oldId = Object.keys(retiredTopicTargets)[0];
  let added = false;
  await assert.rejects(
    () =>
      rewriteCurriculum(async (sql, params) => {
        if (!added && sql.startsWith('DELETE FROM topics')) {
          added = true;
          const q = (await execute('SELECT id FROM questions WHERE published=0', [])).results[0];
          await execute('INSERT INTO question_topics(question_id,topic_id) VALUES(?,?)', [
            q.id,
            oldId,
          ]);
        }
        return execute(sql, params);
      }, true),
    /vừa thay đổi/,
  );
  assert((await execute('SELECT id FROM topics WHERE id=?', [oldId])).results.length);
  await rewriteCurriculum(execute, true);
  assert.equal((await execute('SELECT count(*) n FROM topics', [])).results[0].n, 14);
});
