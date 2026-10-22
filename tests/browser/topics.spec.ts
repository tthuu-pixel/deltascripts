import { test, expect, type Page } from '@playwright/test';

async function enter(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Học chuyên đề');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Chuyên đề lớp 9' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
}

test('students see only published administrator topics and can filter their shared question bank', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  await expect(page.locator('.topic-card')).toHaveCount(2);
  await expect(page.getByText('Chuyên đề nháp chưa công bố')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hình học', exact: true }).click();
  await expect(page.locator('.topic-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm chuyên đề' }).fill('DUONG TRON');
  await expect(page.locator('.topic-card h3')).toHaveText(['Đường tròn của lớp']);
  await page.getByRole('textbox', { name: 'Tìm chuyên đề' }).fill('can thuc');
  await page.locator('.topic-card').click();
  await expect(page.getByRole('heading', { name: 'Căn thức của lớp', exact: true })).toBeVisible();
  await expect(page.locator('.managed-lesson .katex').first()).toBeVisible();
  await expect(page.locator('.topic-question-list article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Lời giải chi tiết' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Xem lời giải', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lời giải chi tiết' })).toBeVisible();
  await page.getByRole('button', { name: 'Câu 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chưa có câu hỏi ở mục này' })).toBeVisible();
  await page.getByRole('button', { name: 'Câu 1', exact: true }).click();
  await expect(page.locator('.topic-question-list article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tất cả chuyên đề', exact: true }).click();
  await page.reload();
  await expect(page.locator('.topic-card')).toHaveCount(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test('large tabs support keyboard navigation; AI conversation survives closing the dialog', async ({
  page,
}) => {
  await enter(page);
  const first = page.getByRole('tab', { name: 'Chuyên đề lớp 9' });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Luyện câu hỏi' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Luyện câu hỏi' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Góc học tập' })).toBeFocused();
  await page.getByRole('button', { name: 'Mở trợ lý AI', exact: true }).click();
  await page.route('**/api/ai', (route) =>
    route.fulfill({ json: { success: true, reply: 'Bắt đầu từ giả thiết nhé.' } }),
  );
  await page
    .getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })
    .fill('Mình nên bắt đầu từ đâu?');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText('Bắt đầu từ giả thiết nhé.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mở trợ lý AI', exact: true }).click();
  await expect(page.getByText('Bắt đầu từ giả thiết nhé.', { exact: true })).toBeVisible();
});
