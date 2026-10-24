import { test, expect } from '@playwright/test';
import { createRuntime } from '../runtime';
import { createTeacher } from '../../server/auth';
import { adminAiRoute } from '../../server/admin-ai';
import { automaticImportJobs } from '../../server/automatic-imports';
const secret = 'automatic-publish-browser-fixture-key-32-characters';
test('only uploading a file is required; server resumes after closing the page and publishes with selected topics', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const topic = crypto.randomUUID();
  let unavailable = true;
  let providerCalls = 0;
  const fetchMock: typeof fetch = async (_url, init) => {
    providerCalls++;
    if (unavailable) return new Response('fixture unavailable', { status: 429 });
    const data = JSON.parse(JSON.parse(String(init?.body)).messages.at(-1).content);
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: data.questions.map((q: any) => ({
                id: q.id,
                statementRaw: q.statement,
                solutionRaw: q.solution,
                topicIds: [topic],
                reason: 'Khớp mô tả chuyên đề.',
              })),
            }),
          },
        },
      ],
    });
  };
  const runtime = await createRuntime({
    origin: 'http://127.0.0.1:3100',
    aiSettingsKey: secret,
    fetchGemini: fetchMock,
  });
  try {
    await createTeacher(runtime.db, 'automatic@example.test', 'automatic-browser-password');
    await runtime.db
      .prepare(
        "INSERT INTO topics(id,title,description,icon,color,published) VALUES(?,'Phương trình','Giải phương trình bậc nhất một ẩn.','equation','blue',1)",
      )
      .bind(topic)
      .run();
    await adminAiRoute(
      runtime.db,
      '/api/admin/ai/settings',
      'POST',
      {
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        apiKey: 'fixture',
        version: 0,
      },
      { aiSettingsKey: secret },
    );
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.goto('/admin');
    await page.getByPlaceholder('Email quản trị').fill('automatic@example.test');
    await page.locator('input[type=password]').fill('automatic-browser-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Tải file để AI tự xuất bản' });
    await expect(panel).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Duyệt và dùng bản này', exact: true }),
    ).toHaveCount(0);
    await expect(panel.getByRole('checkbox')).toHaveCount(0);
    const tex = Array.from(
      { length: 26 },
      (_, i) => `\\begin{ex}Bài ${i + 1}: Giải $x+1=${i + 2}$.\\loigiai{$x=${i + 1}$.}\\end{ex}`,
    ).join('\n');
    await panel
      .getByLabel('Tải file để AI tự xuất bản', { exact: true })
      .setInputFiles({ name: 'tu-xuat-ban.tex', mimeType: 'text/plain', buffer: Buffer.from(tex) });
    await expect(panel.getByRole('status').first()).toContainText('Máy chủ đã nhận đủ');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await automaticImportJobs(runtime.db))[0].received).toBe(26);
    expect(providerCalls).toBe(0); // Upload and progress requests must never own paid AI work.
    const worker = await runtime.mf.getWorker();
    // A temporary provider outage is visible with a retry time, not a frozen spinner.
    for (let tick = 0; tick < 5; tick++) await worker.scheduled({ cron: '* * * * *' });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(panel).toContainText('Tự thử lại lúc');
    await expect(panel).toContainText('Lượt tiếp theo lúc');
    unavailable = false;
    await runtime.db
      .prepare("UPDATE automatic_import_sources SET next_attempt=0 WHERE state='pending'")
      .run();
    // Switching sections unmounts the upload panel; scheduled work still completes.
    await page.getByRole('button', { name: 'Chuyên đề', exact: true }).click();
    await worker.scheduled({ cron: '* * * * *' });
    await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: true }).click();
    await expect(panel).toContainText('6 / 26');
    // A background browser tab throttles timers. Returning must fetch progress immediately.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await worker.scheduled({ cron: '* * * * *' });
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(panel).toContainText('12 / 26');
    await page.goto('about:blank');
    // The actual Worker scheduled handler runs with no open app page or progress polling.
    for (let tick = 0; tick < 3; tick++) await worker.scheduled({ cron: '* * * * *' });
    expect((await automaticImportJobs(runtime.db))[0].published).toBe(26);
    expect(
      (await runtime.db.query('SELECT id FROM questions WHERE active=1 AND published=1')).rows,
    ).toHaveLength(26);
    expect(
      (await runtime.db.query('SELECT question_id FROM question_topics WHERE topic_id=?', [topic]))
        .rows,
    ).toHaveLength(26);
    const storedSources = (await runtime.db.query('SELECT raw FROM questions')).rows
      .map((q) => String(q.raw))
      .sort();
    expect(storedSources).toEqual(tex.split('\n').sort());
    await page.goBack();
    await expect(panel.getByText('Đã hoàn tất', { exact: true })).toBeVisible();
    await expect(panel).toContainText('26 / 26');
    await panel
      .getByLabel('Tải file để AI tự xuất bản', { exact: true })
      .setInputFiles({ name: 'tu-xuat-ban.tex', mimeType: 'text/plain', buffer: Buffer.from(tex) });
    await expect.poll(async () => (await automaticImportJobs(runtime.db)).length).toBe(2);
    await expect(panel.getByText('Đã hoàn tất', { exact: true })).toHaveCount(2);
    expect((await runtime.db.query('SELECT id FROM questions')).rows).toHaveLength(26);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('automatic-publish-mobile.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  } finally {
    await page.goto('about:blank');
    await runtime.close();
  }
});
