import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { parseTexText } from '../../shared/texParser';
import { automaticImportJobs } from '../../server/automatic-imports';
import { upsertQuestions } from '../../server/question-storage';

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
    await page.addInitScript(() => {
      const open = indexedDB.open.bind(indexedDB);
      let first = true;
      indexedDB.open = ((...args: Parameters<typeof indexedDB.open>) => {
        if (!first) return open(...args);
        first = false;
        (window as any).__startupStorageReadPending = true;
        const deferred: any = {};
        setTimeout(() => {
          const request = open(...args);
          request.onupgradeneeded = () => {
            deferred.result = request.result;
            deferred.onupgradeneeded?.();
          };
          request.onsuccess = () => {
            deferred.result = request.result;
            deferred.onsuccess?.();
          };
          request.onerror = () => {
            deferred.error = request.error;
            deferred.onerror?.();
          };
        }, 8000);
        return deferred;
      }) as typeof indexedDB.open;
    });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('connection@example.test');
    await page.locator('input[type=password]').fill('connection-fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Tải file để AI tự xuất bản' });
    await expect(panel).toBeVisible();
    await page.waitForFunction(() => (window as any).__startupStorageReadPending);
    failUploadRead = true;
    await panel.locator('input[type=file]').setInputFiles({
      name: fixture ? basename(fixture) : 'nguon-100-bai.tex',
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

test('a failed bank read does not report an empty bank and can be retried', async ({ page }) => {
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  try {
    await createTeacher(runtime.db, 'bank-read@example.test', 'bank-read-fixture-password');
    await upsertQuestions(
      runtime.db,
      parseTexText(String.raw`\begin{bt}Nguồn đang có $x=1$.\loigiai{Giữ nguyên nguồn.}\end{bt}`),
    );
    let offline = true;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (offline && url.pathname === '/api/questions' && route.request().method() === 'GET') {
        await route.abort('connectionreset');
        return;
      }
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('bank-read@example.test');
    await page.locator('input[type=password]').fill('bank-read-fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(
      page.getByText('Chưa tải được số lượng câu hỏi. Dữ liệu trong kho được giữ nguyên.'),
    ).toBeVisible();
    await expect(page.getByText(/^0 câu hỏi trong kho/)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Một kho câu hỏi đang chờ được viết.' }),
    ).toHaveCount(0);
    offline = false;
    await page.getByRole('button', { name: 'Tải lại ngân hàng', exact: true }).click();
    await expect(page.locator('.bank-question-card')).toHaveCount(1);
    await expect(page.getByText(/^1 câu hỏi trong kho/)).toBeVisible();
    expect((await runtime.db.query('SELECT id FROM questions WHERE active=1')).rows).toHaveLength(
      1,
    );
  } finally {
    await page.goto('about:blank');
    await runtime.close();
  }
});
