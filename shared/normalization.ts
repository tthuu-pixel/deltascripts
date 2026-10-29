export interface NormalizationJob {
  id: string;
  label: string;
  expected: number;
  received: number;
  completed: number;
  review: number;
  skipped: number;
  waiting: number;
  working: number;
  nextAttempt: number | null;
  reason: string;
  createdAt: number;
}
