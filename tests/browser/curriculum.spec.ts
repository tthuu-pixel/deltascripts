import { test, expect } from '@playwright/test';
import { curriculumSource, curriculumTopics } from '../../server/curriculum';

test('all 14 authored topics display formulas, expandable types and solved examples on desktop and mobile', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const topics = curriculumTopics.map((t) => ({
    ...t,
    published: true,
    questionCount: 0,
    version: 1,
    examplesPreamble: t.examples_preamble,
  }));
  await page.route('**/api/student-content', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ json: { ...body, topics } });
  });
  await page.route('**/api/topic?id=*', (route) => {
    const id = new URL(route.request().url()).searchParams.get('id');
    return route.fulfill({ json: { success: true, topic: topics.find((t) => t.id === id) } });
  });
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Đọc chuyên đề');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập', exact: true }).click();
  await expect(page.locator('.topic-card')).toHaveCount(14);
  let types = 0,
    examples = 0;
  for (const [i, topic] of topics.entries()) {
    await page
      .locator('.topic-card')
      .filter({ has: page.getByRole('heading', { name: topic.title, exact: true }) })
      .click();
    await page.getByRole('tab', { name: 'Lý thuyết', exact: true }).click();
    const lesson = page.locator('.managed-lesson');
    await expect(lesson.locator('.curriculum-type')).toHaveCount(curriculumSource[i].types.length);
    await lesson.locator('.curriculum-type summary').first().click();
    await expect(lesson.locator('.curriculum-type-body').first()).toBeVisible();
    await lesson
      .locator('.curriculum-type')
      .evaluateAll((nodes) => nodes.forEach((n) => n.setAttribute('open', '')));
    await expect(lesson.locator('.katex-error')).toHaveCount(0);
    expect(await lesson.innerText()).not.toMatch(/\\(?:dfrac|sqrt|begin|DauHieu|HuongGiai)/);
    types += await lesson.locator('.curriculum-type').count();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    if (i === 0) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: testInfo.outputPath('curriculum-theory-desktop.png'),
        fullPage: true,
      });
    }
    await page.getByRole('tab', { name: 'Ví dụ', exact: true }).click();
    const solved = page.locator('.managed-examples');
    await expect(solved.locator('.curriculum-example')).toHaveCount(2);
    await solved.locator('.curriculum-solution summary').first().click();
    await expect(solved.locator('.curriculum-solution p').first()).toBeVisible();
    await expect(solved.locator('.katex-error')).toHaveCount(0);
    expect(await solved.innerText()).not.toMatch(/\\(?:dfrac|sqrt|begin)/);
    examples += await solved.locator('.curriculum-example').count();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    if (i === 12)
      await page.screenshot({
        path: testInfo.outputPath('curriculum-examples-mobile.png'),
        fullPage: true,
      });
    await page.getByRole('button', { name: 'Tất cả chuyên đề', exact: true }).click();
  }
  expect(types).toBe(112);
  expect(examples).toBe(28);
  expect(errors).toEqual([]);
});
