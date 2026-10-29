interface RequestTiming {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  startedAt: number;
}
const requests: RequestTiming[] = [];
let lastReport = 0,
  lastId = '',
  sent = 0;
export function beginRequestTiming(route: string, method: string) {
  const record = {
    path: '/api' + route.split('?')[0],
    method,
    status: -1,
    durationMs: 0,
    startedAt: Date.now(),
  };
  requests.push(record);
  if (requests.length > 20) requests.shift();
  return record;
}
export function endRequestTiming(record: RequestTiming, status: number) {
  record.status = status;
  record.durationMs = Date.now() - record.startedAt;
}
// Only fixed stage text, counts and request timings: never file contents, keys,
// request bodies, query strings, cookies or response data.
export function reportImportDiagnostic(
  stage: string,
  bytes: number,
  received: number,
  total: number,
  volatile: boolean,
) {
  if (sent >= 5 || Date.now() - lastReport < 30000) return lastId;
  lastReport = Date.now();
  sent++;
  const id = crypto.randomUUID();
  lastId = id;
  const body = JSON.stringify({
    id,
    stage,
    bytes,
    received,
    total,
    volatile,
    requests: requests.map((r) => ({
      ...r,
      durationMs: r.status === -1 ? Date.now() - r.startedAt : r.durationMs,
    })),
  });
  void fetch('/api/admin/imports/diagnostic', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
  return id;
}
