import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { parseTexText } from '../../shared/texParser';
import { automaticImportJobs } from '../../server/automatic-imports';

test('a 100-question TeX file still uploads after interrupted bank and upload-state reads', async ({
  page,
}) => {
  test.setTimeout(60000);
  const fixture = process.env.DELTASCRIPT_TEX_FIXTURE;
  const source = fixture
    ? await readFile(fixture, 'utf8')
    : Array.from(
        { length: 100 },
        (_, i) => String.raw`\begin{bt}
Cho hàm số $y=\dfrac{${i + 1}}{2}x^2$. Vẽ đồ thị.
\loigiai{\begin{center}\begin{tabular}{|c|c|c|}\hline $x$&$0$&$1$\\\hline $y$&$0$&$1$\\\hline\end{tabular}\end{center}
\begin{tikzpicture}\draw[smooth,domain=-2:2] plot(\x,{\x*\x});\end{tikzpicture}}
\end{bt}`,
      ).join('\n');
  const original = parseTexText(source);
  expect(original).toHaveLength(100);
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  try {
    await createTeacher(runtime.db, 'connection@example.test', 'connection-fixture-password');
    let failBankRead = true,
      failUploadRead = false;
    let bankFailures = 0,
      uploadFailures = 0;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/questions' && route.request().method() === 'GET' && failBankRead) {
        failBankRead = false;
        bankFailures++;
        await route.abort('connectionreset');
        return;
      }
      if (url.pathname === '/api/admin/imports' && failUploadRead) {
        failUploadRead = false;
        uploadFailures++;
        await route.abort('connectionreset');
        return;
      }
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('connection@example.test');
    await page.locator('input[type=password]').fill('connection-fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Tải file để AI tự xuất bản' });
    await expect(panel).toBeVisible();
    failUploadRead = true;
    await panel.locator('input[type=file]').setInputFiles({
      name: 'ham-so-100-bai.tex',
      mimeType: 'text/x-tex',
      buffer: Buffer.from(source),
    });
    await expect(panel.getByRole('status').first()).toContainText('Máy chủ đã nhận đủ', {
      timeout: 12000,
    });
    expect(bankFailures).toBe(1);
    expect(uploadFailures).toBe(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
    const [job] = await automaticImportJobs(runtime.db);
    expect(job.received).toBe(100);
    expect(job.expected).toBe(100);
    expect(job.submitted).toBe(true);
    const saved = (await runtime.db.query('SELECT payload FROM automatic_import_sources')).rows.map(
      (r) => JSON.parse(String(r.payload)),
    );
    // Identical exercises may occur twice in an uploaded file; receipts retain both
    // while the source queue intentionally stores only one copy.
    expect(saved.map((q) => q.raw).sort()).toEqual([...new Set(original.map((q) => q.raw))].sort());
    expect(saved.every((q) => q.exerciseEnvironment === 'bt')).toBe(true);
  } finally {
    await page.goto('about:blank');
    await runtime.close();
  }
});
