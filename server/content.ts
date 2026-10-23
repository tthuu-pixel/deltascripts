import type { Database, Statement } from './database.ts';
import { publicQuestion, query, questionSelect, topicRandomQuestionSql } from './database.ts';
import { HttpError, requireValue } from './errors.ts';
import { defaultStudentSettings, topicIcons, type StudentSettings } from '../shared/content.ts';

const marks = (n: number) => Array.from({ length: n }, () => '?').join(',');
const uuid = (id: unknown): id is string =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const topicColumns =
  'id,title,category,description,icon,color,position,published,question_count AS questionCount,version';
function topicRow(row: Record<string, unknown>) {
  return { ...row, published: row.published === 1 };
}
function field(value: unknown, label: string, max: number, required = false) {
  requireValue(
    typeof value === 'string' && value.length <= max && (!required || value.trim()),
    `${label} không hợp lệ (tối đa ${max.toLocaleString('vi-VN')} ký tự).`,
  );
  return value.trim();
}
export function validateTopicIds(value: unknown): asserts value is string[] {
  requireValue(
    Array.isArray(value) &&
      value.length <= 10 &&
      value.every(uuid) &&
      new Set(value).size === value.length,
    'Mỗi câu được gắn tối đa 10 chuyên đề, không trùng nhau.',
  );
}
export async function validateTopicsExist(db: Database, ids: string[]) {
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 90) {
    const group = unique.slice(i, i + 90);
    const found = await query(
      db,
      `SELECT id FROM topics WHERE id IN (${marks(group.length)})`,
      group,
    );
    requireValue(
      found.rows.length === group.length,
      'Chuyên đề đã bị xóa. Hãy làm mới danh sách.',
      409,
    );
  }
}
export function membershipStatements(
  db: Database,
  assignments: { id: string; topicIds: string[] }[],
  mode: 'add' | 'replace' | 'remove',
): Statement[] {
  const statements: Statement[] = [];
  if (mode === 'replace') {
    for (let i = 0; i < assignments.length; i += 90) {
      const ids = assignments.slice(i, i + 90).map((a) => a.id);
      statements.push(
        db
          .prepare(`DELETE FROM question_topics WHERE question_id IN (${marks(ids.length)})`)
          .bind(...ids),
      );
    }
  }
  const pairs = assignments.flatMap((a) => a.topicIds.map((topicId) => [a.id, topicId]));
  for (let i = 0; i < pairs.length; i += 50) {
    const group = pairs.slice(i, i + 50);
    statements.push(
      db
        .prepare(
          mode === 'remove'
            ? `DELETE FROM question_topics WHERE ${group.map(() => '(question_id=? AND topic_id=?)').join(' OR ')}`
            : `INSERT OR IGNORE INTO question_topics(question_id,topic_id) VALUES ${group.map(() => '(?,?)').join(',')}`,
        )
        .bind(...group.flat()),
    );
  }
  return statements;
}
export async function attachQuestionTopics(db: Database, items: Record<string, unknown>[]) {
  if (!items.length) return [];
  const links = await query(
    db,
    `SELECT question_id,topic_id FROM question_topics WHERE question_id IN (${marks(items.length)})`,
    items.map((q) => q.id),
  );
  const groups = new Map<unknown, unknown[]>();
  for (const link of links.rows)
    groups.set(link.question_id, [...(groups.get(link.question_id) || []), link.topic_id]);
  return items.map((q) => ({ ...publicQuestion(q), topicIds: groups.get(q.id) || [] }));
}
async function settings(db: Database): Promise<StudentSettings> {
  const row = await db
    .prepare('SELECT content,version FROM student_settings WHERE id=1')
    .first<{ content: string; version: number }>();
  const saved = JSON.parse(row?.content || '{}');
  // Remove the retired tab while preserving the administrator's other settings and ordering.
  const tabs = (saved.tabs || defaultStudentSettings.tabs).filter((tab: any) =>
    defaultStudentSettings.tabs.some((current) => current.key === tab.key),
  );
  if (!tabs.some((tab: any) => tab.visible)) tabs[0].visible = true;
  return { ...defaultStudentSettings, ...saved, tabs, version: row?.version || 1 };
}
function validateSettings(value: any): StudentSettings {
  requireValue(
    value && Number.isInteger(value.version) && value.version >= 1,
    'Phiên bản cấu hình không hợp lệ.',
  );
  const keys = defaultStudentSettings.tabs.map((t) => t.key);
  requireValue(
    Array.isArray(value.tabs) &&
      value.tabs.length === 3 &&
      new Set(value.tabs.map((t: any) => t?.key)).size === 3 &&
      value.tabs.every((t: any) => t && keys.includes(t.key) && typeof t.visible === 'boolean') &&
      value.tabs.some((t: any) => t.visible),
    'Cần đủ ba tab và ít nhất một tab đang hiển thị.',
  );
  return {
    version: value.version,
    heroTitle: field(value.heroTitle, 'Tiêu đề trang', 160, true),
    heroSubtitle: field(value.heroSubtitle, 'Dòng phụ', 160),
    heroIntro: field(value.heroIntro, 'Lời giới thiệu', 1000),
    topicsIntro: field(value.topicsIntro, 'Giới thiệu chuyên đề', 1000),
    guideTitle: field(value.guideTitle, 'Tiêu đề góc học tập', 160, true),
    guideContent: field(value.guideContent, 'Nội dung góc học tập', 100_000),
    tabs: value.tabs.map((tab: any) => ({
      key: tab.key,
      label: field(tab.label, 'Tên tab', 60, true),
      description: field(tab.description, 'Mô tả tab', 100),
      visible: tab.visible,
    })),
  };
}
async function visibleTopic(db: Database, id: string, admin: boolean, full = true) {
  requireValue(uuid(id), 'Mã chuyên đề không hợp lệ.');
  const topic = await db
    .prepare(
      `SELECT ${topicColumns}${full ? ',theory,preamble,examples,examples_preamble AS examplesPreamble' : ''} FROM topics WHERE id=? ${admin ? '' : 'AND published=1'}`,
    )
    .bind(id)
    .first();
  requireValue(topic, 'Chuyên đề chưa được xuất bản hoặc không còn tồn tại.', 404);
  return topic;
}

export const contentRoutes = new Set([
  '/api/student-content',
  '/api/student-settings',
  '/api/topics',
  '/api/topic',
  '/api/topics/save',
  '/api/topics/delete',
  '/api/topics/reorder',
  '/api/topic-questions',
  '/api/topic-question/random',
  '/api/questions/classify',
]);
export async function contentRoute(
  db: Database,
  url: URL,
  method: string,
  body: any,
  user: Record<string, unknown>,
) {
  const route = url.pathname;
  const admin = user.role === 'teacher';
  if (method === 'POST' || route === '/api/student-settings')
    requireValue(admin, 'Chức năng này dành cho quản trị viên.', 403);
  if (route === '/api/student-content' && method === 'GET') {
    const [config, list] = await Promise.all([
      settings(db),
      query(db, `SELECT ${topicColumns} FROM topics WHERE published=1 ORDER BY position,id`),
    ]);
    return { settings: config, topics: list.rows.map(topicRow) };
  }
  if (route === '/api/student-settings' && method === 'GET')
    return { settings: await settings(db) };
  if (route === '/api/student-settings' && method === 'POST') {
    const config = validateSettings(body.settings);
    const result = await db
      .prepare('UPDATE student_settings SET content=?,version=version+1 WHERE id=1 AND version=?')
      .bind(JSON.stringify(config), config.version)
      .run();
    requireValue(
      result.meta.changes === 1,
      'Cấu hình đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi lưu.',
      409,
    );
    return { settings: { ...config, version: config.version + 1 } };
  }
  if (route === '/api/topics' && method === 'GET') {
    const result = await query(
      db,
      `SELECT ${topicColumns} FROM topics ${admin ? '' : 'WHERE published=1'} ORDER BY position,id`,
    );
    return { items: result.rows.map(topicRow) };
  }
  if (route === '/api/topic' && method === 'GET')
    return { topic: topicRow(await visibleTopic(db, url.searchParams.get('id') || '', admin)) };
  if (route === '/api/topics/save' && method === 'POST') {
    const topic = body.topic;
    requireValue(topic && typeof topic === 'object', 'Chuyên đề không hợp lệ.');
    const id = topic.id || crypto.randomUUID();
    requireValue(uuid(id), 'Mã chuyên đề không hợp lệ.');
    const existing = await db
      .prepare('SELECT version,examples,examples_preamble FROM topics WHERE id=?')
      .bind(id)
      .first();
    const values: unknown[] = [
      field(topic.title, 'Tên chuyên đề', 160, true),
      field(topic.category, 'Nhóm chuyên đề', 80),
      field(topic.description, 'Mô tả', 500),
      field(topic.theory, 'Bài học', 500_000),
      field(topic.preamble, 'Khai báo LaTeX', 50_000),
      field(
        topic.examples === undefined ? existing?.examples || '' : topic.examples,
        'Ví dụ',
        500_000,
      ),
      field(
        topic.examplesPreamble === undefined
          ? existing?.examples_preamble || ''
          : topic.examplesPreamble,
        'Khai báo LaTeX ví dụ',
        50_000,
      ),
    ];
    requireValue(
      topicIcons.includes(topic.icon) &&
        ['blue', 'red', 'yellow'].includes(topic.color) &&
        typeof topic.published === 'boolean',
      'Biểu tượng, màu hoặc trạng thái không hợp lệ.',
    );
    values.push(topic.icon, topic.color, topic.published ? 1 : 0);
    if (existing) {
      requireValue(Number.isInteger(topic.version), 'Cần tải bản hiện tại trước khi sửa.');
      const changed = await db
        .prepare(
          'UPDATE topics SET title=?,category=?,description=?,theory=?,preamble=?,examples=?,examples_preamble=?,icon=?,color=?,published=?,version=version+1 WHERE id=? AND version=?',
        )
        .bind(...values, id, topic.version)
        .run();
      requireValue(
        changed.meta.changes === 1,
        'Chuyên đề đã thay đổi. Hãy tải lại trước khi lưu.',
        409,
      );
    } else {
      requireValue(!topic.id, 'Chuyên đề đã bị xóa. Hãy tạo chuyên đề mới.', 409);
      const count = await db.prepare('SELECT count(*) AS n FROM topics').first<{ n: number }>();
      requireValue((count?.n || 0) < 500, 'Kho hiện hỗ trợ tối đa 500 chuyên đề.');
      await db
        .prepare(
          `INSERT INTO topics(id,title,category,description,theory,preamble,examples,examples_preamble,icon,color,published,position) SELECT ?,?,?,?,?,?,?,?,?,?,?,COALESCE(MAX(position),-1)+1 FROM topics`,
        )
        .bind(id, ...values)
        .run();
    }
    return { topic: topicRow(await visibleTopic(db, id, true)) };
  }
  if (route === '/api/topics/delete' && method === 'POST') {
    requireValue(uuid(body.id) && Number.isInteger(body.version), 'Chuyên đề không hợp lệ.');
    const result = await db
      .prepare('DELETE FROM topics WHERE id=? AND version=? RETURNING id')
      .bind(body.id, body.version)
      .first();
    requireValue(result, 'Chuyên đề đã thay đổi hoặc bị xóa. Hãy làm mới.', 409);
    return {};
  }
  if (route === '/api/topics/reorder' && method === 'POST') {
    requireValue(
      Array.isArray(body.ids) &&
        body.ids.length > 0 &&
        body.ids.length <= 500 &&
        body.ids.every(uuid) &&
        new Set(body.ids).size === body.ids.length,
      'Danh sách chuyên đề không hợp lệ.',
    );
    const current = await query(db, 'SELECT id FROM topics');
    requireValue(
      current.rows.length === body.ids.length && current.rows.every((t) => body.ids.includes(t.id)),
      'Danh sách đã thay đổi. Hãy tải lại trước khi sắp xếp.',
      409,
    );
    // Three bindings per row: use at most 30 rows to stay below D1's 100 limit.
    const safe: Statement[] = [];
    for (let i = 0; i < body.ids.length; i += 30) {
      const group = body.ids.slice(i, i + 30);
      safe.push(
        db
          .prepare(
            `UPDATE topics SET position=CASE id ${group.map(() => 'WHEN ? THEN ?').join(' ')} END,version=version+1 WHERE id IN (${marks(group.length)})`,
          )
          .bind(...group.flatMap((id: string, j: number) => [id, i + j]), ...group),
      );
    }
    await db.batch(safe);
    return {};
  }
  if (route === '/api/topic-questions' && method === 'GET') {
    const topicId = url.searchParams.get('topicId') || '';
    const topic = await visibleTopic(db, topicId, admin, false);
    const page = Math.max(
      1,
      Math.min(100_000, Math.floor(Number(url.searchParams.get('page')) || 1)),
    );
    const condition = `qt.topic_id=? AND q.active=1 AND q.published=1 `;
    const params = [topicId];
    const result = await query(
      db,
      `SELECT ${questionSelect} FROM question_topics qt JOIN questions q ON q.id=qt.question_id WHERE ${condition} ORDER BY q.created_at DESC,q.id LIMIT 10 OFFSET ?`,
      [...params, (page - 1) * 10],
    );
    const total = topic.questionCount;
    return { items: result.rows.map(publicQuestion), total, page, pageSize: 10 };
  }
  if (route === '/api/topic-question/random' && method === 'GET') {
    const topicId = url.searchParams.get('topicId') || '';
    await visibleTopic(db, topicId, admin, false);
    const result = await query(db, topicRandomQuestionSql, [topicId]);
    requireValue(result.rows.length, 'Chưa có bài tập đã xuất bản trong chuyên đề này.', 404);
    return { question: publicQuestion(result.rows[0]) };
  }
  if (route === '/api/questions/classify' && method === 'POST') {
    requireValue(
      Array.isArray(body.ids) &&
        body.ids.length > 0 &&
        body.ids.length <= 100 &&
        body.ids.every(uuid) &&
        new Set(body.ids).size === body.ids.length,
      'Chọn từ 1 đến 100 câu hỏi khác nhau.',
    );
    requireValue(
      body.published === undefined || typeof body.published === 'boolean',
      'Trạng thái xuất bản không hợp lệ.',
    );
    if (body.topicIds !== undefined) {
      validateTopicIds(body.topicIds);
      requireValue(
        ['add', 'replace', 'remove'].includes(body.mode),
        'Cách gán chuyên đề không hợp lệ.',
      );
      await validateTopicsExist(db, body.topicIds);
    }
    requireValue(
      body.published !== undefined || body.topicIds !== undefined,
      'Chọn nội dung cần cập nhật.',
    );
    for (let i = 0; i < body.ids.length; i += 90) {
      const ids = body.ids.slice(i, i + 90);
      const found = await query(
        db,
        `SELECT id FROM questions WHERE active=1 AND id IN (${marks(ids.length)})`,
        ids,
      );
      requireValue(
        found.rows.length === ids.length,
        'Một câu hỏi đã bị xóa. Hãy làm mới danh sách.',
        409,
      );
    }
    const updates: Statement[] = [];
    const columns = [body.published !== undefined ? 'published=?' : ''].filter(Boolean);
    if (columns.length)
      for (let i = 0; i < body.ids.length; i += 90) {
        const ids = body.ids.slice(i, i + 90);
        updates.push(
          db
            .prepare(
              `UPDATE questions SET ${columns.join(',')} WHERE active=1 AND id IN (${marks(ids.length)})`,
            )
            .bind(...(body.published !== undefined ? [body.published ? 1 : 0] : []), ...ids),
        );
      }
    if (body.topicIds !== undefined)
      if (body.mode === 'add' && body.topicIds.length) {
        for (let i = 0; i < body.ids.length; i += 90) {
          const ids = body.ids.slice(i, i + 90);
          const existing = await query(
            db,
            `SELECT question_id,count(*) AS n FROM question_topics WHERE question_id IN (${marks(ids.length)}) AND topic_id NOT IN (${marks(body.topicIds.length)}) GROUP BY question_id`,
            [...ids, ...body.topicIds],
          );
          requireValue(
            existing.rows.every((row) => Number(row.n) + body.topicIds.length <= 10),
            'Kết quả vượt 10 chuyên đề cho một câu. Hãy kiểm tra lại phân loại.',
          );
        }
      }
    if (body.topicIds !== undefined)
      updates.push(
        ...membershipStatements(
          db,
          body.ids.map((id: string) => ({ id, topicIds: body.topicIds })),
          body.mode,
        ),
      );
    if (updates.length) await db.batch(updates);
    return {};
  }
  throw new HttpError(404, 'API không tồn tại.');
}
