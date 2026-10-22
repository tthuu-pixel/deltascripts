import type { ReactNode } from 'react';

const paths = {
  topics: (
    <>
      <path fill="currentColor" opacity=".13" d="M5 5h9v9H5zm13 13h9v9h-9z" />
      <rect x="4" y="4" width="10" height="10" rx="3" />
      <rect x="18" y="18" width="10" height="10" rx="3" />
      <path d="M18 9h10M23 4v10M4 23h10" />
    </>
  ),
  practice: (
    <>
      <path fill="currentColor" opacity=".13" d="M7 7h17v21H7z" />
      <path d="M20 5H7v23h18V15M18 9l7-7 5 5-12 12-5 1 1-5 4-4M22 5l5 5M11 24h9" />
    </>
  ),
  exam: (
    <>
      <path fill="currentColor" opacity=".13" d="M6 5h20v24H6z" />
      <path d="M11 4H6v25h20V4h-5M12 2h8v6h-8zM11 14h10M11 19h6M11 24h4" />
      <path d="m20 23 3 3 6-7" />
    </>
  ),
  guide: (
    <>
      <path fill="currentColor" opacity=".13" d="M16 7c-4-3-8-3-12-2v21c4-1 8-1 12 2z" />
      <path d="M16 7c-4-3-8-3-12-2v21c4-1 8-1 12 2 4-3 8-3 12-2V5c-4-1-8-1-12 2Zm0 0v21M8 11l4 1M8 16l4 1M20 12l4-1M20 17l4-1" />
    </>
  ),
  radical: (
    <>
      <path fill="currentColor" opacity=".13" d="M11 14h17v13H11z" />
      <path d="m3 17 5-3 5 12 7-22h10M22 15l6 8M28 15l-6 8" />
    </>
  ),
  equation: (
    <>
      <path d="m5 5 7 8m0-8-7 8m14-7h10m-10 5h10M4 22h9M8.5 17v10m12-9 7 9m0-9-7 9" />
      <circle cx="24" cy="8.5" r="9" fill="currentColor" opacity=".09" stroke="none" />
    </>
  ),
  function: (
    <>
      <path d="M5 4v23h23M2 8l3-4 3 4M24 24l4 3-4 3" />
      <path fill="currentColor" opacity=".13" d="M8 9q8 28 17 0v17H8z" />
      <path d="M8 9q8 28 17 0" />
    </>
  ),
  geometry: (
    <>
      <path fill="currentColor" opacity=".13" d="M4 27 13 4l15 23Z" />
      <path d="M4 27 13 4l15 23ZM13 4v23M13 22h5v5" />
      <circle cx="13" cy="4" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  circle: (
    <>
      <circle cx="16" cy="16" r="12" fill="currentColor" opacity=".1" stroke="none" />
      <circle cx="16" cy="16" r="12" />
      <path d="M5 20 16 4l11 16ZM16 4v12l11 4" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path fill="currentColor" opacity=".13" d="M5 18h5v10H5zm9-8h5v18h-5zm9-6h5v24h-5z" />
      <path d="M4 28h25M6 24v-7h4v7M15 24V10h4v14M24 24V4h4v20M4 10l6-5 7 1 6-5" />
    </>
  ),
  cone: (
    <>
      <ellipse cx="16" cy="25" rx="12" ry="5" fill="currentColor" opacity=".12" />
      <path d="M4 25 16 3l12 22M4 25c0 7 24 7 24 0M4 25c0-6 24-6 24 0" />
      <path d="M16 3v22h12" strokeDasharray="3 3" />
    </>
  ),
  spark: (
    <>
      <path fill="currentColor" opacity=".12" d="m16 3 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" />
      <path d="m16 3 4 9 9 4-9 4-4 9-4-9-9-4 9-4ZM26 2v6m-3-3h6" />
    </>
  ),
  arrow: <path d="M5 16h22m-8-8 8 8-8 8" />,
  back: <path d="M27 16H5m8-8-8 8 8 8" />,
  chevron: <path d="m12 7 9 9-9 9" />,
  user: (
    <>
      <circle cx="16" cy="10" r="5" />
      <path d="M6 28v-3c0-11 20-11 20 0v3" />
    </>
  ),
  school: (
    <>
      <path d="m3 12 13-8 13 8-13 8-13-8ZM8 16v9c4 4 12 4 16 0v-9M29 12v13" />
    </>
  ),
  key: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 12 12m-7-7 4-4m-1 7 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="6" y="13" width="20" height="15" rx="4" />
      <path d="M10 13V9a6 6 0 0 1 12 0v4M16 19v3" />
    </>
  ),
  logout: (
    <>
      <path d="M13 5H5v22h8M12 16h17m-6-6 6 6-6 6" />
    </>
  ),
  settings: (
    <>
      <path d="M5 9h22M5 23h22" />
      <circle cx="12" cy="9" r="4" fill="var(--surface,white)" />
      <circle cx="21" cy="23" r="4" fill="var(--surface,white)" />
    </>
  ),
  upload: (
    <>
      <path d="M5 22v6h22v-6M16 23V4m-7 7 7-7 7 7" />
    </>
  ),
  search: (
    <>
      <circle cx="14" cy="14" r="9" />
      <path d="m21 21 7 7" />
    </>
  ),
  close: <path d="m8 8 16 16M24 8 8 24" />,
  check: <path d="m6 16 7 7L27 8" />,
  refresh: (
    <>
      <path d="M26 13a11 11 0 1 0 0 8M26 4v9h-9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 8h24M12 4h8M8 8l1 20h14l1-20M13 13v10M19 13v10" />
    </>
  ),
  download: (
    <>
      <path d="M5 22v6h22v-6M16 4v19m-7-7 7 7 7-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 8v9l6 3" />
    </>
  ),
  info: (
    <>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 14v9m0-15v1" />
    </>
  ),
  send: (
    <>
      <path fill="currentColor" opacity=".12" d="m3 5 26 11L3 27l4-11Z" />
      <path d="m3 5 26 11L3 27l4-11Zm4 11h22" />
    </>
  ),
  eye: (
    <>
      <path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Z" />
      <circle cx="16" cy="16" r="4" />
    </>
  ),
  shield: (
    <>
      <path fill="currentColor" opacity=".12" d="m16 3 11 5v8c0 7-11 13-11 13S5 23 5 16V8Z" />
      <path d="m16 3 11 5v8c0 7-11 13-11 13S5 23 5 16V8Zm-6 13 4 4 8-9" />
    </>
  ),
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof paths;
export default function Icon({
  name,
  size = 24,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
