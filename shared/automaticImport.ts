export interface AutomaticImportJob {
  id: string;
  files: string[];
  expected: number;
  received: number;
  published: number;
  skipped: number;
  waiting: number;
  working: number;
  publishedQuestions: number;
  submitted: boolean;
  reason: string;
  nextAttempt: number | null;
  createdAt: number;
}
