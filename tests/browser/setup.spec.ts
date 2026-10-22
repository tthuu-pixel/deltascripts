import { test, expect } from '@playwright/test';
import { createRuntime } from '../runtime.ts';
import { newToken, tokenHash } from '../../server/auth.ts';

test('owner sets their own password in the browser and the setup link is consumed', async ({
  page,
}) => {
  const runtime = await createRuntime({ origin: 'http://127.0.0.1:3100' });
  const token = newToken();
  const password = 'browser-setup-test-password';
  try {
    await runtime.db.query(
      'INSERT INTO teacher_setup_links(id,token_hash,expires_at) VALUES(1,?,?)',
      [await tokenHash(token), Date.now() + 60_000],
    );
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: runtime.url.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    const exceptions: string[] = [];
    page.on('pageerror', (error) => exceptions.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/setup');
    await expect(page.getByRole('alert')).toContainText('liên kết thiết lập riêng');
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);
    await page.goto(`/setup#token=${token}`);
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    expect(new URL(page.url()).hash).toBe('');
    await page.getByLabel('Email', { exact: true }).fill('new-owner@example.test');
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill(password);
    await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(password + '-wrong');
    await page.getByRole('button', { name: 'Tạo tài khoản và đăng nhập' }).click();
    await expect(page.getByRole('alert')).toContainText('chưa khớp');
    expect((await runtime.db.query('SELECT id FROM teachers')).rows).toHaveLength(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Tạo tài khoản và đăng nhập' }).click();
    await expect(page.getByRole('heading', { name: 'Trang quản trị' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/admin');
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toContain(password);
    expect(stored).not.toContain(token);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Trang quản trị' })).toBeVisible();
    await page.goto(`/setup#token=${token}`);
    await expect(page.getByRole('alert')).toContainText('đã sử dụng');
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);
    expect(exceptions).toEqual([]);
  } finally {
    await runtime.close();
  }
});
