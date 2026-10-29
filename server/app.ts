import { normalizationRoute } from './latex-normalizations';
import { automaticImportsRoute, wakeAutomaticImports } from './automatic-imports';
import {
  questionFilters,
  readQuestionSelection,
  readSelectedQuestions,
} from './question-selection';
import { generateExam, examSettingsRoute } from './exam';
import { generateReply, providerModels } from './ai-provider';
import { aiProviders, type AiProvider } from '../shared/ai';
import { validateAiConfig } from './admin-ai';
import type { Database, Statement } from './database.ts';
import { publicQuestion, query, questionSelect } from './database.ts';
import { hashPassword, newToken, tokenHash, verifyPassword } from './auth.ts';
import { parseTexText } from '../shared/texParser.ts';
import { HttpError, requireValue } from './errors.ts';
import { adminAiRoute } from './admin-ai.ts';
import {
  contentRoute,
  contentRoutes,
  membershipStatements,
  validateTopicIds,
  validateTopicsExist,
  attachQuestionTopics,
} from './content.ts';

export { HttpError } from './errors.ts';
const text = (value: unknown, max = 200) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const placeholders = (length: number) => Array.from({ length }, () => '?').join(',');

export { validateQuestion, questionStatements, upsertQuestions } from './question-storage';
import { validateQuestion, upsertQuestions } from './question-storage';
interface Options {
  aiSettingsKey?: string;
  geminiKey?: string;
  geminiModel?: string;
  allowedOrigins?: string[];
  fetchGemini?: typeof fetch;
}
export function createApp(db: Database, options: Options = {}) {
  const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
    Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
        ...extra,
      },
    });
  const cookieToken = (req: Request) =>
    req.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('ds_session='))
      ?.slice(11) || '';
  async function session(req: Request, teacher = false) {
    const { rows } = await query(
      db,
      `SELECT s.*,a.active AS code_active FROM sessions s LEFT JOIN access_codes a ON a.code=s.access_code
      WHERE s.token_hash=? AND s.expires_at>?`,
      [await tokenHash(cookieToken(req)), Date.now()],
    );
    const s = rows[0];
    requireValue(
      s && (s.role === 'teacher' || s.code_active === 1),
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      401,
    );
    requireValue(!teacher || s.role === 'teacher', 'Chức năng này dành cho quản trị viên.', 403);
    return s;
  }
  async function limit(key: string, max: number, duration = 60_000) {
    const now = Date.now();
    const row = await db
      .prepare(
        `INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`,
      )
      .bind(key, now + duration, now, now)
      .first<{ count: number }>();
    requireValue(row && row.count <= max, 'Quá nhiều yêu cầu. Vui lòng thử lại sau.', 429);
  }
  const publicUser = (s: any) => ({
    role: s.role,
    studentName: s.student_name,
    studentClass: s.student_class,
    expiresAt: s.expires_at,
  });
  const cookie = (req: Request, token: string, age: number) =>
    `ds_session=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
  async function issue(req: Request, user: any) {
    const token = newToken(),
      expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    const insert = db
      .prepare(
        `INSERT INTO sessions(token_hash,role,teacher_id,student_name,student_class,access_code,expires_at)
      SELECT ?,?,?,?,?,?,? WHERE ${user.role === 'teacher' ? 'EXISTS(SELECT 1 FROM teachers WHERE id=? AND password_hash=?)' : 'EXISTS(SELECT 1 FROM access_codes WHERE code=? AND active=1)'}`,
      )
      .bind(
        await tokenHash(token),
        user.role,
        user.teacher_id || null,
        user.student_name || null,
        user.student_class || null,
        user.access_code || null,
        expiresAt,
        ...(user.role === 'teacher' ? [user.teacher_id, user.password_hash] : [user.access_code]),
      );
    const statements = [
      db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await tokenHash(cookieToken(req))),
      insert,
    ];
    if (user.role === 'student')
      statements.push(
        db
          .prepare(
            `INSERT INTO student_logins(id,student_name,student_class,access_code,login_time)
      SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)`,
          )
          .bind(
            crypto.randomUUID(),
            user.student_name,
            user.student_class,
            user.access_code,
            Date.now(),
            await tokenHash(token),
          ),
      );
    const results = await db.batch(statements);
    requireValue(
      results[1].meta.changes === 1,
      'Thông tin đăng nhập vừa thay đổi. Vui lòng thử lại.',
      401,
    );
    return json({ success: true, user: publicUser({ ...user, expires_at: expiresAt }) }, 200, {
      'Set-Cookie': cookie(req, token, 8 * 60 * 60),
    });
  }
  async function readBody(req: Request) {
    const max = 2_000_000;
    if (Number(req.headers.get('content-length') || 0) > max)
      throw new HttpError(413, 'Lần nhập vượt 2 MB. Hãy chia nhỏ.');
    const reader = req.body?.getReader();
    if (!reader) return {};
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) {
        await reader.cancel();
        throw new HttpError(413, 'Lần nhập vượt 2 MB. Hãy chia nhỏ.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of chunks) {
      bytes.set(part, offset);
      offset += part.length;
    }
    try {
      const value = JSON.parse(new TextDecoder().decode(bytes));
      requireValue(
        value && typeof value === 'object' && !Array.isArray(value),
        'JSON phải là đối tượng.',
      );
      return value;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, 'JSON không hợp lệ.');
    }
  }
  return {
    async fetch(req: Request): Promise<Response> {
      try {
        const url = new URL(req.url),
          route = url.pathname,
          method = req.method;
        const origin = req.headers.get('origin');
        requireValue(
          !origin || [url.origin, ...(options.allowedOrigins || [])].includes(origin),
          'Nguồn yêu cầu không hợp lệ.',
          403,
        );
        requireValue(['GET', 'POST'].includes(method), 'Phương thức không được hỗ trợ.', 405);
        if (method === 'POST')
          requireValue(
            req.headers.get('content-type')?.split(';')[0].trim() === 'application/json',
            'Yêu cầu phải dùng JSON.',
            415,
          );
        const body = method === 'POST' ? await readBody(req) : {};
        if (route === '/api/health' && method === 'GET') {
          await query(db, 'SELECT number FROM question_counts LIMIT 1');
          return json({ success: true, status: 'ok', database: 'd1' });
        }
        if (route.startsWith('/api/admin/normalizations')) {
          await session(req, true);
          if (method === 'POST')
            await limit(`normalization:${await tokenHash(cookieToken(req))}`, 180);
          return json({ success: true, ...(await normalizationRoute(db, route, method, body)) });
        }
        if (route.startsWith('/api/admin/imports')) {
          await session(req, true);
          if (method === 'POST')
            await limit(`automatic-upload:${await tokenHash(cookieToken(req))}`, 180);
          const result = await automaticImportsRoute(db, route, method, body);
          return json({ success: true, ...result });
        }
        if (route.startsWith('/api/admin/ai/')) {
          await session(req, true);
          if (method === 'POST') await limit(`admin-ai:${await tokenHash(cookieToken(req))}`, 20);
          const result = await adminAiRoute(db, route, method, body, options, url);
          if (route === '/api/admin/ai/settings' && method === 'POST') {
            await wakeAutomaticImports(db);
          }
          return json({ success: true, ...result });
        }
        if (['/api/auth/setup/check', '/api/auth/setup'].includes(route) && method === 'POST') {
          await limit(
            `setup:${await tokenHash(req.headers.get('CF-Connecting-IP') || 'local')}`,
            20,
            10 * 60_000,
          );
          const unavailable = 'Liên kết không hợp lệ, đã hết hạn hoặc đã sử dụng.';
          requireValue(
            typeof body.token === 'string' && /^[a-f0-9]{64}$/.test(body.token),
            unavailable,
            410,
          );
          const hashedToken = await tokenHash(body.token);
          const link = await db
            .prepare(
              `SELECT expires_at FROM teacher_setup_links
              WHERE id=1 AND token_hash=? AND used_at IS NULL AND expires_at>?
              AND NOT EXISTS(SELECT 1 FROM teachers)`,
            )
            .bind(hashedToken, Date.now())
            .first();
          requireValue(link, unavailable, 410);
          if (route.endsWith('/check')) return json({ success: true });

          const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
          const password = typeof body.password === 'string' ? body.password : '';
          requireValue(
            email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            'Vui lòng nhập email hợp lệ.',
          );
          requireValue(
            password.length >= 12 && password.length <= 256,
            'Mật khẩu cần từ 12 đến 256 ký tự.',
          );
          const id = crypto.randomUUID();
          const passwordHash = await hashPassword(password);
          const now = Date.now();
          // Recheck eligibility inside the atomic batch, after password derivation.
          // Concurrent submissions can create only the first teacher.
          const results = await db.batch([
            db
              .prepare(
                `INSERT INTO teachers(id,email,password_hash)
                SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM teachers)
                AND EXISTS(SELECT 1 FROM teacher_setup_links
                  WHERE id=1 AND token_hash=? AND used_at IS NULL AND expires_at>?)`,
              )
              .bind(id, email, passwordHash, hashedToken, now),
            db
              .prepare(
                `UPDATE teacher_setup_links SET used_at=?
                WHERE id=1 AND token_hash=? AND used_at IS NULL
                AND EXISTS(SELECT 1 FROM teachers WHERE id=?)`,
              )
              .bind(now, hashedToken, id),
          ]);
          requireValue(results[0].meta.changes === 1, unavailable, 410);
          return issue(req, { role: 'teacher', teacher_id: id, password_hash: passwordHash });
        }
        if (route === '/api/auth/teacher' && method === 'POST') {
          await limit(
            `teacher:${await tokenHash(req.headers.get('CF-Connecting-IP') || 'local')}`,
            10,
            10 * 60_000,
          );
          const email = text(body.email, 254).toLowerCase(),
            password = typeof body.password === 'string' ? body.password : '';
          requireValue(password.length <= 256, 'Email hoặc mật khẩu không đúng.', 401);
          const { rows } = await query(db, 'SELECT id,password_hash FROM teachers WHERE email=?', [
            email,
          ]);
          const teacher = rows[0];
          const valid = await verifyPassword(
            password,
            teacher?.password_hash as string | undefined,
          );
          requireValue(teacher && valid, 'Email hoặc mật khẩu không đúng.', 401);
          return issue(req, {
            role: 'teacher',
            teacher_id: teacher.id,
            password_hash: teacher.password_hash,
          });
        }
        if (route === '/api/auth/student' && method === 'POST') {
          await limit(
            `student:${await tokenHash(req.headers.get('CF-Connecting-IP') || 'local')}`,
            120,
          );
          const code = text(body.accessCode, 32).toUpperCase(),
            name = text(body.studentName, 120),
            studentClass = text(body.studentClass, 50);
          requireValue(
            name && studentClass && /^[A-Z0-9]{8}$/.test(code),
            'Nhập đủ họ tên, lớp và mã 8 ký tự.',
          );
          const row = await db
            .prepare('SELECT code FROM access_codes WHERE code=? AND active=1')
            .bind(code)
            .first();
          requireValue(row, 'Mã vào ôn tập không hợp lệ hoặc đã ngừng hoạt động.', 401);
          return issue(req, {
            role: 'student',
            student_name: name,
            student_class: studentClass,
            access_code: code,
          });
        }
        if (route === '/api/auth/me' && method === 'GET')
          return json({ success: true, user: publicUser(await session(req)) });
        if (route === '/api/auth/logout' && method === 'POST') {
          await db
            .prepare('DELETE FROM sessions WHERE token_hash=?')
            .bind(await tokenHash(cookieToken(req)))
            .run();
          return json({ success: true }, 200, { 'Set-Cookie': cookie(req, '', 0) });
        }
        if (contentRoutes.has(route)) {
          const user = await session(req);
          return json({ success: true, ...(await contentRoute(db, url, method, body, user)) });
        }
        if (route === '/api/questions/selection' && method === 'GET') {
          await session(req, true);
          return json({ success: true, ...(await readQuestionSelection(db, url)) });
        }
        if (route === '/api/questions/selected' && method === 'POST') {
          await session(req, true);
          return json({ success: true, items: await readSelectedQuestions(db, body.ids) });
        }
        if (route === '/api/questions' && method === 'GET') {
          await session(req, true);
          const page = Math.max(
            1,
            Math.min(100_000, Math.floor(Number(url.searchParams.get('page')) || 1)),
          );
          const size = Math.max(
            1,
            Math.min(50, Math.floor(Number(url.searchParams.get('pageSize')) || 20)),
          );
          const { conditions, params } = questionFilters(url);
          const where = conditions.join(' AND ');
          const results = await db.batch<Record<string, unknown>>([
            db
              .prepare(
                `SELECT ${questionSelect} FROM questions q WHERE ${where}
              ORDER BY q.created_at DESC,q.id LIMIT ? OFFSET ?`,
              )
              .bind(...params, size, (page - 1) * size),
            db.prepare(`SELECT count(*) AS total FROM questions q WHERE ${where}`).bind(...params),
          ]);
          return json({
            success: true,
            items: await attachQuestionTopics(db, results[0].results),
            total: results[1].results[0].total,
            page,
            pageSize: size,
          });
        }
        if (route === '/api/admin/exam-settings') {
          await session(req, true);
          return json({ success: true, ...(await examSettingsRoute(db, method, body)) });
        }
        if (route === '/api/exam' && method === 'GET') {
          await session(req);
          return json({ success: true, items: await generateExam(db) });
        }
        if (route === '/api/questions' && method === 'POST') {
          await session(req, true);
          requireValue(
            Array.isArray(body.questions) &&
              body.questions.length > 0 &&
              body.questions.length <= 100,
            'Mỗi lần lưu từ 1 đến 100 câu hỏi.',
          );
          // Validate references before starting the atomic save. Missing topics never partially import a batch.
          for (const question of body.questions) validateQuestion(question);
          await validateTopicsExist(
            db,
            body.questions.flatMap((q: any) => q.topicIds || []),
          );
          await upsertQuestions(db, body.questions);
          return json({ success: true, count: body.questions.length });
        }
        if (route === '/api/questions/delete' && method === 'POST') {
          await session(req, true);
          const ids = body.ids;
          requireValue(
            Array.isArray(ids) &&
              ids.length > 0 &&
              ids.length <= 100 &&
              ids.every((id) => typeof id === 'string'),
            'Danh sách ID không hợp lệ.',
          );
          await db
            .prepare(`UPDATE questions SET active=0 WHERE id IN (${placeholders(ids.length)})`)
            .bind(...ids)
            .run();
          return json({ success: true });
        }
        if (route === '/api/access-codes' && method === 'GET') {
          await session(req, true);
          const { rows } = await query(
            db,
            'SELECT code,active,created_at AS createdAt FROM access_codes ORDER BY created_at DESC,code',
          );
          return json({
            success: true,
            items: rows.map((row) => ({ ...row, active: row.active === 1 })),
          });
        }
        if (route === '/api/access-codes' && method === 'POST') {
          await session(req, true);
          const code = text(body.code, 32).toUpperCase();
          requireValue(/^[A-Z0-9]{8}$/.test(code), 'Mã phải có đúng 8 chữ cái hoặc chữ số.');
          const result = await db
            .prepare('INSERT OR IGNORE INTO access_codes(code) VALUES(?)')
            .bind(code)
            .run();
          requireValue(result.meta.changes === 1, 'Mã đã tồn tại. Hãy tạo mã khác.', 409);
          return json({ success: true });
        }
        if (route === '/api/access-codes/delete' && method === 'POST') {
          await session(req, true);
          const codes = body.codes;
          requireValue(
            Array.isArray(codes) &&
              codes.length > 0 &&
              codes.length <= 100 &&
              codes.every((c) => typeof c === 'string' && /^[A-Z0-9]{8}$/.test(c)),
            'Danh sách mã không hợp lệ.',
          );
          await db.batch([
            db
              .prepare(
                `UPDATE access_codes SET active=0 WHERE code IN (${placeholders(codes.length)})`,
              )
              .bind(...codes),
            db
              .prepare(`DELETE FROM sessions WHERE access_code IN (${placeholders(codes.length)})`)
              .bind(...codes),
          ]);
          return json({ success: true });
        }
        if (['/api/ai', '/api/ai/similar', '/api/ai/models'].includes(route) && method === 'POST') {
          await session(req);
          await limit(`ai:${await tokenHash(cookieToken(req))}`, 10);
          const provider = body.provider === undefined ? 'gemini' : body.provider;
          requireValue(Object.hasOwn(aiProviders, provider), 'Nhà cung cấp AI không hợp lệ.');
          const defaults = aiProviders[provider as AiProvider];
          const config = validateAiConfig({
            provider,
            baseUrl: defaults.baseUrl,
            model:
              body.model === undefined
                ? provider === 'gemini'
                  ? options.geminiModel || defaults.model
                  : defaults.model
                : body.model,
            apiKey: body.apiKey,
          });
          if (!config.apiKey && provider === 'gemini') config.apiKey = options.geminiKey || '';
          requireValue(
            config.apiKey,
            'Hãy nhập API key của nhà cung cấp đã chọn trong Cài đặt.',
            503,
          );
          if (route === '/api/ai/models')
            return json({ success: true, ...(await providerModels(config, options)) });
          const similar = route.endsWith('/similar'),
            context = text(body.context, 20_000);
          const message = similar
            ? 'Tạo một bài Toán 9 tương tự với số liệu khác, độ khó tương đương. Trả duy nhất LaTeX trong môi trường bt, phải có lời giải đầy đủ trong \\loigiai{...}. Kiểm chứng số liệu và đáp án. Không dùng Markdown.'
            : text(body.message, 5000);
          if (similar) requireValue(!!context, 'Cần chọn câu hỏi gốc để tạo bài tương tự.');
          requireValue(message, 'Vui lòng nhập câu hỏi.');
          const history =
            !similar && Array.isArray(body.history)
              ? body.history
                  .slice(-12)
                  .filter(
                    (m: any) =>
                      ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string',
                  )
              : [];
          const messages: { role: 'user' | 'assistant'; content: string }[] = history.map(
            (m: any) => ({ role: m.role, content: m.content.slice(0, 5000) }),
          );
          while (messages[0]?.role === 'assistant') messages.shift();
          messages.push({
            role: 'user',
            content: `Đề bài hiện tại:\n${context}\n\nYêu cầu: ${message}`,
          });
          const reply = await generateReply(
            config,
            options,
            'Bạn là trợ giảng Toán 9 bằng tiếng Việt. Gợi ý từng bước; chỉ giải đầy đủ khi học sinh yêu cầu. Giữ nguyên dữ kiện gốc. Khi viết LaTeX, dùng $...$, \\dfrac, \\heva cho hệ phương trình; giữ nguyên cases cho hàm từng đoạn. TikZ mới phải thuần TikZ, không dùng tkz-euclide/pgfplots. Đặt tikzset ngoài hình, giữ dấu chấm thập phân trong tọa độ. Khi soạn bài mới, kiểm chứng mọi dữ kiện và đáp án.',
            messages,
            similar ? 4000 : 2000,
          );
          if (!similar) return json({ success: true, reply });
          let parsed;
          try {
            parsed = parseTexText(reply.replace(/^```(?:latex|tex)?\s*|\s*```$/g, ''));
          } catch {
            throw new HttpError(502, 'Bài AI tạo chưa có cấu trúc hợp lệ. Vui lòng thử lại.');
          }
          requireValue(
            parsed.length === 1 && parsed[0].statementRaw && parsed[0].solutionRaw,
            'AI chưa tạo đủ đề và lời giải. Vui lòng thử lại.',
            502,
          );
          return json({
            success: true,
            question: { ...parsed[0], label: 'Bài tập tương tự' },
          });
        }
        throw new HttpError(404, 'API không tồn tại.');
      } catch (error) {
        if (error instanceof HttpError)
          return json({ success: false, error: error.message }, error.status);
        if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
          return json(
            { success: false, error: 'Dịch vụ xử lý quá thời gian. Vui lòng thử lại.' },
            504,
          );
        // Never send SQL, source text, cookies or provider keys to the browser/logs.
        return json({ success: false, error: 'Máy chủ gặp lỗi. Vui lòng thử lại.' }, 500);
      }
    },
  };
}
