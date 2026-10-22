import type { ReactNode } from 'react';
import type { TopicIcon } from '../../shared/content';
const symbol = (value: string, size = 24) => (
  <text
    x="16"
    y="23"
    textAnchor="middle"
    fontFamily="Georgia,serif"
    fontSize={size}
    fill="currentColor"
    stroke="none"
  >
    {value}
  </text>
);
export const mathTopicPaths = {
  addition: <path d="M16 5v22M5 16h22" />,
  subtraction: <path d="M5 16h22" />,
  multiplication: <path d="m8 8 16 16M24 8 8 24" />,
  division: (
    <>
      <path d="M5 16h22" />
      <circle cx="16" cy="7" r="2" fill="currentColor" />
      <circle cx="16" cy="25" r="2" fill="currentColor" />
    </>
  ),
  equals: <path d="M5 11h22M5 21h22" />,
  'not-equal': <path d="M5 11h22M5 21h22M23 4 9 28" />,
  'plus-minus': <path d="M6 12h20M16 3v18M6 27h20" />,
  'less-than': <path d="m24 6-17 10 17 10" />,
  'greater-than': <path d="m8 6 17 10L8 26" />,
  'less-equal': <path d="m24 4-17 9 17 9M6 28h20" />,
  'greater-equal': <path d="m8 4 17 9-17 9M6 28h20" />,
  fraction: (
    <>
      <path d="M5 16h22M13 4l3-2v10M12 29c0-6 8-5 8-9a4 4 0 0 0-8 0M12 29h8" />
    </>
  ),
  ratio: (
    <>
      <circle cx="16" cy="9" r="2" fill="currentColor" />
      <circle cx="16" cy="23" r="2" fill="currentColor" />
      <path d="M8 4 3 16l5 12M24 4l5 12-5 12" />
    </>
  ),
  percent: (
    <>
      <path d="M25 4 7 28" />
      <circle cx="9" cy="8" r="4" />
      <circle cx="23" cy="24" r="4" />
    </>
  ),
  pi: symbol('π', 29),
  'square-power': symbol('x²'),
  'cube-power': symbol('x³'),
  'cube-root': (
    <>
      <path d="m3 19 5-3 5 12 7-23h10" />
      {
        <text x="5" y="10" fontSize="10" stroke="none" fill="currentColor">
          3
        </text>
      }
    </>
  ),
  absolute: (
    <>
      <path d="M5 4v24M27 4v24M12 11l8 10m0-10-8 10" />
    </>
  ),
  'number-line': (
    <>
      <path d="M3 16h26m-5-4 5 4-5 4M8 12v8M16 12v8M24 12v8" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </>
  ),
  coordinates: (
    <>
      <path d="M4 24h25m-5-4 5 4-5 4M10 29V3M6 8l4-5 4 5M20 21v6M7 14h6" />
      <circle cx="21" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  'linear-graph': (
    <>
      <path d="M5 4v23h24M8 24 27 5" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </>
  ),
  square: (
    <>
      <rect x="5" y="5" width="22" height="22" rx="1" />
      <path d="M5 22h5v5M14 4v3M14 25v3M4 14h3M25 14h3" />
    </>
  ),
  rectangle: (
    <>
      <rect x="3" y="8" width="26" height="17" rx="1" />
      <path d="M3 20h5v5M14 7v3M14 23v3" />
    </>
  ),
  parallelogram: (
    <>
      <path d="m10 6 19 0-7 20H3ZM8 16h16" />
      <path d="m16 14 3 2-3 2" />
    </>
  ),
  rhombus: (
    <>
      <path d="m16 3 13 13-13 13L3 16ZM16 3v26M3 16h26" />
      <path d="M16 21h5v-5" />
    </>
  ),
  trapezoid: (
    <>
      <path d="M10 7h12l7 19H3ZM12 5l3 2-3 2m0 15 3 2-3 2" />
    </>
  ),
  'right-triangle': (
    <>
      <path d="M5 4v24h23ZM5 22h6v6" />
    </>
  ),
  'isosceles-triangle': (
    <>
      <path d="M16 4 3 28h26ZM8 15l5 3m6 0 5-3" />
    </>
  ),
  'equilateral-triangle': (
    <>
      <path d="M16 4 3 27h26ZM8 14l5 3m6 0 5-3M16 24v6" />
    </>
  ),
  angle: (
    <>
      <path d="M29 26H5L24 5M17 26a12 12 0 0 0-4-9" />
    </>
  ),
  perpendicular: (
    <>
      <path d="M3 24h26M16 3v26M16 18h6v6" />
    </>
  ),
  parallel: (
    <>
      <path d="M5 7h22M5 25h22M13 3l4 4-4 4m0 10 4 4-4 4" />
    </>
  ),
  compass: (
    <>
      <circle cx="16" cy="9" r="4" />
      <path d="M16 5V2m-3 11L5 29m14-16 8 16M9 23h14M16 13l1 13" />
    </>
  ),
  protractor: (
    <>
      <path d="M3 25a13 13 0 0 1 26 0ZM7 21l3 1M8 15l3 3m5-6v5m8-2-3 3m4 3-3 1M16 25l8-12" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="9" width="26" height="14" rx="2" />
      <path d="M8 9v7m5-7v4m5-4v7m5-7v4" />
    </>
  ),
  cube: (
    <>
      <path d="m16 2 12 7v14l-12 7L4 23V9ZM4 9l12 7 12-7M16 16v14M10 5l12 7" />
    </>
  ),
  cuboid: (
    <>
      <path d="m3 9 18-5 8 6v15l-18 5-8-6ZM3 9l8 6 18-5M11 15v15M21 4v14l8 7" />
    </>
  ),
  cylinder: (
    <>
      <ellipse cx="16" cy="7" rx="11" ry="4" />
      <path d="M5 7v18c0 6 22 6 22 0V7" />
      <path d="M5 25c0-5 22-5 22 0" strokeDasharray="3 3" />
    </>
  ),
  sphere: (
    <>
      <circle cx="16" cy="16" r="13" />
      <ellipse cx="16" cy="16" rx="6" ry="13" />
      <ellipse cx="16" cy="16" rx="13" ry="5" />
    </>
  ),
  'probability-dice': (
    <>
      <rect x="4" y="4" width="24" height="24" rx="5" />
      {[
        [10, 10],
        [22, 10],
        [16, 16],
        [10, 22],
        [22, 22],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="currentColor" />
      ))}
    </>
  ),
  venn: (
    <>
      <circle cx="11" cy="16" r="9" />
      <circle cx="21" cy="16" r="9" />
      <path
        d="M16 9a9 9 0 0 1 0 14 9 9 0 0 1 0-14"
        fill="currentColor"
        opacity=".15"
        stroke="none"
      />
    </>
  ),
} satisfies Partial<Record<TopicIcon, ReactNode>>;
