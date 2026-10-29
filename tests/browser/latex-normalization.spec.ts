import { test, expect } from '@playwright/test';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { adminAiRoute } from '../../server/admin-ai';
import { upsertQuestions } from '../../server/question-storage';
import { parseTexText } from '../../shared/texParser';
import { automaticImportsRoute, automaticImportJobs } from '../../server/automatic-imports';
import { normalizationJobs } from '../../server/latex-normalizations';
const secret = 'browser-latex-normalization-test-secret-32-characters';
test('admin clears import history, selects all questions in a topic and normalizes them in the background', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const runtime = await createRuntime({
    origin: 'http://127.0.0.1:3100',
    aiSettingsKey: secret,
    fetchGemini: async (_url, init) => {
      const data = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: data.questions.map((q: any) => ({
                  id: q.id,
                  statementRaw: q.statement,
                  solutionRaw: q.solution,
                })),
              }),
            },
          },
        ],
      });
    },
  });
  try {
    await createTeacher(runtime.db, 'normalize@example.test', 'normalization-browser-password');
    const topic = crypto.randomUUID(),
      outsideTopic = crypto.randomUUID();
    for (const [id, title] of [
      [topic, 'Phân số cần chuẩn hóa'],
      [outsideTopic, 'Chuyên đề khác'],
    ])
      await runtime.db
        .prepare('INSERT INTO topics(id,title,description,published) VALUES(?,?,?,1)')
        .bind(id, title, 'Biểu thức phân số.')
        .run();
    const qs = Array.from({ length: 29 }, (_, i) => ({
      ...parseTexText(
        `\\begin{ex}Tính $\\frac{${i + 1}}{2}$.\\loigiai{Giữ nguyên $${i + 11}$.}\\end{ex}`,
      )[0],
      topicIds: [i < 27 ? topic : outsideTopic],
      published: i % 2 === 0,
    }));
    await upsertQuestions(runtime.db, qs);
    const original = (await runtime.db.query('SELECT * FROM questions ORDER BY id')).rows;
    await adminAiRoute(
      runtime.db,
      '/api/admin/ai/settings',
      'POST',
      {
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'fixture',
        apiKey: 'fixture',
        version: 0,
      },
      { aiSettingsKey: secret },
    );
    const oldId = crypto.randomUUID(),
      pending = parseTexText(String.raw`\begin{bt}Nguồn nhập chưa xong $9$.\end{bt}`)[0];
    await automaticImportsRoute(runtime.db, '/api/admin/imports/start', 'POST', {
      id: oldId,
      files: ['lich-su-nhap.tex'],
      expected: 1,
    });
    await automaticImportsRoute(runtime.db, '/api/admin/imports/items', 'POST', {
      id: oldId,
      items: [pending],
    });
    await automaticImportsRoute(runtime.db, '/api/admin/imports/finish', 'POST', { id: oldId });
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('normalize@example.test');
    await page.locator('input[type=password]').fill('normalization-browser-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const uploads = page.getByRole('region', { name: 'Tải file để AI tự xuất bản' });
    await expect(uploads).toContainText('lich-su-nhap.tex');
    page.once('dialog', (dialog) => dialog.accept());
    await uploads.getByRole('button', { name: 'Xóa danh sách nhập', exact: true }).click();
    await expect(uploads).not.toContainText('lich-su-nhap.tex');
    expect((await automaticImportJobs(runtime.db)).length).toBe(0);
    expect((await runtime.db.query('SELECT id FROM questions')).rows).toHaveLength(29);
    await page.getByLabel('Lọc chuyên đề', { exact: true }).selectOption(topic);
    await expect(page.locator('.bank-question-card')).toHaveCount(20);
    await page.getByRole('button', { name: 'Chọn hết', exact: true }).click();
    await expect(page.locator('.selection-bar')).toContainText('27');
    const normalization = page.getByRole('region', { name: 'AI chuẩn hóa LaTeX', exact: true });
    await normalization
      .getByRole('button', { name: 'AI chuẩn hóa LaTeX (27 câu)', exact: true })
      .click();
    await expect(normalization).toContainText('Đã nhận lựa chọn');
    await expect(page.locator('.selection-bar')).toHaveCount(0);
    expect((await normalizationJobs(runtime.db))[0].expected).toBe(27);
    expect((await runtime.db.query('SELECT id FROM question_revisions')).rows).toHaveLength(0);
    await page.getByRole('button', { name: 'Chuyên đề', exact: true }).click();
    const worker = await runtime.mf.getWorker();
    for (let tick = 0; tick < 14; tick++) await worker.scheduled({ cron: '* * * * *' });
    expect((await normalizationJobs(runtime.db))[0].completed).toBe(27);
    await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
    await expect(normalization).toContainText('27 / 27');
    await expect(normalization).toContainText('Đã hoàn tất');
    const saved = (await runtime.db.query('SELECT * FROM questions ORDER BY id')).rows;
    for (const row of saved) {
      const before = original.find((q) => q.id === row.id)!;
      expect(row.published).toBe(before.published);
      if (qs.slice(27).some((q) => q.id === row.id)) expect(row).toEqual(before);
      else expect(String(row.statement_raw)).toContain('\\dfrac');
    }
    expect((await runtime.db.query('SELECT id FROM question_revisions')).rows).toHaveLength(27);
    expect(
      (await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [topic]))
        .rows,
    ).toHaveLength(27);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('normalization-topic-mobile.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.reload();
    await expect(normalization).toContainText('27 / 27');
    expect((await automaticImportJobs(runtime.db)).length).toBe(0);
  } finally {
    await page.goto('about:blank');
    await runtime.close();
  }
});
