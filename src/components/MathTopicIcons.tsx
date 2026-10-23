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
  'linear-equation': symbol('ax+b', 12),
  'quadratic-equation': symbol('ax²', 19),
  'equation-system': (
    <>
      <path d="M10 3H7v9l-3 4 3 4v9h3M15 10h14M15 22h14" />
      <circle cx="21" cy="10" r="2" />
      <circle cx="25" cy="22" r="2" />
    </>
  ),
  inequality: (
    <>
      <path d="m19 5-11 7 11 7M7 26h19" />
      <circle cx="25" cy="11" r="2" fill="currentColor" />
    </>
  ),
  proportion: (
    <>
      <path d="M2 15h9M21 15h9M14 12h4M14 19h4" />
      <text x="6" y="11" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle">
        a
      </text>
      <text x="6" y="27" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle">
        b
      </text>
      <text x="26" y="11" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle">
        c
      </text>
      <text x="26" y="27" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle">
        d
      </text>
    </>
  ),
  'difference-squares': (
    <>
      <path d="M3 3h26v26H3ZM3 15h14V3M17 15h12M17 15v14" />
      <path d="M17 15h12v14H17Z" fill="currentColor" opacity=".16" />
    </>
  ),
  'sum-cubes': (
    <>
      <path d="m9 3 7 4v9l-7 4-7-4V7ZM2 7l7 4 7-4M9 11v9m14-8 7 4v9l-7 4-7-4v-9ZM16 16l7 4 7-4M23 20v9M22 3v6M19 6h6" />
    </>
  ),
  product: (
    <>
      <path d="M5 5h22M10 5v22M22 5v22" />
      <path d="M7 27h6M19 27h6" />
    </>
  ),
  interval: (
    <>
      <path d="M3 16h26M8 9v14M24 9v14M8 16h16" />
      <circle cx="8" cy="16" r="3" fill="currentColor" />
      <circle cx="24" cy="16" r="3" fill="white" />
    </>
  ),
  'scientific-notation': symbol('10ⁿ', 23),
  'negative-power': symbol('x⁻¹', 23),
  'repeating-decimal': (
    <>
      {symbol('0,3', 21)}
      <path d="M21 4h6" />
    </>
  ),
  'natural-numbers': symbol('ℕ', 29),
  integers: symbol('ℤ', 29),
  'rational-numbers': symbol('ℚ', 29),
  'real-numbers': symbol('ℝ', 29),
  'set-union': <path d="M6 5v13a10 10 0 0 0 20 0V5" />,
  'set-intersection': <path d="M6 27V14a10 10 0 0 1 20 0v13" />,
  'empty-set': (
    <>
      <circle cx="16" cy="16" r="10" />
      <path d="M27 3 5 29" />
    </>
  ),
  subset: (
    <>
      <path d="M26 6H15a10 10 0 0 0 0 20h11M6 30h20" />
    </>
  ),
  'angle-bisector': (
    <>
      <path d="M29 27H4L24 4M4 27l25-13M16 27a12 12 0 0 0-4-9" />
      <path d="m17 23 2 2m-2-8 2 2" />
    </>
  ),
  'triangle-median': (
    <>
      <path d="M16 3 3 28h26ZM16 3v25M8 26v4M23 26v4" />
      <circle cx="16" cy="28" r="2" fill="currentColor" />
    </>
  ),
  'triangle-altitude': (
    <>
      <path d="M11 3 3 28h26ZM11 3v25M11 22h6v6" />
      <path d="M11 8v13" strokeDasharray="2 3" />
    </>
  ),
  tangent: (
    <>
      <circle cx="16" cy="13" r="10" />
      <path d="M2 23h28M16 13v10M16 18h5v5" />
      <circle cx="16" cy="23" r="2" fill="currentColor" />
    </>
  ),
  chord: (
    <>
      <circle cx="16" cy="16" r="13" />
      <path d="M5 23h22" />
      <circle cx="5" cy="23" r="2" fill="currentColor" />
      <circle cx="27" cy="23" r="2" fill="currentColor" />
    </>
  ),
  sector: (
    <>
      <circle cx="16" cy="16" r="13" />
      <path d="M16 3v13h13A13 13 0 0 0 16 3Z" fill="currentColor" opacity=".18" />
      <path d="M16 3v13h13" />
    </>
  ),
  arc: (
    <>
      <circle cx="16" cy="16" r="12" opacity=".35" />
      <path d="M5.6 10a12 12 0 0 1 20.8 0" strokeWidth="4" />
      <path d="m8 25 8-9 8 9" />
    </>
  ),
  diameter: (
    <>
      <circle cx="16" cy="16" r="13" />
      <path d="M3 16h26" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </>
  ),
  radius: (
    <>
      <circle cx="16" cy="16" r="13" />
      <path d="M16 16 25 7" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      <text x="19" y="10" fontSize="10" fill="currentColor" stroke="none">
        r
      </text>
    </>
  ),
  pythagoras: (
    <>
      <path d="M4 5v23h24ZM4 22h6v6" />
      <text x="14" y="10" fontSize="10" fill="currentColor" stroke="none">
        c²
      </text>
    </>
  ),
  'similar-triangles': (
    <>
      <path d="M2 4v13h12ZM17 8v20h13Z" />
      <path d="M17 23h5v5M2 13h4v4" />
    </>
  ),
  'congruent-triangles': (
    <>
      <path d="M2 3v17h12ZM18 12v17h12ZM3 10h4m12 9h4M7 17l3-3m13 12 3-3" />
    </>
  ),
  'cyclic-quadrilateral': (
    <>
      <circle cx="16" cy="16" r="13" />
      <path d="m8 6 17 1 3 14-22 4Z" />
    </>
  ),
  pentagon: <path d="m16 3 13 10-5 15H8L3 13Z" />,
  hexagon: (
    <>
      <path d="m9 4 14 0 7 12-7 12H9L2 16Z" />
      <path d="M9 4 23 28M23 4 9 28M2 16h28" opacity=".35" />
    </>
  ),
  pyramid: (
    <>
      <path d="m16 2 14 22-14 6L2 24ZM16 2v28" />
      <path d="m2 24 14-7 14 7M16 2v15" strokeDasharray="2 3" />
    </>
  ),
  'triangular-prism': (
    <>
      <path d="m3 12 9-10 17 8v20L3 22ZM3 12l26 8M12 2v10l17 8M29 20v10M12 12 3 22" />
    </>
  ),
  volume: (
    <>
      <path d="m16 3 12 6v15l-12 6-12-6V9ZM4 9l12 6 12-6M16 15v15" />
      <text x="9" y="25" fontSize="11" fill="currentColor" stroke="none">
        V
      </text>
    </>
  ),
  'surface-area': (
    <>
      <path d="M11 2h10v9h9v10h-9v9H11v-9H2V11h9ZM11 11h10v10H11Z" />
      <path d="M11 11h10v10H11Z" fill="currentColor" opacity=".18" />
    </>
  ),
  'pie-chart': (
    <>
      <path d="M14 3a13 13 0 1 0 15 15H14ZM18 2v12h12A12 12 0 0 0 18 2Z" />
      <path d="M18 2v12h12A12 12 0 0 0 18 2Z" fill="currentColor" opacity=".16" />
    </>
  ),
  'bar-chart': (
    <>
      <path d="M3 3v26h27M7 18h4v11H7ZM16 10h4v19h-4ZM25 4h4v25h-4Z" />
    </>
  ),
  histogram: (
    <>
      <path d="M3 3v26h27M6 20h7v9M13 11h7v18M20 5h7v24" />
      <path d="M6 20h7v9H6ZM13 11h7v18h-7ZM20 5h7v24h-7Z" fill="currentColor" opacity=".12" />
    </>
  ),
  mean: (
    <>
      {symbol('x', 28)}
      <path d="M9 4h15" />
    </>
  ),
  median: (
    <>
      <path d="M3 24h26M7 21V11M12 21V7M21 21V10M26 21V5M16 3v24" strokeDasharray="2 3" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </>
  ),
  'probability-tree': (
    <>
      <path d="m5 16 12-8 10-4M17 8l10 8M5 16l12 8 10-4M17 24l10 5" />
      {[
        [5, 16],
        [17, 8],
        [17, 24],
        [27, 4],
        [27, 16],
        [27, 20],
        [27, 29],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="currentColor" />
      ))}
    </>
  ),
  coin: (
    <>
      <circle cx="16" cy="16" r="13" />
      <circle cx="16" cy="16" r="9" opacity=".45" />
      {symbol('₫', 20)}
    </>
  ),
  'playing-cards': (
    <>
      <rect x="8" y="3" width="20" height="26" rx="3" />
      <path d="M5 6H3v23h2m13-20 6 7-6 7-6-7Z" fill="currentColor" opacity=".6" />
    </>
  ),
  speed: (
    <>
      <path d="M4 26a13 13 0 1 1 24 0M7 22h4M9 10l3 3M16 5v5M25 10l-3 3M16 20l10-5" />
      <circle cx="16" cy="20" r="3" fill="currentColor" />
    </>
  ),
  'work-rate': (
    <>
      <circle cx="12" cy="13" r="9" />
      <path d="M12 7v6l4 3M23 15v14m-4-10 4-4 4 4M5 27h12" />
    </>
  ),
  'compound-interest': (
    <>
      <path d="M3 27h26M6 23V16h5v7M15 23V12h5v11M24 23V6h5v17M4 11 13 7l5 1 9-6m-5 0h5v5" />
    </>
  ),
} satisfies Partial<Record<TopicIcon, ReactNode>>;
