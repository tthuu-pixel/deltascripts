import { test, expect } from '@playwright/test';
import { deflateSync } from 'node:zlib';

// A valid, opaque 800×400 PNG: dimensions exercise actual responsive layout, not a 1px mock.
function fixturePng() {
  function crc32(bytes: Buffer) {
    let value = 0xffffffff;
    for (const byte of bytes) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
  }
  function chunk(type: string, data: Buffer) {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4),
      crc = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(800);
  header.writeUInt32BE(400, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc((800 * 3 + 1) * 400, 240);
  for (let row = 0; row < 400; row++) rows[row * (800 * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]).toString('base64');
}

test('TikZ images display at half their fitted width, centered on desktop/mobile and after cache reload', async ({
  page,
}) => {
  let compiles = 0;
  await page.route('https://tikz-fly.fly.dev/compile', (route) => {
    compiles++;
    return route.fulfill({ json: { base64: fixturePng() } });
  });
  await page.goto('/');
  await page.getByPlaceholder('Nhập họ và tên...').fill('Kiểm tra kích thước');
  await page.getByPlaceholder('Ví dụ: 9A1').fill('9A');
  await page.getByPlaceholder('8 KÝ TỰ').fill('E2E00001');
  await page.getByRole('button', { name: 'Vào học tập', exact: true }).click();
  async function open() {
    await page.locator('.topic-card').filter({ hasText: 'Đường tròn của lớp' }).click();
    await page.getByRole('tab', { name: 'Bài tập vận dụng', exact: true }).click();
    await expect(page.getByAltText('Hình minh họa TikZ')).toHaveCount(3);
    for (const image of await page.getByAltText('Hình minh họa TikZ').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await image.evaluate((element: HTMLImageElement) => element.decode());
    }
  }
  await open();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const image of await page.getByAltText('Hình minh họa TikZ').all()) {
      const actual = await image.evaluate((element: HTMLImageElement) => {
        const box = element.getBoundingClientRect(),
          parent = element.parentElement!.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          expected: Math.min(element.naturalWidth, parent.width) / 2,
          centerDelta: Math.abs(box.x + box.width / 2 - parent.x - parent.width / 2),
        };
      });
      expect(Math.abs(actual.width - actual.expected)).toBeLessThan(1);
      expect(actual.centerDelta).toBeLessThan(1);
      expect(Math.abs(actual.width / actual.height - 2)).toBeLessThan(0.01);
    }
  }
  expect(compiles).toBe(3);
  await page.reload();
  await open();
  expect(compiles).toBe(3);
  await expect(page.getByAltText('Hình minh họa TikZ').first()).toHaveCSS('margin-left', /\d/);
});
