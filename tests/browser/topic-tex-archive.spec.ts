import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { upsertQuestions } from '../../server/question-storage';
import { parseTexText } from '../../shared/texParser';
import { parseTopicTexArchive } from '../../shared/topicTexArchive';

test('download a complete topic and reimport edited TeX without AI or duplicates', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  // No AI provider is configured: restoring an exported file must not require one.
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  try {
    await createTeacher(runtime.db, 'archive@example.test', 'archive-browser-password');
    const topic = crypto.randomUUID(),
      outside = crypto.randomUUID();
    for (const [id, title] of [
      [topic, 'Biểu thức phân số'],
      [outside, 'Chuyên đề khác'],
    ])
      await runtime.db
        .prepare('INSERT INTO topics(id,title,published) VALUES(?,?,1)')
        .bind(id, title)
        .run();
    const questions = Array.from({ length: 29 }, (_, i) => ({
      ...parseTexText(
        `\\begin{bt}Tính $\\frac{${i + 1}}{2}$.\\loigiai{Kết quả $${i + 11}$.}\\end{bt}`,
      )[0],
      topicIds: i === 0 ? [topic, outside] : [i < 27 ? topic : outside],
      published: i % 2 === 0,
      latexPreamble: i === 0 ? String.raw`\def\R{2.5}` : '',
    }));
    await upsertQuestions(runtime.db, questions);
    const original = (await runtime.db.query('SELECT * FROM questions ORDER BY id')).rows;
    const links = (
      await runtime.db.query('SELECT * FROM question_topics ORDER BY question_id,topic_id')
    ).rows;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('archive@example.test');
    await page.locator('input[type=password]').fill('archive-browser-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('button', { name: 'Chuyên đề', exact: true }).click();
    const downloadName = 'Tải tất cả câu hỏi của Biểu thức phân số (.tex)';
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: downloadName, exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('bieu-thuc-phan-so.deltascript.tex');
    const source = await readFile((await download.path())!, 'utf8');
    const parsed = parseTopicTexArchive(source);
    expect(parsed).toHaveLength(27);
    expect(parsed.map((q) => q.topicRestore!.questionId).sort()).toEqual(
      questions
        .slice(0, 27)
        .map((q) => q.id)
        .sort(),
    );
    for (const q of parsed) {
      const before = questions.find((v) => v.id === q.topicRestore!.questionId)!;
      expect(q.statementRaw).toBe(before.statementRaw);
      expect(q.solutionRaw).toBe(before.solutionRaw);
      expect(q.latexPreamble).toBe(before.latexPreamble);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('topic-download-mobile.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
    await page.getByLabel('Lọc chuyên đề', { exact: true }).selectOption(topic);
    await page.getByLabel('Lọc trạng thái', { exact: true }).selectOption('published');
    const bankDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: downloadName, exact: true }).click();
    expect(
      parseTopicTexArchive(await readFile((await (await bankDownload).path())!, 'utf8')),
    ).toHaveLength(27);
    const uploads = page.getByRole('region', { name: 'Tải file để AI tự xuất bản' });
    const edited = {
      name: download.suggestedFilename(),
      mimeType: 'text/x-tex',
      buffer: Buffer.from(source.replace(/\\frac/g, '\\dfrac')),
    };
    await uploads.locator('input[type=file]').setInputFiles(edited);
    await expect(uploads).toContainText('Đã nhập lại 27 câu gốc');
    const saved = (await runtime.db.query('SELECT * FROM questions ORDER BY id')).rows;
    expect(saved).toHaveLength(29);
    for (const row of saved) {
      const before = original.find((q) => q.id === row.id)!;
      expect(row.published).toBe(before.published);
      expect(row.label).toBe(before.label);
      if (questions.slice(27).some((q) => q.id === row.id)) expect(row).toEqual(before);
      else expect(row.statement_raw).toContain('\\dfrac');
    }
    expect(
      (await runtime.db.query('SELECT * FROM question_topics ORDER BY question_id,topic_id')).rows,
    ).toEqual(links);
    expect((await runtime.db.query('SELECT id FROM question_revisions')).rows).toHaveLength(27);
    await expect(
      uploads.getByRole('button', { name: 'Nhập file TeX (.tex)', exact: true }),
    ).toBeEnabled();
    await uploads.locator('input[type=file]').setInputFiles(edited);
    await expect(uploads).toContainText('Đã nhập lại 27 câu gốc');
    await expect(
      uploads.getByRole('button', { name: 'Nhập file TeX (.tex)', exact: true }),
    ).toBeEnabled();
    expect((await runtime.db.query('SELECT id FROM question_revisions')).rows).toHaveLength(27);
    expect((await runtime.db.query('SELECT id FROM questions')).rows).toHaveLength(29);
    expect((await runtime.db.query('SELECT id FROM automatic_import_jobs')).rows).toHaveLength(0);
  } finally {
    await page.goto('about:blank');
    await runtime.close();
  }
});
