import { test, expect } from '@playwright/test';
import { createRuntime } from '../runtime.ts';
import { createTeacher } from '../../server/auth.ts';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
test('admin configures AI, reviews normalization and source, corrects syntax, accepts topic suggestions and saves drafts', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(10_000);
  const topicId = crypto.randomUUID();
  const runtime = await createRuntime({
    origin: 'http://127.0.0.1:3100',
    aiSettingsKey: 'browser-encryption-fixture-at-least-32-characters',
    fetchGemini: async (url, init) => {
      if (String(url).endsWith('/models'))
        return Response.json({ data: [{ id: 'future-chat-model' }] });
      const payload = JSON.parse(String(init?.body));
      const input = JSON.parse(payload.messages.at(-1).content);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: input.questions.map((q: any) => ({
                  id: q.id,
                  statementRaw: q.statement,
                  solutionRaw: q.solution,
                  topicIds: [topicId],
                  reason: 'Cùng nội dung căn thức trong chuyên đề đã tạo.',
                })),
              }),
            },
          },
        ],
      });
    },
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await createTeacher(runtime.db, 'review@example.test', 'review-browser-test-password');
    await runtime.db
      .prepare(
        "INSERT INTO topics(id,title,category,icon,color,published,description) VALUES(?,?,?,?,?,0,'Các bài tính toán căn thức và phân số.')",
      )
      .bind(topicId, 'Căn thức do thầy tạo', 'Đại số', 'radical', 'blue')
      .run();
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.route('https://tikz-fly.fly.dev/compile', (route) =>
      route.fulfill({ json: { base64: png } }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('review@example.test');
    await page.locator('input[type=password]').fill('review-browser-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('button', { name: 'Cấu hình AI', exact: true }).click();
    await expect(page.getByLabel('Mô hình', { exact: true })).toHaveValue('gemini-3.8-flash');
    await page.getByLabel('Mô hình', { exact: true }).selectOption('gemini-4-argon');
    await page.getByLabel('Nhà cung cấp AI', { exact: true }).selectOption('deepseek');
    await page.getByLabel('Mô hình', { exact: true }).selectOption('deepseek-v4-pro');
    await expect(page.getByLabel('Base URL', { exact: true })).toHaveValue(
      'https://api.deepseek.com',
    );
    await page.getByLabel('API key', { exact: true }).fill('browser-provider-fixture-not-real-key');
    await page.getByRole('button', { name: 'Kiểm tra & lấy model', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đã kết nối và lấy 1 model');
    await page.getByLabel('Mô hình', { exact: true }).selectOption('future-chat-model');
    await page.getByRole('button', { name: 'Lưu cấu hình AI', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình AI');
    await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
    await page.screenshot({ path: testInfo.outputPath('ai-settings-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
    const tex = String.raw`\begin{bt}[1,0 điểm]%[9H4V1-4]
\immini{Tính $\frac{1}{2}$.}{\begin{tikzpicture}\draw (2.5,0)--(0,1);\end{tikzpicture}}
\loigiai{Đáp án $\frac{1}{2}$.}\end{bt}
\begin{bt}[Câu 2]Đề bị thiếu dấu đóng $x+1.
\loigiai{Đáp án $2$.}\end{bt}`;
    await page
      .getByLabel('Chọn file câu hỏi')
      .setInputFiles({ name: 'kiem-tra.tex', mimeType: 'text/plain', buffer: Buffer.from(tex) });
    const review = page.getByRole('dialog', { name: 'Chuẩn hóa & kiểm tra', exact: true });
    await expect(review).toBeVisible();
    await expect(review).toContainText('Điểm số trong nguồn: 1,0 điểm');
    await expect(review).toContainText('Mã trong nguồn: 9H4V1-4');
    await expect(review.locator('.editor-preview .katex').first()).toBeVisible();
    await review.getByAltText('Hình minh họa TikZ').scrollIntoViewIfNeeded();
    await expect(review.getByAltText('Hình minh họa TikZ')).toBeVisible();
    await review.getByText('Nguồn gốc để đối chiếu', { exact: true }).click();
    await expect(review.getByLabel('Nguồn gốc', { exact: true })).toHaveValue(
      /\[1,0 điểm\]%\[9H4V1-4\]/,
    );
    await expect(review.locator('.ai-reason')).toContainText('Cùng nội dung căn thức');
    await expect(
      review.getByRole('checkbox', { name: 'Căn thức do thầy tạo · nháp', exact: true }),
    ).toBeChecked();
    expect((await runtime.db.prepare('SELECT count(*) AS n FROM questions').first())!.n).toBe(0);
    await review.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }).click();
    await expect(review.getByRole('alert')).toContainText('Cần sửa lỗi cú pháp');
    await expect(review.getByLabel('Đề bài đang dùng', { exact: true })).toHaveValue(
      /thiếu dấu đóng/,
    );
    await review.getByLabel('Đề bài đang dùng', { exact: true }).fill('Đề đã sửa $x+1=3$.');
    await review
      .getByRole('checkbox', { name: 'Căn thức do thầy tạo · nháp', exact: true })
      .check();
    await review.getByRole('button', { name: 'Xem trước bản đang dùng', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('review-mobile.png'), fullPage: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      const box = await review.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: testInfo.outputPath('review-desktop.png'), fullPage: true });
    await review.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }).click();
    await expect(review).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu lên hệ thống', exact: true }).click();
    await expect(page.locator('.bank-question-card')).toHaveCount(2);
    const saved = (
      await runtime.db.query(
        'SELECT statement_raw,solution_raw,raw,number,published FROM questions ORDER BY number',
      )
    ).rows;
    expect(saved).toHaveLength(2);
    expect(saved.every((q) => q.published === 0)).toBeTruthy();
    expect(saved.map((q) => q.number).sort()).toEqual([1, 2]);
    expect(
      saved.some(
        (q) =>
          String(q.raw).startsWith('\\begin{bt}') &&
          String(q.statement_raw).includes(String.raw`\dfrac{1}{2}`),
      ),
    ).toBeTruthy();
    expect(
      saved.some(
        (q) => String(q.raw).includes('Đề đã sửa') && String(q.statement_raw).includes('Đề đã sửa'),
      ),
    ).toBeTruthy();
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(2);
    await page.locator('.bank-question-card').first().getByRole('checkbox').check();
    await page.getByRole('button', { name: 'AI phân loại câu đã chọn', exact: true }).click();
    const classification = page.getByRole('dialog', { name: 'Duyệt phân loại AI', exact: true });
    await expect(classification.locator('.ai-reason')).toBeVisible();
    await classification
      .getByRole('checkbox', { name: 'Căn thức do thầy tạo · nháp', exact: true })
      .uncheck();
    await classification
      .getByRole('button', { name: 'Áp dụng các bài đã duyệt', exact: true })
      .click();
    await expect(classification).toHaveCount(0);
    expect(
      (
        await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [
          topicId,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (await runtime.db.query('SELECT raw FROM questions')).rows.every((q) =>
        String(q.raw).includes('\\begin{bt}'),
      ),
    ).toBeTruthy();
    expect(errors).toEqual([]);
  } finally {
    await runtime.close();
  }
});
