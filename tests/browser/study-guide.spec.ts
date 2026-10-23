import { test, expect } from '@playwright/test';

test('study guide presents readable lessons, correct formulas, a weekly plan and accessible section navigation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Tự học mỗi ngày');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập', exact: true }).click();
  await page.getByRole('tab', { name: 'Góc học tập', exact: true }).click();
  const guide = page.locator('.managed-guide');
  await expect(
    guide.getByRole('heading', { name: 'Thử một buổi học 30 phút', exact: true }),
  ).toBeVisible();
  await expect(guide.locator('.guide-card')).toHaveCount(12);
  await expect(guide.locator('.guide-week-plan > li')).toHaveCount(7);
  await expect(guide.locator('.katex-error')).toHaveCount(0);
  await expect(guide.locator('.katex').first()).toBeAttached();
  await expect(guide).not.toContainText('Nội dung góc học tập đang được quản trị viên chuẩn bị.');
  const navigation = guide.getByRole('navigation', { name: 'Nội dung góc học tập' });
  await navigation.getByRole('link', { name: 'Lỗi thường gặp', exact: true }).click();
  await expect(page).toHaveURL(/#guide-mistakes$/);
  await expect(
    guide.getByRole('heading', { name: 'Bốn lỗi nhỏ dễ bỏ sót', exact: true }),
  ).toBeInViewport();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    for (const card of await guide.locator('.guide-card').all())
      expect(
        await card.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBeTruthy();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath('study-guide-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('study-guide-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});
