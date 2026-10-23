export const topicIcons = [
  'topics',
  'radical',
  'equation',
  'function',
  'geometry',
  'circle',
  'chart',
  'cone',
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'equals',
  'not-equal',
  'plus-minus',
  'less-than',
  'greater-than',
  'less-equal',
  'greater-equal',
  'fraction',
  'ratio',
  'percent',
  'pi',
  'square-power',
  'cube-power',
  'cube-root',
  'absolute',
  'number-line',
  'coordinates',
  'linear-graph',
  'square',
  'rectangle',
  'parallelogram',
  'rhombus',
  'trapezoid',
  'right-triangle',
  'isosceles-triangle',
  'equilateral-triangle',
  'angle',
  'perpendicular',
  'parallel',
  'compass',
  'protractor',
  'ruler',
  'cube',
  'cuboid',
  'cylinder',
  'sphere',
  'probability-dice',
  'venn',
] as const;
export type TopicIcon = (typeof topicIcons)[number];
export type ContentColor = 'blue' | 'red' | 'yellow';
export interface TopicSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: TopicIcon;
  color: ContentColor;
  position: number;
  published: boolean;
  questionCount: number;
  version: number;
}
export interface ManagedTopic extends TopicSummary {
  theory: string;
  preamble: string;
  examples: string;
  examplesPreamble: string;
}
export type StudentTabKey = 'topics' | 'exam' | 'guide';
export interface StudentTab {
  key: StudentTabKey;
  label: string;
  description: string;
  visible: boolean;
}
export interface StudentSettings {
  version: number;
  heroTitle: string;
  heroSubtitle: string;
  heroIntro: string;
  topicsIntro: string;
  guideTitle: string;
  guideContent: string;
  tabs: StudentTab[];
}
export const defaultStudentSettings: StudentSettings = {
  version: 1,
  heroTitle: 'Không gian học tập',
  heroSubtitle: 'Của bạn. Theo cách của bạn.',
  heroIntro: 'Vững kiến thức hôm nay. Tự tin cho những bước tiếp theo.',
  topicsIntro: 'Chọn chuyên đề bạn muốn luyện tập hôm nay.',
  guideTitle: 'Góc học tập',
  guideContent: '',
  tabs: [
    { key: 'topics', label: 'Chuyên đề', description: 'Học theo chuyên đề', visible: true },
    { key: 'exam', label: 'Tạo đề thi', description: 'Thử sức, bứt phá', visible: true },
    { key: 'guide', label: 'Góc học tập', description: 'Bài học và hướng dẫn', visible: true },
  ],
};
