import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../runtime.ts';
import { createTeacher } from '../../server/auth.ts';
import { upsertQuestions } from '../../server/app.ts';
import { adminAiRoute } from '../../server/admin-ai.ts';

const secret = 'auto-scan-encryption-fixture-at-least-32-characters';
async function prepare(page: Page, count: number) {
  const topicId = crypto.randomUUID(),
    manualTopic = crypto.randomUUID();
  const calls: string[][] = [];
  const runtime = await createRuntime({
    origin: 'http://127.0.0.1:3100',
    aiSettingsKey: secret,
    fetchGemini: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const input = JSON.parse(body.messages.at(-1).content);
      calls.push(input.questions.map((q: any) => q.id));
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: input.questions.map((q: any) => ({
                  id: q.id,
                  number: 7,
                  topicIds: q.statement.includes('Không khớp') ? [] : [topicId],
                  reason: q.statement.includes('Không khớp')
                    ? 'Chưa có chuyên đề phù hợp.'
                    : 'Phù hợp chuyên đề đang có.',
                })),
              }),
            },
          },
        ],
      });
    },
  });
  await createTeacher(runtime.db, 'auto@example.test', 'auto-scan-test-password');
  for (const [id, title] of [
    [topicId, 'Chuyên đề AI nhận dạng'],
    [manualTopic, 'Chuyên đề đã gán thủ công'],
  ])
    await runtime.db
      .prepare('INSERT INTO topics(id,title,icon,color,published) VALUES(?,?,?,?,1)')
      .bind(id, title, 'equation', 'blue')
      .run();
  await adminAiRoute(
    runtime.db,
    '/api/admin/ai/settings',
    'POST',
    {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey: 'auto-provider-fixture-not-real-key',
      version: 0,
    },
    { aiSettingsKey: secret },
  );
  const questions = Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Nguồn ${i + 1}`,
    number: (i % 7) + 1,
    sourceType: 'tex',
    statementRaw:
      i === 61
        ? 'x'.repeat(20_001)
        : i === 62
          ? 'Không khớp chuyên đề nào.'
          : `Bài thứ ${i + 1}: $x+1=3$.`,
    solutionRaw: 'Lời giải gốc giữ nguyên.',
    raw: `source-${i}`,
    published: i % 2 === 0,
    topicIds: i === 0 ? [manualTopic] : [],
  }));
  if (questions.length) await upsertQuestions(runtime.db, questions);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
    await route.fulfill({ response });
  });
  page.setDefaultTimeout(10_000);
  await page.goto('/admin');
  await page.getByPlaceholder('Email quản trị').fill('auto@example.test');
  await page.locator('input[type=password]').fill('auto-scan-test-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trang quản trị', exact: true })).toBeVisible();
  return { runtime, topicId, manualTopic, calls, questions };
}

test('upload automatically classifies every question, keeps explicit types and accepts the whole import once', async ({
  page,
}) => {
  const { runtime, topicId, calls } = await prepare(page, 0);
  try {
    const tex = Array.from(
      { length: 25 },
      (_, i) =>
        String.raw`\begin{bt}[Câu ${(i % 7) + 1}]Bài thứ ${i + 1}: $x+1=3$.\loigiai{Đáp án $2$.}\end{bt}`,
    ).join('\n');
    await page
      .getByLabel('Chọn file câu hỏi')
      .setInputFiles({ name: '25-cau.tex', mimeType: 'text/plain', buffer: Buffer.from(tex) });
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    await expect(review.getByRole('status')).toContainText('Đã quét hết các câu');
    await expect(review.getByRole('region', { name: 'Tổng hợp phân loại' })).toContainText(
      '25 / 25',
    );
    expect(calls.map((batch) => batch.length)).toEqual([10, 10, 5]);
    expect(new Set(calls.flat()).size).toBe(25);
    expect((await runtime.db.prepare('SELECT count(*) AS n FROM questions').first())!.n).toBe(0);
    await review.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu lên hệ thống', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText('Đã lưu nháp câu hỏi');
    const saved = (
      await runtime.db.query('SELECT number,published,raw,solution_raw FROM questions')
    ).rows;
    expect(saved).toHaveLength(25);
    expect(saved.filter((q) => q.number === 1)).toHaveLength(4);
    expect(saved.filter((q) => q.number === 7)).toHaveLength(3);
    expect(
      saved.every(
        (q) =>
          q.published === 0 &&
          String(q.raw).includes('[Câu') &&
          String(q.solution_raw).includes('Đáp án'),
      ),
    ).toBeTruthy();
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(25);
    expect(calls).toHaveLength(3);
  } finally {
    await runtime.close();
  }
});

test('whole-bank scan crosses all pages regardless of active filters and saves topic links without changing sources or publication', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const { runtime, topicId, manualTopic, calls, questions } = await prepare(page, 63);
  try {
    await page.getByPlaceholder('Tìm trong đề bài hoặc nhãn câu…').fill('Không có kết quả này');
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await expect(page.locator('.bank-question-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'AI quét và sắp xếp toàn bộ kho', exact: true }).click();
    const scan = page.getByRole('dialog', { name: 'AI quét toàn bộ kho', exact: true });
    await expect(scan.getByRole('status')).toContainText('Đã quét hết kho', { timeout: 60_000 });
    await expect(scan.locator('.scan-counts')).toContainText('63 / 63');
    await expect(scan.locator('.scan-counts')).toContainText('Đã phân loại 61');
    await expect(scan.locator('.scan-counts')).toContainText('Cần kiểm tra 2');
    expect(calls).toHaveLength(7);
    expect(calls.every((batch) => batch.length > 0 && batch.length <= 10)).toBeTruthy();
    expect(new Set(calls.flat()).size).toBe(62);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(61);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          manualTopic,
        ])
      ).rows,
    ).toHaveLength(1);
    const rows = (
      await runtime.db.query(
        'SELECT id,number,statement_raw,solution_raw,raw,published FROM questions',
      )
    ).rows;
    for (const row of rows) {
      const original = questions.find((q) => q.id === row.id)!;
      expect(row.number).toBe(original.number);
      expect(row.statement_raw).toBe(original.statementRaw);
      expect(row.solution_raw).toBe(original.solutionRaw);
      expect(row.raw).toBe(original.raw);
      expect(row.published).toBe(original.published ? 1 : 0);
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      const box = await scan.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: testInfo.outputPath('bank-scan-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('bank-scan-mobile.png'), fullPage: true });
    const downloading = page.waitForEvent('download');
    await scan.getByRole('button', { name: 'Tải báo cáo', exact: true }).click();
    const download = await downloading;
    const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(report.outcomes).toHaveLength(63);
    await scan.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(scan).toHaveCount(0);
  } finally {
    await runtime.close();
  }
});
