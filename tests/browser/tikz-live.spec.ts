import { test, expect } from '@playwright/test';

// Optional network integration check; normal regression tests stay independent of the provider.
const live = process.env.TIKZ_LIVE === '1';
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (live && proxyUrl) {
  const url = new URL(proxyUrl);
  test.use({
    proxy: {
      server: `${url.protocol}//${url.host}`,
      bypass: '127.0.0.1,localhost',
      ...(url.username
        ? { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) }
        : {}),
    },
  });
}

test('live TikZ: real compiler response decodes and displays in the application', async ({
  page,
}, testInfo) => {
  test.skip(!live, 'Run npm run test:tikz to contact the real compiler.');
  test.setTimeout(90_000);
  const calls: { status: number; type: string }[] = [];
  page.on('response', (response) => {
    if (response.url().endsWith('/compile')) {
      calls.push({ status: response.status(), type: response.headers()['content-type'] || '' });
    }
  });
  // No route.fulfill or compiler mock: use the normal logged-in application and fixture question.
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Kiểm tra hình TikZ');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A1');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập' }).click();
  await page.getByRole('tab', { name: 'Luyện câu hỏi', exact: true }).click();
  for (const number of [2, 3, 4]) {
    await page.getByRole('button', { name: `Câu ${number}`, exact: true }).click();
    await expect(page.locator('article .katex').first()).toBeVisible();
    const image = page.getByAltText('Hình minh họa TikZ');
    await expect(image).toBeVisible({ timeout: 25_000 });
    const dimensions = await image.evaluate(async (element: HTMLImageElement) => {
      await element.decode();
      return { width: element.naturalWidth, height: element.naturalHeight };
    });
    expect(dimensions.width).toBeGreaterThan(100);
    expect(dimensions.height).toBeGreaterThan(100);
    await testInfo.attach(`compiler-result-${number}`, {
      body: JSON.stringify({ calls, dimensions }),
      contentType: 'application/json',
    });
    const screenshot = testInfo.outputPath(`rendered-tikz-${number}.png`);
    await page.locator('article').screenshot({ path: screenshot });
    await testInfo.attach(`rendered-tikz-${number}`, {
      path: screenshot,
      contentType: 'image/png',
    });
  }
  expect(calls.filter((call) => call.status === 200)).toHaveLength(3);
  await page.reload();
  await page.getByRole('tab', { name: 'Luyện câu hỏi', exact: true }).click();
  await page.getByRole('button', { name: 'Câu 3', exact: true }).click();
  await expect(page.getByAltText('Hình minh họa TikZ')).toBeVisible();
  expect(calls).toHaveLength(3); // Browser cache survives a full reload.
});
