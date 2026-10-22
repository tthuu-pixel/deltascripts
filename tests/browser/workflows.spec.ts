import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
test.beforeEach(async ({ page }) => {
  await page.route('https://tikz-fly.fly.dev/compile', (route) =>
    route.fulfill({ json: { base64: png } }),
  );
});
async function student(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Học sinh thử');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A1');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập' }).click();
  await expect(page.getByRole('heading', { name: /^Không gian học tập/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Luyện câu hỏi', exact: true }).click();
}
async function teacher(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Giáo viên', exact: true }).click();
  await page.getByPlaceholder('Email giáo viên').fill('browser@example.test');
  await page.locator('input[type=password]').fill('browser-test-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Khu vực Giáo viên' })).toBeVisible();
}
test('login validation, role forgery rejected, student rendering sanitized and lazy solution', async ({
  page,
}) => {
  const exceptions: string[] = [];
  page.on('pageerror', (error) => exceptions.push(error.message));
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('deltascript_user', JSON.stringify({ role: 'teacher' })),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Vào học tập' })).toBeVisible();
  await page.getByRole('button', { name: 'Vào học tập' }).click();
  await expect(page.getByText('Vui lòng nhập đầy đủ thông tin.')).toBeVisible();
  await student(page);
  await page.getByRole('button', { name: 'Câu 1', exact: true }).click();
  await expect(page.locator('.math-content .katex').first()).toBeVisible();
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  await expect(page.locator('.math-content [onerror]')).toHaveCount(0);
  await expect(page.locator('.math-content a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Lời giải chi tiết' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Xem lời giải', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lời giải chi tiết' })).toBeVisible();
  expect(exceptions).toEqual([]);
});
test('exam and clock survive reload; mobile AI preserves conversation and correct context', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await student(page);
  await page.getByRole('tab', { name: 'Tạo đề thi', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo đề tham khảo', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click();
  await expect(page.locator('article')).toHaveCount(7);
  const before = await page.getByRole('timer').textContent();
  await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((key) => key.startsWith('deltascript_exam:'))!;
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    saved.endAt = Date.now() + 60_000;
    sessionStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Tạo đề thi' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Tạo đề thi', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(7);
  await expect(page.getByRole('timer')).toHaveText(/^(01:00|00:5\d)$/);
  expect(before).toMatch(/^120:00|119:/);
  const payloads: any[] = [];
  await page.route('**/api/ai', (route) => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, reply: 'Thử tính $1+1$ từng bước.' } });
  });
  await page.getByRole('button', { name: 'Hỏi AI về câu này' }).first().click();
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Gợi ý giúp mình');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText('Thử tính', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Bước tiếp theo');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads[0].context).toContain('Tính');
  expect(payloads[1].history.some((m: any) => m.content === 'Gợi ý giúp mình')).toBeTruthy();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
test('TikZ errors do not block the question; retry and similar exercise preserve the selected type', async ({
  page,
}) => {
  let attempts = 0;
  await page.route('https://tikz-fly.fly.dev/compile', (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 503, body: 'unavailable' })
      : route.fulfill({ json: { base64: png } });
  });
  await student(page);
  await page.getByRole('button', { name: 'Câu 2', exact: true }).click();
  await expect(page.locator('article .katex').first()).toBeVisible();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByAltText('Hình minh họa TikZ')).toBeVisible();
  let original: any;
  await page.route('**/api/ai/similar', (route) => {
    original = route.request().postDataJSON();
    return route.fulfill({
      json: {
        success: true,
        question: {
          id: 'similar-test',
          label: 'Câu 2 (tương tự)',
          number: 2,
          sourceType: 'tex',
          statementRaw: 'Bài tương tự $x+2$.',
          solutionRaw: 'Answer',
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Bài tập tương tự', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Câu 2 (tương tự)', exact: true })).toBeVisible();
  expect(original.number).toBe(2);
  expect(original.context).toContain('Tính $2+1$');
});
test('drawing declarations survive the database and browser cache avoids recompilation after reload', async ({
  page,
}) => {
  const documents: string[] = [];
  await page.route('https://tikz-fly.fly.dev/compile', (route) => {
    documents.push(route.request().postDataJSON().source);
    return route.fulfill({ json: { image_base64: png } });
  });
  await student(page);
  await page.getByRole('button', { name: 'Câu 3', exact: true }).click();
  await expect(page.getByAltText('Hình minh họa TikZ')).toBeVisible();
  expect(documents).toHaveLength(1);
  expect(documents[0]).toContain(String.raw`\def\R{3}`);
  expect(documents[0]).toContain(String.raw`\tikzset{netchinh`);
  expect(documents[0]).toContain(String.raw`\begin {tikzpicture}`);
  expect(documents[0]).not.toContain('tkz-euclide');
  await page.reload();
  await page.getByRole('tab', { name: 'Luyện câu hỏi', exact: true }).click();
  await page.getByRole('button', { name: 'Câu 3', exact: true }).click();
  await expect(page.getByAltText('Hình minh họa TikZ')).toBeVisible();
  expect(documents).toHaveLength(1);
});
test('teacher imports Word/TeX in worker, confirms persistence, deletes questions, creates/revokes code', async ({
  page,
}) => {
  await teacher(page);
  await expect(page.getByLabel('Chọn file câu hỏi')).toBeEnabled();
  const tex = String.raw`\begin{ex}[Câu 2]E2E unique import $x<5$.\loigiai{Answer $4$.}\end{ex}`;
  await page
    .getByLabel('Chọn file câu hỏi')
    .setInputFiles({ name: 'sample.TEX', mimeType: 'text/plain', buffer: Buffer.from(tex) });
  await expect(page.getByText('1 câu chờ lưu')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu lên hệ thống' }).click();
  await expect(page.getByText('E2E unique import', { exact: false })).toBeVisible();
  const imported = page.locator('article').filter({ hasText: 'E2E unique import' });
  await imported.getByRole('button', { name: 'Xem đề bài' }).click();
  await expect(page.getByRole('dialog').locator('.katex')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await imported.getByRole('checkbox').check();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Xóa đã chọn/ }).click();
  await expect(page.locator('article').filter({ hasText: 'E2E unique import' })).toHaveCount(0);
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Câu 3. DOCX worker import</w:t></w:r></w:p><w:p><w:r><w:t>Lời giải: A solution.</w:t></w:r></w:p></w:body></w:document>',
  );
  await page.getByLabel('Chọn file câu hỏi').setInputFiles({
    name: 'sample.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  });
  await expect(page.getByText('1 câu chờ lưu')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu lên hệ thống' }).click();
  await expect(page.getByText('DOCX worker import', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Quản lý mã ôn tập', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mã truy cập mới' }).fill('BROWSER1');
  await page.getByRole('button', { name: 'Tạo mã mới' }).click();
  const row = page.getByRole('row').filter({ hasText: 'BROWSER1' });
  await expect(row).toContainText('Đang hoạt động');
  await row.getByRole('checkbox').check();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Ngừng mã đã chọn' }).click();
  await expect(row).toContainText('Ngừng hoạt động');
});
