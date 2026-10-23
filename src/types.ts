export interface Question {
  id: string;
  label: string;
  /** Legacy storage/source order only. Never used to classify questions or build exams. */
  number: number;
  examDescription?: string;
  numberOrigin?: 'explicit' | 'order' | 'ai' | 'manual';
  sourceLength?: number;
  statementRaw: string;
  solutionRaw: string;
  sourceType: 'word' | 'tex';
  raw?: string;
  latexPreamble?: string;
  rawTikzBlocks?: string[];
  rawImageRefs?: string[];
  createdAt?: string;
  active?: boolean;
  published?: boolean;
  topicIds?: string[];
}

export interface AccessCode {
  code: string;
  active: boolean;
  createdAt: string;
}

export interface User {
  role: 'student' | 'teacher';
  studentName?: string;
  studentClass?: string;
  accessCode?: string;
  expiresAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
