import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, User } from './types';

interface AppState {
  user: User | null;
  questions: Question[];
  isSettingsOpen: boolean;
  isAIPanelOpen: boolean;
  currentContextQuestion: Question | null;
  setUser: (user: User | null) => void;
  setQuestions: (questions: Question[]) => void;
  addQuestions: (questions: Question[]) => void;
  removeQuestions: (ids: string[]) => void;
  toggleSettings: () => void;
  toggleAIPanel: () => void;
  setCurrentContextQuestion: (q: Question | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      questions: [],
      isSettingsOpen: false,
      isAIPanelOpen: false,
      currentContextQuestion: null,
      setUser: (user) => set({ user }),
      setQuestions: (questions) => set({ questions }),
      addQuestions: (newQuestions) => set((state) => ({ questions: [...state.questions, ...newQuestions] })),
      removeQuestions: (ids) => set((state) => ({ questions: state.questions.filter(q => !ids.includes(q.id)) })),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
      setCurrentContextQuestion: (q) => set({ currentContextQuestion: q }),
    }),
    {
      name: 'deltascript-storage',
      partialize: (state) => ({ questions: state.questions, user: state.user }),
    }
  )
);
