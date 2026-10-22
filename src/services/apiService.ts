import type { AccessCode, ChatMessage, Question, User } from '../types';

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

export async function apiRequest<T = any>(route: string, body?: unknown, ttl = 0): Promise<T> {
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
        signal: AbortSignal.timeout(route.startsWith('/ai') ? 55_000 : 20_000),
      });
    } catch {
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
  ): Promise<{ items: Question[]; total: number; page: number; pageSize: number }> {
    return apiRequest(`/questions?page=${page}&pageSize=20&number=${number}`, undefined, 30_000);
  },
  async getRandomQuestion(number: number): Promise<Question> {
    return (await apiRequest(`/questions/random?number=${number}`)).question;
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
