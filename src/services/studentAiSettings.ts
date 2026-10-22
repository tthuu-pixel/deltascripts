import { aiProviders, type AiProvider } from '../../shared/ai';
export interface StudentAiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
}
const storageKey = 'deltascript_student_ai';
interface Profiles {
  provider: AiProvider;
  profiles: Partial<Record<AiProvider, StudentAiSettings>>;
}
function read(): Profiles {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (value && Object.hasOwn(aiProviders, value.provider) && value.profiles) return value;
  } catch {}
  return { provider: 'gemini', profiles: {} };
}
export function getStudentAiSettings(provider?: AiProvider): StudentAiSettings {
  const saved = read();
  provider ||= saved.provider;
  const profile = saved.profiles[provider];
  let legacy = '';
  try {
    if (provider === 'gemini') legacy = sessionStorage.getItem('gemini_api_key') || '';
  } catch {}
  return {
    provider,
    model:
      typeof profile?.model === 'string' && profile.model
        ? profile.model
        : aiProviders[provider].model,
    apiKey: typeof profile?.apiKey === 'string' ? profile.apiKey : legacy,
  };
}
export function saveStudentAiSettings(settings: StudentAiSettings) {
  const saved = read();
  saved.provider = settings.provider;
  saved.profiles[settings.provider] = settings;
  sessionStorage.setItem(storageKey, JSON.stringify(saved));
  sessionStorage.removeItem('gemini_api_key');
  try {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('deltascript_gemini_api_key');
  } catch {}
}
export function clearStudentAiSettings() {
  try {
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem('gemini_api_key');
  } catch {}
}
