import { studyGuideContent } from './studyGuide';
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
  'linear-equation',
  'quadratic-equation',
  'equation-system',
  'inequality',
  'proportion',
  'difference-squares',
  'sum-cubes',
  'product',
  'interval',
  'scientific-notation',
  'negative-power',
  'repeating-decimal',
  'natural-numbers',
  'integers',
  'rational-numbers',
  'real-numbers',
  'set-union',
  'set-intersection',
  'empty-set',
  'subset',
  'angle-bisector',
  'triangle-median',
  'triangle-altitude',
  'tangent',
  'chord',
  'sector',
  'arc',
  'diameter',
  'radius',
  'pythagoras',
  'similar-triangles',
  'congruent-triangles',
  'cyclic-quadrilateral',
  'pentagon',
  'hexagon',
  'pyramid',
  'triangular-prism',
  'volume',
  'surface-area',
  'pie-chart',
  'bar-chart',
  'histogram',
  'mean',
  'median',
  'probability-tree',
  'coin',
  'playing-cards',
  'speed',
  'work-rate',
  'compound-interest',
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
  guideContent: studyGuideContent,
  tabs: [
    { key: 'topics', label: 'Chuyên đề', description: 'Học theo chuyên đề', visible: true },
    { key: 'exam', label: 'Tạo đề thi', description: 'Thử sức, bứt phá', visible: true },
    { key: 'guide', label: 'Góc học tập', description: 'Bài học và hướng dẫn', visible: true },
  ],
};
