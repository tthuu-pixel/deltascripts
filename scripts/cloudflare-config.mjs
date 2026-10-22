import { readFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';
export async function readCloudflareConfig() {
  const errors = [];
  const config = parse(await readFile('wrangler.jsonc', 'utf8'), errors, {
    allowTrailingComma: true,
  });
  if (errors.length || !config || typeof config !== 'object')
    throw new Error('wrangler.jsonc không hợp lệ.');
  return config;
}
