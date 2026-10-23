import { test, expect } from '@playwright/test';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { upsertQuestions } from '../../server/app';

test('admin configures seven exam positions by topic; students see topic learning and generated exams', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  const learner = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  const student = await learner.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  student.on('pageerror', (e) => errors.push(e.message));
  try {
    await createTeacher(runtime.db, 'blueprint@example.test', 'blueprint-fixture-password');
    const topicId = crypto.randomUUID();
    await runtime.db
      .prepare('INSERT INTO topics(id,title,description,published) VALUES(?,?,?,1)')
      .bind(topicId, 'Bài toán thực tế', 'Lập phương trình giải các bài toán thực tế.')
      .run();
    await runtime.db.prepare("INSERT INTO access_codes(code) VALUES('BLUE0001')").run();
    await upsertQuestions(
      runtime.db,
      Array.from({ length: 7 }, (_, i) => ({
        id: crypto.randomUUID(),
        number: 17 + i,
        label: `Nguồn ${17 + i}`,
        sourceType: 'tex',
        statementRaw: `Bài toán thực tế ${i + 1}: $x+1=3$.`,
        solutionRaw: 'Đáp án $x=2$.',
        published: true,
        topicIds: [topicId],
      })),
    );
    for (const current of [page, student])
      await current.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
        await route.fulfill({ response });
      });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('blueprint@example.test');
    await page.locator('input[type=password]').fill('blueprint-fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByLabel('Lọc dạng câu')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cấu hình tạo đề', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cấu hình tạo đề', exact: true })).toBeVisible();
    await expect(page.locator('.exam-slot-card')).toHaveCount(7);
    for (let i = 1; i <= 7; i++) {
      const slot = page.getByRole('region', { name: `Cấu hình Câu ${i}`, exact: true });
      await slot.getByLabel(`Mô tả Câu ${i}`, { exact: true }).fill(`Yêu cầu của vị trí ${i}`);
      await slot.getByRole('checkbox', { name: 'Bài toán thực tế', exact: true }).check();
    }
    await page.getByRole('button', { name: 'Lưu cấu hình tạo đề', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình');
    await expect(page.getByText('7 câu có thể lấy', { exact: true })).toHaveCount(7);
    await page.screenshot({
      path: testInfo.outputPath('exam-settings-desktop.png'),
      fullPage: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('exam-settings-mobile.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Trang học sinh', exact: true }).click();
    await page.getByRole('button', { name: 'Cấu hình tạo đề', exact: true }).click();
    await expect(page.getByLabel('Mô tả Câu 7', { exact: true })).toHaveValue(
      'Yêu cầu của vị trí 7',
    );
    await student.goto('/');
    await student.getByPlaceholder('Nhập họ và tên...').fill('Học sinh tạo đề');
    await student.getByPlaceholder('Ví dụ: 9A1').fill('9A');
    await student.getByPlaceholder('8 KÝ TỰ').fill('BLUE0001');
    await student.getByRole('button', { name: 'Vào học tập', exact: true }).click();
    await expect(student.getByRole('tab')).toHaveCount(3);
    await expect(student.getByRole('tab', { name: 'Luyện câu hỏi' })).toHaveCount(0);
    await student.getByRole('tab', { name: 'Tạo đề thi', exact: true }).click();
    await student.getByRole('button', { name: 'Tạo đề tham khảo', exact: true }).click();
    await student.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click();
    await expect(student.locator('.exam-question')).toHaveCount(7);
    await expect(student.getByText('Yêu cầu của vị trí 7', { exact: true })).toBeVisible();
    await expect(student.locator('.exam-question h3')).toContainText([
      'Câu 1',
      'Câu 2',
      'Câu 3',
      'Câu 4',
      'Câu 5',
      'Câu 6',
      'Câu 7',
    ]);
    await student.reload();
    await expect(student.locator('.exam-question')).toHaveCount(7);
    await expect(student.getByRole('timer')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await learner.close();
    await runtime.close();
  }
});
