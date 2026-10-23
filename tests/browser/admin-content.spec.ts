import { test, expect } from '@playwright/test';
import { createRuntime } from '../runtime.ts';
import { createTeacher } from '../../server/auth.ts';
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';

test('administrator uploads their own topic and questions, publishes them and controls the student tabs', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  const learner = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const student = await learner.newPage();
  const errors: string[] = [];
  try {
    await createTeacher(runtime.db, 'owner@example.test', 'owner-browser-test-password');
    await runtime.db.prepare('INSERT INTO access_codes(code) VALUES(?)').bind('OWNERCMS').run();
    for (const current of [page, student]) {
      current.setDefaultTimeout(10_000);
      current.on('pageerror', (e) => errors.push(e.message));
      await current.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
        await route.fulfill({ response });
      });
      await current.route('https://tikz-fly.fly.dev/compile', (route) =>
        route.fulfill({ json: { base64: png } }),
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Quản trị', exact: true }).click();
    await page.getByPlaceholder('Email quản trị').fill('owner@example.test');
    await page.locator('input[type=password]').fill('owner-browser-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Trang quản trị', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Chuyên đề', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo chuyên đề', exact: true }).click();
    await page.getByLabel('Tên chuyên đề', { exact: true }).fill('Chuyên đề của thầy');
    await page.getByLabel('Nhóm chuyên đề', { exact: true }).fill('Hình học');
    await page.getByLabel('Mô tả ngắn', { exact: true }).fill('Nội dung do chính thầy biên soạn.');
    await page.getByRole('button', { name: 'Chọn biểu tượng chuyên đề', exact: true }).click();
    const palette = page.getByRole('dialog', { name: 'Chọn biểu tượng', exact: true });
    await expect(palette.locator('.math-icon-option')).toHaveCount(100);
    await expect(palette.locator('.math-icon-option').first()).toHaveText('');
    await palette.getByRole('button', { name: 'Biểu tượng 100', exact: true }).click();
    await expect(
      page
        .getByRole('button', { name: 'Chọn biểu tượng chuyên đề', exact: true })
        .locator('svg')
        .first(),
    ).toHaveAttribute('data-icon', 'compound-interest');
    await page.getByRole('button', { name: 'Chọn biểu tượng chuyên đề', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Chọn biểu tượng chuyên đề', exact: true }),
    ).toBeFocused();
    await page.getByLabel('Ví dụ', { exact: true }).fill('Ví dụ của thầy: $2+3=5$.');
    const body = String.raw`Bài học riêng $\sqrt{49}=7$.
\begin{tikzpicture}\draw (0,0) circle (\R);\end{tikzpicture}`;
    const lesson = String.raw`\documentclass{article}
\def\R{2.5}
\begin{document}
${body}
\end{document}`;
    await page
      .getByLabel('Nhập file bài học / lý thuyết', { exact: true })
      .setInputFiles({ name: 'bai-hoc.tex', mimeType: 'text/plain', buffer: Buffer.from(lesson) });
    await expect(page.getByLabel('Bài học / lý thuyết', { exact: true })).toHaveValue(body);
    await page.getByRole('button', { name: 'Xem trước bài học / lý thuyết', exact: true }).click();
    await expect(page.locator('.editor-preview .katex')).toBeVisible();
    await expect(page.getByAltText('Hình minh họa TikZ')).toBeVisible();
    await page.getByRole('button', { name: 'Lưu chuyên đề', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText('Đã lưu nháp');
    const stored = (await runtime.db.query('SELECT id,theory,preamble FROM topics')).rows[0];
    expect(stored.theory).toBe(body);
    expect(String(stored.preamble)).toContain(String.raw`\def\R{2.5}`);
    // The separate student session sees none of the draft lesson.
    await student.goto('/');
    await student.getByPlaceholder('Nhập họ và tên...').fill('Học sinh của lớp');
    await student.getByPlaceholder('Ví dụ: 9A1').fill('9A');
    await student.getByPlaceholder('8 KÝ TỰ').fill('OWNERCMS');
    await student.getByRole('button', { name: 'Vào học tập', exact: true }).click();
    await expect(
      student.getByRole('heading', { name: 'Chuyên đề đang được chuẩn bị' }),
    ).toBeVisible();
    // Import and keep the question as a draft, already attached to the topic.
    await page.getByRole('button', { name: 'Quản lý bài tập vận dụng', exact: true }).click();
    await page.getByLabel('Chọn file câu hỏi').setInputFiles({
      name: 'cau-hoi.tex',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        String.raw`\begin{ex}[Câu 4]Tự biên soạn $x+1=3$.\loigiai{Ta có $x=2$.}\end{ex}`,
      ),
    });
    await expect(page.getByText('1 câu chờ lưu')).toBeVisible();
    await page.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }).click();
    await expect(
      page.getByRole('group', { name: 'Chuyên đề cho bản nhập' }).getByRole('checkbox'),
    ).toBeChecked();
    await page.getByRole('button', { name: 'Lưu lên hệ thống', exact: true }).click();
    const card = page.locator('.bank-question-card').filter({ hasText: 'Tự biên soạn' });
    await expect(card).toContainText('Bản nháp');
    await page.reload();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Chỉnh sửa câu hỏi' });
    await expect(editor.getByLabel('Dạng câu', { exact: true })).toHaveCount(0);
    await editor.getByLabel('Lời giải', { exact: true }).fill('Lời giải do thầy sửa: $x=2$.');
    await editor.getByLabel('Xuất bản câu hỏi cho học sinh').check();
    await editor.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(card).toContainText('Đã xuất bản');
    // A draft topic stays hidden even when a bank question is already public.
    await student.getByRole('button', { name: 'Cập nhật nội dung' }).click();
    await expect(student.locator('.topic-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'Chuyên đề', exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await page.getByLabel('Xuất bản chuyên đề cho học sinh').check();
    await page.getByRole('button', { name: 'Lưu chuyên đề', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText(
      'Đã xuất bản chuyên đề',
    );
    await student.getByRole('button', { name: 'Cập nhật nội dung' }).click();
    await expect(student.locator('.topic-card')).toHaveCount(1);
    await student.locator('.topic-card').click();
    await expect(student.locator('.managed-lesson .katex')).toBeVisible();
    await student.getByRole('tab', { name: 'Ví dụ', exact: true }).click();
    await expect(student.locator('.managed-examples')).toContainText('Ví dụ của thầy');
    await expect(student.locator('.managed-examples .katex')).toBeVisible();
    await student.getByRole('tab', { name: 'Bài tập vận dụng', exact: true }).click();
    await expect(student.locator('.topic-exercise')).toHaveCount(1);
    await expect(student.locator('.topic-exercise')).toContainText('Tự biên soạn');
    await expect(student.locator('.solution-panel')).toHaveCount(0);
    await student.getByRole('button', { name: 'Đáp án', exact: true }).click();
    await expect(student.locator('.solution-panel')).toContainText('Lời giải do thầy sửa');
    // Bulk assignment uses the same question, without uploading a duplicate.
    await page.getByRole('button', { name: 'Quay lại danh sách', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo chuyên đề', exact: true }).click();
    await page.getByLabel('Tên chuyên đề', { exact: true }).fill('Chuyên đề bổ sung');
    await page.getByLabel('Xuất bản chuyên đề cho học sinh').check();
    await page.getByRole('button', { name: 'Lưu chuyên đề', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText('Đã xuất bản');
    await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
    await page.getByLabel('Lọc chuyên đề').selectOption('');
    await page.locator('.bank-question-card').getByRole('checkbox').check();
    const bulk = page.getByRole('region', { name: 'Phân loại câu đã chọn' });
    await bulk.getByLabel('Gán chuyên đề', { exact: true }).selectOption('add');
    await bulk.getByRole('checkbox', { name: 'Chuyên đề bổ sung', exact: true }).check();
    await bulk.getByRole('button', { name: 'Áp dụng cho 1 câu', exact: true }).click();
    await expect(page.locator('.bank-question-card')).toHaveCount(1);
    await expect(page.locator('.question-topic-labels')).toContainText('Chuyên đề bổ sung');
    // Rename, reorder and hide tabs, then refresh an active tab which was hidden.
    await student.getByRole('tab', { name: 'Tạo đề thi', exact: true }).click();
    await page.getByRole('button', { name: 'Trang học sinh', exact: true }).click();
    await page.getByLabel('Tiêu đề trang học sinh').fill('Không gian Toán của lớp');
    await page
      .getByRole('group', { name: 'Chuyên đề', exact: true })
      .getByLabel('Tên tab', { exact: true })
      .fill('Bài học của lớp');
    await page
      .getByRole('group', { name: 'Tạo đề thi', exact: true })
      .getByLabel('Hiển thị cho học sinh')
      .uncheck();
    await page
      .getByLabel('Nội dung góc học tập', { exact: true })
      .fill('Góc học tập do thầy đưa lên: $2+2=4$.');
    for (let i = 0; i < 2; i++)
      await page.getByRole('button', { name: 'Đưa tab Góc học tập lên', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu trang học sinh', exact: true }).click();
    await expect(page.locator('.notice-success[role=status]')).toContainText(
      'Đã cập nhật trang học sinh',
    );
    await student.getByRole('button', { name: 'Cập nhật nội dung' }).click();
    await expect(student.getByRole('heading', { name: /^Không gian Toán của lớp/ })).toBeVisible();
    await expect(student.getByRole('tab', { name: 'Tạo đề thi', exact: true })).toHaveCount(0);
    await expect(student.getByRole('tab').first()).toHaveAccessibleName('Góc học tập');
    await expect(student.getByRole('tab', { name: 'Góc học tập', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(student.locator('.managed-guide')).toContainText('Góc học tập do thầy đưa lên');
    await student.getByRole('tab', { name: 'Bài học của lớp', exact: true }).click();
    await expect(student.locator('.topic-card')).toHaveCount(2);
    expect((await runtime.db.query('SELECT count(*) AS n FROM questions')).rows[0].n).toBe(1);
    for (const width of [320, 390, 768, 1024, 1440])
      for (const current of [page, student]) {
        current.setDefaultTimeout(10_000);
        await current.setViewportSize({ width, height: 900 });
        expect(
          await current.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
      }
    expect(errors).toEqual([]);
  } finally {
    await learner.close();
    await runtime.close();
  }
});
