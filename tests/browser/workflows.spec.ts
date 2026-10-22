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
  await page.getByRole('button', { name: 'Quản trị', exact: true }).click();
  await page.getByPlaceholder('Email quản trị').fill('browser@example.test');
  await page.locator('input[type=password]').fill('browser-test-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trang quản trị' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }).click();
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
  await page.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }).click();
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

test('student selects four AI providers with model dropdowns, session profiles and logout cleanup', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await student(page);
  await page.evaluate(() =>
    sessionStorage.setItem(
      'deltascript_student_ai',
      JSON.stringify({
        provider: 'gemini',
        profiles: {
          gemini: { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'fixture-legacy-key' },
        },
      }),
    ),
  );
  const payloads: any[] = [];
  await page.route('**/api/ai/models', (route) => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, models: ['future-student-model'] } });
  });
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Cài đặt AI', exact: true });
  await expect(settings.getByLabel('Nhà cung cấp AI')).toBeVisible();
  await expect(settings.getByLabel('Mô hình', { exact: true })).toHaveValue('gemini-2.5-flash');
  await expect(settings.getByLabel('API key', { exact: true })).toHaveValue('fixture-legacy-key');
  const latest: Record<string, string> = {
    gemini: 'gemini-4-argon',
    openai: 'gpt-6.1-sol',
    anthropic: 'claude-sonnet-5-5',
    deepseek: 'deepseek-v4-pro',
  };
  for (const provider of ['gemini', 'openai', 'anthropic', 'deepseek']) {
    await settings.getByLabel('Nhà cung cấp AI').selectOption(provider);
    await settings.getByLabel('Mô hình', { exact: true }).selectOption(latest[provider]);
    await settings.getByLabel('API key', { exact: true }).fill(`fixture-${provider}-key`);
    await settings.getByRole('button', { name: 'Kiểm tra & lấy mô hình', exact: true }).click();
    await expect(settings.getByRole('status')).toContainText('Đã kết nối');
    await settings
      .getByRole('combobox', { name: 'Mô hình', exact: true })
      .selectOption('future-student-model');
    await settings.getByRole('button', { name: 'Lưu cấu hình AI', exact: true }).click();
    await expect(settings.getByRole('status')).toContainText('Đã lưu');
  }
  expect(payloads.map((value) => value.model)).toEqual(Object.values(latest));
  expect(payloads.map((value) => value.provider)).toEqual([
    'gemini',
    'openai',
    'anthropic',
    'deepseek',
  ]);
  await settings.getByLabel('Nhà cung cấp AI').selectOption('openai');
  await expect(settings.getByLabel('API key', { exact: true })).toHaveValue('fixture-openai-key');
  await expect(settings.getByRole('combobox', { name: 'Mô hình', exact: true })).toHaveValue(
    'future-student-model',
  );
  await settings.getByRole('combobox', { name: 'Mô hình', exact: true }).selectOption('__custom__');
  await settings.getByLabel('Tên mô hình khác').fill('my-new-model');
  await page.screenshot({ path: testInfo.outputPath('student-ai-models-mobile.png') });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    expect(await settings.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await settings.getByRole('button', { name: 'Lưu cấu hình AI', exact: true }).click();
  await settings.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(settings.getByLabel('Nhà cung cấp AI')).toHaveValue('openai');
  await expect(settings.getByRole('combobox', { name: 'Mô hình', exact: true })).toHaveValue(
    'my-new-model',
  );
  await settings.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('tab', { name: 'Luyện câu hỏi', exact: true }).click();
  await page.getByRole('button', { name: 'Câu 1', exact: true }).click();
  let sent: any;
  await page.route('**/api/ai', (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, reply: 'Gợi ý của AI đã chọn.' } });
  });
  await page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Gợi ý');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect.poll(() => sent?.provider).toBe('openai');
  expect(sent.apiKey).toBe('fixture-openai-key');
  expect(sent.model).toBe('my-new-model');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'fixture-openai-key',
  );
  await page.getByRole('button', { name: 'Đóng trợ lý AI', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Vào học tập', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('deltascript_student_ai'))).toBeNull();
});
