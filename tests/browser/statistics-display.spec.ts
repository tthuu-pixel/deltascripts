import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { upsertQuestions } from '../../server/question-storage';
import { parseTexText } from '../../shared/texParser';

test('statistics previews render nested headers, quote pairs and listEX on desktop and mobile', async ({
  page,
}, testInfo) => {
  const fixture = process.env.DELTASCRIPT_TEX_FIXTURE;
  const questions = fixture
    ? parseTexText(await readFile(fixture, 'utf8'))
    : parseTexText(String.raw`\begin{bt}
Biến cố \lq\lq Có đúng $2$ kết quả\rq\rq.
\begin{center}\begin{tabular}{|c|c|c|}
 & \begin{tabular}[c]{@{}c@{}}Việt\\Nam\end{tabular} & Indonesia \\
Vàng & $87$ & $91$ \\
Bạc & $81$ & $111$ \\
Đồng & $110$ & $131$ \\
\end{tabular}\end{center}
\begin{listEX}\item Ý thứ nhất.\item Ý thứ hai.\end{listEX}
\loigiai{Giữ nguyên lời giải.}\end{bt}`);
  const selected = fixture
    ? [
        questions[16],
        questions[0],
        ...questions.filter((q) => q.statementRaw.includes('\\begin{listEX}')),
      ]
    : questions;
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  try {
    await createTeacher(runtime.db, 'display@example.test', 'display-fixture-password');
    await upsertQuestions(runtime.db, selected);
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.route('https://tikz-fly.fly.dev/compile', (route) =>
      route.fulfill({ json: { ok: false, error: 'fixture' } }),
    );
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('display@example.test');
    await page.locator('input[type=password]').fill('display-fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const card = page.locator('.bank-question-card').filter({ hasText: selected[0].label }).first();
    await card.getByRole('button', { name: 'Xem đề bài', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const table = dialog.locator('.tex-table-scroll > table').first();
    await expect(table.locator(':scope > tbody > tr')).toHaveCount(4);
    await expect(table.locator(':scope > tbody > tr').first().locator(':scope > td')).toHaveCount(
      fixture ? 11 : 3,
    );
    await expect(table.locator('.tex-table-nested').first()).toContainText(
      fixture ? 'Thái' : 'Việt',
    );
    await expect(dialog).not.toContainText('\\begin{tabular}');
    await expect(table).toContainText('87');
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.screenshot({
      path: testInfo.outputPath('statistics-table-mobile.png'),
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).first().click();
    const bank = page.locator('.bank-question-list');
    await expect(bank).not.toContainText('\\lq');
    await expect(bank).not.toContainText('\\rq');
    await expect(bank).not.toContainText('\\begin{listEX}');
    expect(await bank.locator('ol.tex-list-ex > li').count()).toBeGreaterThanOrEqual(2);
    const saved = (await runtime.db.query('SELECT id,raw FROM questions')).rows;
    for (const q of selected) expect(saved.find((row) => row.id === q.id)!.raw).toBe(q.raw);
  } finally {
    await page.goto('about:blank');
    await runtime.close();
  }
});
