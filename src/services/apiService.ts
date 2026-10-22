import type { AccessCode, ChatMessage, Question, User } from '../types';
import type { ManagedTopic, StudentSettings, TopicSummary } from '../../shared/content';
import type { AiSettings, AiSuggestion } from '../../shared/ai';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const pending = new Map<string, Promise<any>>();
const cache = new Map<string, { value: any; expires: number }>();
let revision = 0;
export function clearApiCache() {
  revision++;
  cache.clear();
  pending.clear();
}

export async function apiRequest<T = any>(
  route: string,
  body?: unknown,
  ttl = 0,
  signal?: AbortSignal,
): Promise<T> {
  if (body === undefined) {
    const saved = cache.get(route);
    if (saved && saved.expires > Date.now()) return saved.value;
    if (pending.has(route)) return pending.get(route)!;
  }
  const currentRevision = revision;
  const request = (async () => {
    let response: Response;
    try {
      response = await fetch(`/api${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.any([
          ...(signal ? [signal] : []),
          AbortSignal.timeout(
            route.startsWith('/ai') || route.startsWith('/admin/ai/') ? 55_000 : 20_000,
          ),
        ]),
      });
    } catch {
      if (signal?.aborted) throw new DOMException('Đã dừng quét AI.', 'AbortError');
      throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0);
    }
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('Máy chủ trả dữ liệu không hợp lệ.', response.status);
    }
    if (!response.ok || data.success !== true) {
      if (response.status === 401 && !route.startsWith('/auth/'))
        window.dispatchEvent(new Event('auth-expired'));
      throw new ApiError(data.error || 'Yêu cầu không thành công.', response.status);
    }
    if (body !== undefined && !route.startsWith('/ai')) clearApiCache();
    if (ttl && currentRevision === revision)
      cache.set(route, { value: data, expires: Date.now() + ttl });
    return data as T;
  })();
  if (body === undefined) {
    pending.set(route, request);
    void request
      .finally(() => {
        if (pending.get(route) === request) pending.delete(route);
      })
      .catch(() => {});
  }
  return request;
}
export const apiService = {
  async getAiSettings(): Promise<AiSettings> {
    return (await apiRequest('/admin/ai/settings')).settings;
  },
  async saveAiSettings(settings: AiSettings & { apiKey?: string }): Promise<AiSettings> {
    return (await apiRequest('/admin/ai/settings', settings)).settings;
  },
  async testAiSettings(settings: AiSettings & { apiKey?: string }): Promise<string[]> {
    return (await apiRequest('/admin/ai/test', settings)).models;
  },
  async suggestQuestionTopics(
    questions: Pick<Question, 'id' | 'statementRaw' | 'number' | 'label' | 'numberOrigin'>[],
    signal?: AbortSignal,
  ): Promise<AiSuggestion[]> {
    return (await apiRequest('/admin/ai/classify', { questions }, 0, signal)).items;
  },
  async getAiScanPage(
    cutoff = '',
    cursor = '',
    signal?: AbortSignal,
  ): Promise<{ items: Question[]; total?: number; cutoff: string; nextCursor: string | null }> {
    return apiRequest(
      `/admin/ai/scan?${new URLSearchParams({ cutoff, cursor })}`,
      undefined,
      0,
      signal,
    );
  },
  async me(): Promise<User> {
    return (await apiRequest('/auth/me')).user;
  },
  async loginTeacher(email: string, password: string): Promise<User> {
    return (await apiRequest('/auth/teacher', { email, password })).user;
  },
  async checkTeacherSetup(token: string) {
    await apiRequest('/auth/setup/check', { token });
  },
  async setupTeacher(token: string, email: string, password: string): Promise<User> {
    return (await apiRequest('/auth/setup', { token, email, password })).user;
  },
  async loginStudent(studentName: string, studentClass: string, accessCode: string): Promise<User> {
    return (await apiRequest('/auth/student', { studentName, studentClass, accessCode })).user;
  },
  async logout() {
    await apiRequest('/auth/logout', {});
    clearApiCache();
  },
  async getQuestions(
    page = 1,
    number = 0,
    filters: { topicId?: string; status?: string; search?: string } = {},
  ): Promise<{ items: Question[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '20',
      number: String(number),
      ...filters,
    });
    return apiRequest(`/questions?${params}`, undefined, 30_000);
  },
  async getStudentContent(): Promise<{ settings: StudentSettings; topics: TopicSummary[] }> {
    return apiRequest('/student-content');
  },
  async getStudentSettings(): Promise<StudentSettings> {
    return (await apiRequest('/student-settings')).settings;
  },
  async saveStudentSettings(settings: StudentSettings): Promise<StudentSettings> {
    return (await apiRequest('/student-settings', { settings })).settings;
  },
  async getTopics(): Promise<TopicSummary[]> {
    return (await apiRequest('/topics')).items;
  },
  async getTopic(id: string): Promise<ManagedTopic> {
    return (await apiRequest(`/topic?id=${encodeURIComponent(id)}`)).topic;
  },
  async saveTopic(topic: Partial<ManagedTopic>): Promise<ManagedTopic> {
    return (await apiRequest('/topics/save', { topic })).topic;
  },
  async deleteTopic(id: string, version: number) {
    return apiRequest('/topics/delete', { id, version });
  },
  async reorderTopics(ids: string[]) {
    return apiRequest('/topics/reorder', { ids });
  },
  async getTopicQuestions(
    topicId: string,
    page = 1,
    number = 0,
  ): Promise<{ items: Question[]; total: number; page: number; pageSize: number }> {
    return apiRequest(
      `/topic-questions?${new URLSearchParams({ topicId, page: String(page), number: String(number) })}`,
    );
  },
  async classifyQuestions(
    ids: string[],
    changes: {
      number?: number;
      published?: boolean;
      topicIds?: string[];
      mode?: 'add' | 'replace' | 'remove';
    },
    signal?: AbortSignal,
  ) {
    return apiRequest('/questions/classify', { ids, ...changes }, 0, signal);
  },
  async getRandomQuestion(number: number, topicId?: string): Promise<Question> {
    const route = topicId
      ? `/topic-question/random?${new URLSearchParams({ number: String(number), topicId })}`
      : `/questions/random?number=${number}`;
    return (await apiRequest(route)).question;
  },
  async generateExam(): Promise<Question[]> {
    return (await apiRequest('/exam')).items;
  },
  async saveQuestions(questions: Question[]) {
    return apiRequest('/questions', { questions });
  },
  async deleteQuestions(ids: string[]) {
    return apiRequest('/questions/delete', { ids });
  },
  async getAccessCodes(): Promise<AccessCode[]> {
    return (await apiRequest('/access-codes', undefined, 30_000)).items;
  },
  async createAccessCode(code: string) {
    return apiRequest('/access-codes', { code });
  },
  async deleteAccessCodes(codes: string[]) {
    return apiRequest('/access-codes/delete', { codes });
  },
  async askAI(
    message: string,
    context: string,
    history: ChatMessage[],
    apiKey: string,
  ): Promise<string> {
    return (await apiRequest('/ai', { message, context, history, apiKey })).reply;
  },
  async similarQuestion(question: Question, apiKey: string): Promise<Question> {
    return (
      await apiRequest('/ai/similar', {
        context: question.statementRaw,
        number: question.number,
        apiKey,
      })
    ).question;
  },
};
