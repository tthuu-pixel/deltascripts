import type { Database, Statement } from './database.ts';
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function tokenHash(token: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))));
}
async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100_000 },
      key,
      256,
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2-sha256:100000:${salt}:${hex(await derive(password, salt))}`;
}
// A non-account hash avoids password derivation when a Worker isolate starts.
const dummy = 'pbkdf2-sha256:100000:00000000000000000000000000000000:' + '0'.repeat(64);
export async function verifyPassword(password: string, stored = dummy) {
  const [algorithm, iterations, salt, expected] = stored.split(':');
  if (
    algorithm !== 'pbkdf2-sha256' ||
    iterations !== '100000' ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{64}$/.test(expected)
  )
    return false;
  const actual = hex(await derive(password, salt));
  let difference = 0;
  for (let i = 0; i < actual.length; i++)
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
export async function teacherStatements(
  db: Database,
  email: string,
  password: string,
): Promise<Statement[]> {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 256)
    throw new Error('Cần email hợp lệ và mật khẩu từ 12 đến 256 ký tự.');
  return [
    db
      .prepare(
        `INSERT INTO teachers(id,email,password_hash) VALUES(?,?,?)
      ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash`,
      )
      .bind(crypto.randomUUID(), email, await hashPassword(password)),
    db
      .prepare('DELETE FROM sessions WHERE teacher_id IN (SELECT id FROM teachers WHERE email=?)')
      .bind(email),
  ];
}
export async function createTeacher(db: Database, email: string, password: string) {
  await db.batch(await teacherStatements(db, email, password));
}
