import { test, expect, type Page } from '@playwright/test';

async function enter(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Học chuyên đề');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Chuyên đề' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
}

test('students open published topic exercises directly and toggle each answer', async ({
  page,
}, testInfo) => {
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
  await expect(page.getByRole('tab', { name: 'Lý thuyết', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Ví dụ', exact: true }).click();
  await expect(page.locator('.managed-examples')).toContainText('Ví dụ riêng của lớp');
  await expect(page.locator('.managed-examples .katex').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Bài tập vận dụng', exact: true }).click();
  const exercise = page.locator('.topic-exercise');
  await expect(exercise).toHaveCount(1);
  await expect(exercise).toContainText('Tính');
  await expect(exercise.locator('.exercise-body .katex').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Câu [1-7]$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lấy câu hỏi khác', exact: true })).toHaveCount(0);
  await expect(exercise.getByRole('button')).toHaveCount(1);
  await expect(exercise.locator('.solution-panel')).toHaveCount(0);
  await exercise.getByRole('button', { name: 'Đáp án', exact: true }).click();
  await expect(exercise.locator('.solution-panel')).toContainText('Lời giải');
  await expect(exercise.locator('.solution-panel .katex')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('topic-practice-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: testInfo.outputPath('topic-practice-desktop.png'),
    fullPage: true,
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
  await page.getByRole('tab', { name: 'Lý thuyết', exact: true }).click();
  await page.getByRole('tab', { name: 'Bài tập vận dụng', exact: true }).click();
  await expect(exercise.locator('.solution-panel')).toBeVisible();
  await exercise.getByRole('button', { name: 'Ẩn đáp án', exact: true }).click();
  await expect(exercise.locator('.solution-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tất cả chuyên đề', exact: true }).click();
  await page.reload();
  await expect(page.locator('.topic-card')).toHaveCount(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test('topic exercise pages handle retry, separate answers and an empty topic', async ({ page }) => {
  const questions = Array.from({ length: 12 }, (_, index) => ({
    id: crypto.randomUUID(),
    number: (index % 7) + 1,
    label: `Nhãn nguồn ${index + 1}`,
    sourceType: 'tex',
    statementRaw: `Đề bài riêng ${index + 1}: $x+1=3$.`,
    solutionRaw: index === 1 ? '' : `Lời giải riêng ${index + 1}: $x=2$.`,
  }));
  let fail = true;
  let topicId = '';
  await page.route('**/api/topic-questions?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.has('number')).toBe(false);
    topicId ||= params.get('topicId')!;
    if (fail) {
      fail = false;
      return route.fulfill({
        status: 503,
        json: { success: false, error: 'Tạm thời chưa tải được bài tập.' },
      });
    }
    const currentPage = Number(params.get('page'));
    const items = params.get('topicId') === topicId ? questions : [];
    return route.fulfill({
      json: {
        success: true,
        items: items.slice((currentPage - 1) * 10, currentPage * 10),
        total: items.length,
        page: currentPage,
        pageSize: 10,
      },
    });
  });
  await enter(page);
  await page.locator('.topic-card').first().click();
  await page.getByRole('tab', { name: 'Bài tập vận dụng', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tạm thời chưa tải được bài tập.');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  const exercises = page.locator('.topic-exercise');
  await expect(exercises).toHaveCount(10);
  await expect(exercises.first()).toContainText('Đề bài riêng 1:');
  await expect(exercises.last()).toContainText('Đề bài riêng 10:');
  await expect(page.locator('.solution-panel')).toHaveCount(0);
  await exercises.nth(0).getByRole('button', { name: 'Đáp án', exact: true }).click();
  await expect(exercises.nth(0).locator('.solution-panel')).toContainText('Lời giải riêng 1:');
  await expect(exercises.nth(1).locator('.solution-panel')).toHaveCount(0);
  await exercises.nth(1).getByRole('button', { name: 'Đáp án', exact: true }).click();
  await expect(exercises.nth(1).locator('.solution-panel')).toContainText('Chưa có đáp án.');
  await exercises.nth(0).getByRole('button', { name: 'Ẩn đáp án', exact: true }).click();
  await expect(exercises.nth(1).locator('.solution-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(exercises).toHaveCount(2);
  await expect(exercises.first()).toContainText('Đề bài riêng 11:');
  await expect(exercises.first().getByRole('heading')).toHaveText('Bài 11');
  await expect(page.getByRole('button', { name: 'Trang sau', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
  await expect(exercises).toHaveCount(10);
  await expect(page.locator('.solution-panel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Trang trước', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tất cả chuyên đề', exact: true }).click();
  await page.locator('.topic-card').nth(1).click();
  await page.getByRole('tab', { name: 'Bài tập vận dụng', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Chưa có bài tập vận dụng', exact: true }),
  ).toBeVisible();
  await expect(exercises).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Phân trang bài tập vận dụng' })).toHaveCount(
    0,
  );
});

test('large tabs support keyboard navigation; AI conversation survives closing the dialog', async ({
  page,
}) => {
  await enter(page);
  const first = page.getByRole('tab', { name: 'Chuyên đề' });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Tạo đề thi' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Tạo đề thi' })).toHaveAttribute(
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
