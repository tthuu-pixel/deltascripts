export interface ExamSlot {
  position: number;
  description: string;
  topicIds: string[];
}
export interface ExamSettings {
  version: number;
  slots: ExamSlot[];
}
export const emptyExamSlots = (): ExamSlot[] =>
  Array.from({ length: 7 }, (_, index) => ({ position: index + 1, description: '', topicIds: [] }));
