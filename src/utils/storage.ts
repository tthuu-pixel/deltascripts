// Storage can be disabled or full; neither should crash the application.
export function readStorage<T>(key: string, fallback: T, storage: Storage = localStorage): T {
  try {
    return JSON.parse(storage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key: string, value: unknown, storage: Storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function removeStorage(key: string, storage: Storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch {
    /* private browsing */
  }
}
