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
                  statementRaw: q.statement.replace(
                    'Công thức lỗi $x+1.',
                    'Công thức đã sửa $x+1$.',
                  ),
                  solutionRaw: q.solution,
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
      .prepare(
        "INSERT INTO topics(id,title,icon,color,published,description) VALUES(?,?,?,?,1,'Bài toán giải phương trình và tính toán.')",
      )
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
    raw: String.raw`\begin{bt}source-${i}\loigiai{Lời giải gốc giữ nguyên.}\end{bt}`,
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

test('upload automatically classifies every question, keeps source labels and accepts the whole import once', async ({
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
          String(q.raw).startsWith('\\begin{bt}') &&
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

test('whole-bank scan repairs every page, saves canonical sources with history and keeps publication', async ({
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
    await expect(scan.locator('.scan-counts')).toContainText('Đã phân loại 62');
    await expect(scan.locator('.scan-counts')).toContainText('Chờ xử lý lại 1');
    expect(calls).toHaveLength(9);
    expect(calls.every((batch) => batch.length > 0 && batch.length <= 10)).toBeTruthy();
    expect(new Set(calls.flat()).size).toBe(63);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(62);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          manualTopic,
        ])
      ).rows,
    ).toHaveLength(0);
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
      if (!original.statementRaw.includes('Không khớp')) {
        expect(String(row.raw)).toContain('\\begin{bt}');
        const revision = await runtime.db
          .prepare('SELECT snapshot FROM question_revisions WHERE question_id=?')
          .bind(row.id)
          .first();
        expect(JSON.parse(String(revision!.snapshot)).raw).toBe(original.raw);
      } else expect(row.raw).toBe(original.raw);
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

test('select all covers every page, loads every selected source and batches changes beyond 100 questions', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const { runtime, questions } = await prepare(page, 123);
  try {
    await page.getByRole('button', { name: 'Chọn hết', exact: true }).click();
    await expect(page.locator('.selection-bar')).toContainText('123');
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await expect(page.locator('.bank-question-card input:checked')).toHaveCount(20);
    await expect(page.locator('.selection-bar')).toContainText('123');
    await page.getByRole('button', { name: 'Chọn/bỏ chọn trang này', exact: true }).click();
    await expect(page.locator('.selection-bar')).toContainText('103');
    await page.getByRole('button', { name: 'Chọn/bỏ chọn trang này', exact: true }).click();
    await expect(page.locator('.selection-bar')).toContainText('123');
    await page
      .getByRole('button', { name: 'Chuẩn hóa & kiểm tra câu đã chọn', exact: true })
      .click();
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    await expect(review.locator('.review-navigation')).toContainText('Bài 1 / 123');
    page.once('dialog', (dialog) => dialog.accept());
    await review.getByRole('button', { name: 'Đóng bản duyệt', exact: true }).click();
    await expect(review).toHaveCount(0);
    await page.getByLabel('Trạng thái câu hỏi', { exact: true }).selectOption('published');
    await page.getByRole('button', { name: 'Áp dụng cho 123 câu', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText('Đã cập nhật');
    expect(
      (await runtime.db.prepare('SELECT count(*) AS n FROM questions WHERE published=1').first())!
        .n,
    ).toBe(123);
    await page.getByRole('button', { name: 'Chọn hết', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ chọn', exact: true }).click();
    await expect(page.locator('.selection-bar')).toHaveCount(0);
    await page.getByLabel('Lọc trạng thái', { exact: true }).selectOption('published');
    await page.getByRole('button', { name: 'Chọn hết', exact: true }).click();
    await expect(page.locator('.selection-bar')).toContainText('123');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Xóa đã chọn (123)', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText('Đã xóa');
    expect(
      (await runtime.db.prepare('SELECT count(*) AS n FROM questions WHERE active=1').first())!.n,
    ).toBe(0);
    const saved = (await runtime.db.query('SELECT id,raw,solution_raw FROM questions')).rows;
    expect(saved).toHaveLength(123);
    expect(
      saved.every((row) =>
        questions.some(
          (q) => q.id === row.id && q.raw === row.raw && q.solutionRaw === row.solution_raw,
        ),
      ),
    ).toBeTruthy();
  } finally {
    await runtime.close();
  }
});

test('one click saves the already scanned import, reuses AI results and publishes only when selected', async ({
  page,
}) => {
  const { runtime, calls, topicId } = await prepare(page, 0);
  try {
    const payloads: any[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/admin/ai/classify')
        payloads.push(request.postDataJSON());
    });
    const tex = Array.from(
      { length: 25 },
      (_, i) =>
        String.raw`\begin{bt}[Câu ${(i % 7) + 1}]Bài ${i + 1}: $\frac{2}{3}$.\loigiai{Lời giải gốc.}\end{bt}`,
    ).join('\n');
    await page
      .getByLabel('Chọn file câu hỏi')
      .setInputFiles({ name: '25-cau.tex', mimeType: 'text/plain', buffer: Buffer.from(tex) });
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    await expect(review.locator('.notice-success[role=status]')).toContainText('Đã quét hết');
    expect(calls).toHaveLength(3);
    expect((await runtime.db.prepare('SELECT count(*) AS n FROM questions').first())!.n).toBe(0);
    await review.getByLabel('Xuất bản các câu xử lý được').check();
    await review.getByRole('button', { name: 'AI xử lý và thêm tất cả', exact: true }).click();
    await expect(review.getByRole('region', { name: 'Kết quả AI tự động' })).toContainText(
      '25 / 25',
    );
    await expect(review.getByRole('button', { name: 'Hoàn tất', exact: true })).toBeEnabled();
    expect(calls).toHaveLength(3);
    expect(
      payloads.every(
        (body) =>
          body.repair === true &&
          body.questions.every((q: any) => 'solutionRaw' in q && 'raw' in q),
      ),
    ).toBeTruthy();
    const rows = (
      await runtime.db.query(
        'SELECT number,published,statement_raw,solution_raw,raw FROM questions',
      )
    ).rows;
    expect(rows).toHaveLength(25);
    expect(
      rows.every(
        (row) =>
          row.published === 1 &&
          String(row.statement_raw).includes('\\dfrac') &&
          row.solution_raw === 'Lời giải gốc.' &&
          String(row.raw).includes('\\dfrac'),
      ),
    ).toBeTruthy();
    expect(rows.filter((row) => row.number === 1)).toHaveLength(4);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(25);
    await review.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
    await expect(review).toHaveCount(0);
    await expect(page.getByText('25 câu chờ lưu', { exact: true })).toHaveCount(0);
  } finally {
    await runtime.close();
  }
});

test('automatic import fixes syntax, converts essay ex, flattens immini and recovers a missing closing tag without manual error handling', async ({
  page,
}) => {
  const { runtime, calls, topicId } = await prepare(page, 0);
  try {
    const drawing = String.raw`\begin{tikzpicture}[scale=0.6]\draw (2.5,0)--(0,1);\end{tikzpicture}`;
    const source = Array.from({ length: 17 }, (_, i) =>
      i === 16
        ? String.raw`\begin{bt}Công thức lỗi $x+1.\loigiai{Lời giải gốc.}\end{bt}`
        : i === 15
          ? String.raw`\begin{ex}\immini[thm]{Tự luận $x+1=3$.}{` +
            drawing +
            String.raw`}\loigiai{Lời giải gốc.}\end{ex}`
          : String.raw`\begin{bt}Tính $1+1$.\loigiai{Lời giải gốc.}\end{bt}`,
    ).join('\n');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'AI nhập tự động', exact: true }).click();
    await (
      await chooser
    ).setFiles([
      { name: '17-cau.tex', mimeType: 'text/plain', buffer: Buffer.from(source) },
      {
        name: 'thieu-dong.tex',
        mimeType: 'text/plain',
        buffer: Buffer.from(String.raw`\begin{bt}Thiếu lệnh đóng.`),
      },
    ]);
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    await expect(review.getByRole('region', { name: 'Kết quả AI tự động' })).toContainText(
      '18 / 18',
    );
    await expect(review.getByRole('button', { name: 'Hoàn tất', exact: true })).toBeEnabled();
    await expect(review.getByRole('region', { name: 'Kết quả kiểm tra' })).toHaveCount(0);
    const rows = (await runtime.db.query('SELECT * FROM questions')).rows;
    expect(rows).toHaveLength(18);
    expect(
      rows.every(
        (q) =>
          String(q.raw).startsWith('\\begin{bt}') && !String(q.statement_raw).includes('\\immini'),
      ),
    ).toBeTruthy();
    expect(rows.some((q) => String(q.statement_raw).includes(drawing))).toBeTruthy();
    expect(rows.some((q) => q.statement_raw === 'Công thức đã sửa $x+1$.')).toBeTruthy();
    expect((await runtime.db.prepare('SELECT count(*) n FROM question_revisions').first())!.n).toBe(
      18,
    );
    expect(calls.flat()).toHaveLength(18);
    expect(
      (await runtime.db
        .prepare('SELECT count(*) n FROM question_topics WHERE topic_id=?')
        .bind(topicId)
        .first())!.n,
    ).toBe(18);
  } finally {
    await runtime.close();
  }
});

test('API errors wait for retry instead of requiring manual edits for every question', async ({
  page,
}) => {
  const { runtime, calls } = await prepare(page, 0);
  let unavailable = true;
  try {
    await page.route('**/api/admin/ai/classify', (route) =>
      unavailable
        ? route.fulfill({
            status: 503,
            json: { success: false, error: 'Kiểm tra API key và model trước khi tiếp tục.' },
          })
        : route.fallback(),
    );
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'AI nhập tự động', exact: true }).click();
    await (
      await chooser
    ).setFiles({
      name: '3-cau.tex',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        Array.from(
          { length: 3 },
          () => String.raw`\begin{bt}Tính $1+1$.\loigiai{$2$.}\end{bt}`,
        ).join('\n'),
      ),
    });
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    const summary = review.getByRole('region', { name: 'Kết quả AI tự động' });
    await expect(summary).toContainText('Chờ xử lý lại 3');
    await expect(review.getByRole('alert')).toContainText('Kiểm tra API key và model');
    expect((await runtime.db.prepare('SELECT count(*) AS n FROM questions').first())!.n).toBe(0);
    unavailable = false;
    await review.getByRole('button', { name: 'AI xử lý và thêm tất cả', exact: true }).click();
    await expect(summary).toContainText('3 / 3');
    await expect(summary).not.toContainText('Chờ xử lý lại');
    expect((await runtime.db.prepare('SELECT count(*) AS n FROM questions').first())!.n).toBe(3);
    expect(calls.flat()).toHaveLength(3);
  } finally {
    await runtime.close();
  }
});

test('mixed imports classify and automatically save only bt; ex stays out of paid requests and saved topics', async ({
  page,
}) => {
  const { runtime, topicId, calls } = await prepare(page, 0);
  try {
    const source = String.raw`\begin{ex}Trắc nghiệm không gửi AI.\choice{A}{B}{C}{D}\loigiai{Đáp án riêng.}\end{ex}
\begin{bt}Tự luận cần phân loại $x+1=3$.\loigiai{$x=2$.}\end{bt}
\begin{ex}Trắc nghiệm khác không gửi AI.\choice{A}{B}{C}{D}\end{ex}`;
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'AI nhập tự động', exact: true }).click();
    await (
      await chooser
    ).setFiles({ name: 'hon-hop.tex', mimeType: 'text/plain', buffer: Buffer.from(source) });
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    const summary = review.getByRole('region', { name: 'Kết quả AI tự động' });
    await expect(summary).toContainText('1 / 3');
    await expect(summary).toContainText('Bỏ qua 2 câu không thuộc phạm vi tự luận');
    await expect(review.locator('.notice-success[role=status]')).toContainText('Đã xử lý hết');
    expect(calls.flat()).toHaveLength(1);
    const stored = (await runtime.db.query('SELECT id,raw FROM questions')).rows;
    expect(stored).toHaveLength(1);
    expect(String(stored[0].raw)).toContain(String.raw`\begin{bt}`);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(1);
    // Existing ex sources are preserved and skipped by a whole-bank scan too.
    const ex = {
      id: crypto.randomUUID(),
      number: 1,
      sourceType: 'tex',
      label: 'Bài trắc nghiệm cũ',
      statementRaw: String.raw`Trắc nghiệm cũ.\choice{A}{B}{C}{D}`,
      raw: String.raw`\begin{ex}Trắc nghiệm cũ.\choice{A}{B}{C}{D}\end{ex}`,
    };
    await upsertQuestions(runtime.db, [ex]);
    await review.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
    await expect(page.getByText('2 câu chờ lưu', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'AI quét và sắp xếp toàn bộ kho', exact: true }).click();
    const bank = page.getByRole('dialog', { name: 'AI quét toàn bộ kho', exact: true });
    await expect(bank.getByRole('status')).toContainText('Đã quét hết kho');
    await expect(bank.locator('.scan-counts')).toContainText('Ngoài phạm vi tự luận 1');
    expect(calls.flat()).toHaveLength(2);
    expect(
      (await runtime.db.query('SELECT * FROM question_topics WHERE question_id=?', [ex.id])).rows,
    ).toHaveLength(0);
    expect(
      (await runtime.db.query('SELECT raw FROM questions WHERE id=?', [ex.id])).rows[0].raw,
    ).toBe(ex.raw);
  } finally {
    await runtime.close();
  }
});
