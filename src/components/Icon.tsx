import type { JSX } from "solid-js";

export type IconName =
  | "compass"
  | "search"
  | "library"
  | "podcast"
  | "heart"
  | "heart-fill"
  | "star"
  | "star-fill"
  | "play"
  | "play-fill"
  | "pause"
  | "pause-fill"
  | "skip-back"
  | "skip-forward"
  | "prev"
  | "next"
  | "shuffle"
  | "repeat"
  | "repeat-one"
  | "volume"
  | "volume-mute"
  | "queue"
  | "lyrics"
  | "expand"
  | "collapse"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "more"
  | "more-vertical"
  | "plus"
  | "check"
  | "settings"
  | "user"
  | "download"
  | "share"
  | "comment"
  | "clock"
  | "cast"
  | "sparkles"
  | "home"
  | "grid"
  | "sort"
  | "trash"
  | "edit"
  | "disc"
  | "music"
  | "minimize"
  | "maximize"
  | "close"
  | "pin"
  | "arrow-left"
  | "arrow-right"
  | "sun"
  | "moon"
  | "sliders"
  | "headphones"
  | "waves"
  | "command"
  | "refresh";

const paths: Record<IconName, () => JSX.Element> = {
  compass: () => (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8 4.8-2Z" />
    </>
  ),
  search: () => (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m20 20-3.4-3.4" />
    </>
  ),
  library: () => (
    <>
      <rect x="4" y="5" width="4.4" height="14" rx="1.6" />
      <rect x="10.4" y="5" width="4.4" height="14" rx="1.6" />
      <path d="m17.5 6.2 3.2 12.4" />
    </>
  ),
  podcast: () => (
    <>
      <rect x="9" y="3.5" width="6" height="10.5" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </>
  ),
  heart: () => <path d="M20.4 5.9a5.2 5.2 0 0 0-7.4 0L12 7l-1-1.1a5.2 5.2 0 1 0-7.4 7.4L12 21l8.4-7.7a5.2 5.2 0 0 0 0-7.4Z" />,
  "heart-fill": () => <path d="M20.4 5.9a5.2 5.2 0 0 0-7.4 0L12 7l-1-1.1a5.2 5.2 0 1 0-7.4 7.4L12 21l8.4-7.7a5.2 5.2 0 0 0 0-7.4Z" />,
  star: () => <path d="m12 3.4 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.9L12 3.4Z" />,
  "star-fill": () => <path d="m12 3.4 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.9L12 3.4Z" />,
  play: () => <path d="M8 5.5v13l10-6.5L8 5.5Z" />,
  "play-fill": () => <path d="M8 5.2c0-.9 1-1.4 1.7-.9l9.1 6.8c.6.5.6 1.4 0 1.9l-9.1 6.8c-.7.5-1.7 0-1.7-.9V5.2Z" />,
  pause: () => (
    <>
      <rect x="7" y="5" width="3.4" height="14" rx="1.2" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1.2" />
    </>
  ),
  "pause-fill": () => (
    <>
      <rect x="6.6" y="4.8" width="3.7" height="14.4" rx="1.5" />
      <rect x="13.7" y="4.8" width="3.7" height="14.4" rx="1.5" />
    </>
  ),
  "skip-back": () => (
    <>
      <path d="M18 6.5v11L9 12l9-5.5Z" />
      <path d="M5.5 5.5v13" />
    </>
  ),
  "skip-forward": () => (
    <>
      <path d="M6 6.5v11L15 12 6 6.5Z" />
      <path d="M18.5 5.5v13" />
    </>
  ),
  prev: () => (
    <>
      <path d="M17 6.5v11L8 12l9-5.5Z" />
      <path d="M6.5 5.5v13" />
    </>
  ),
  next: () => (
    <>
      <path d="M7 6.5v11L16 12 7 6.5Z" />
      <path d="M17.5 5.5v13" />
    </>
  ),
  shuffle: () => (
    <>
      <path d="M4 7h3.2c4.8 0 5.2 10 10 10H20" />
      <path d="M4 17h3.2c1.6 0 2.7-1.1 3.7-2.6M14.5 7H20" />
      <path d="m17.5 4.5 2.5 2.5-2.5 2.5M17.5 14.5l2.5 2.5-2.5 2.5" />
    </>
  ),
  repeat: () => (
    <>
      <path d="M6.5 7.5h9.3A3.2 3.2 0 0 1 19 10.7v1.1" />
      <path d="M17.5 4.5 20.5 7.5 17.5 10.5" />
      <path d="M17.5 16.5H8.2A3.2 3.2 0 0 1 5 13.3v-1.1" />
      <path d="M6.5 10.5 3.5 13.5 6.5 16.5" />
    </>
  ),
  "repeat-one": () => (
    <>
      <path d="M6.5 7.5h9.3A3.2 3.2 0 0 1 19 10.7v1.1" />
      <path d="M17.5 4.5 20.5 7.5 17.5 10.5" />
      <path d="M17.5 16.5H8.2A3.2 3.2 0 0 1 5 13.3v-1.1" />
      <path d="M6.5 10.5 3.5 13.5 6.5 16.5" />
      <path d="M11.4 10.3h1.2v3.4M11.4 13.7h1.8" />
    </>
  ),
  volume: () => (
    <>
      <path d="M4 9.5v5h3.3L12 19V5L7.3 9.5H4Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.2 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  "volume-mute": () => (
    <>
      <path d="M4 9.5v5h3.3L12 19V5L7.3 9.5H4Z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </>
  ),
  queue: () => (
    <>
      <path d="M4 6.5h12M4 12h9M4 17.5h7" />
      <path d="M17.5 14.5v6l4-3-4-3Z" />
    </>
  ),
  lyrics: () => (
    <>
      <path d="M4.5 6.5h15v8h-6.2L9 18.5v-4H4.5v-8Z" />
      <path d="M8 9.5h8M8 12.2h5" />
    </>
  ),
  expand: () => (
    <>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </>
  ),
  collapse: () => (
    <>
      <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />
    </>
  ),
  "chevron-down": () => <path d="m6 9 6 6 6-6" />,
  "chevron-left": () => <path d="m15 5-7 7 7 7" />,
  "chevron-right": () => <path d="m9 5 7 7-7 7" />,
  more: () => (
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  "more-vertical": () => (
    <>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  plus: () => <path d="M12 5v14M5 12h14" />,
  check: () => <path d="m5 12.5 4.2 4.2L19 7" />,
  settings: () => (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.8 7.8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.8 7.8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z" />
    </>
  ),
  user: () => (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  download: () => (
    <>
      <path d="M12 4v10M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </>
  ),
  share: () => (
    <>
      <circle cx="18" cy="5.5" r="2.3" />
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="18.5" r="2.3" />
      <path d="m8 10.9 7.8-4.2M8 13.1l7.8 4.2" />
    </>
  ),
  comment: () => (
    <>
      <path d="M4.5 5.5h15v10h-7l-4 4v-4H4.5v-10Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  cast: () => (
    <>
      <path d="M4 17.5V20M4 13a7 7 0 0 1 7 7M4 8.5a11.5 11.5 0 0 1 11.5 11.5" />
      <path d="M4 5h16v15h-5" />
    </>
  ),
  sparkles: () => (
    <>
      <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    </>
  ),
  home: () => <path d="m4 10 8-6 8 6v10H4V10Z" />,
  grid: () => (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </>
  ),
  sort: () => <path d="M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3" />,
  trash: () => (
    <>
      <path d="M4.5 7h15M9 7V4.5h6V7M7 7l1 13h8l1-13M10 10.5v6M14 10.5v6" />
    </>
  ),
  edit: () => <path d="M4 20h4.5L20 8.5 15.5 4 4 15.5V20ZM13.5 6l4.5 4.5" />,
  disc: () => (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </>
  ),
  music: () => (
    <>
      <path d="M9 18V5.5l10-2v12" />
      <circle cx="6.4" cy="18" r="2.6" />
      <circle cx="16.4" cy="15.5" r="2.6" />
    </>
  ),
  minimize: () => <path d="M5 12h14" />,
  maximize: () => <rect x="5" y="5" width="14" height="14" rx="1.5" />,
  close: () => <path d="m6 6 12 12M18 6 6 18" />,
  pin: () => <path d="m9 3 6 2-1.2 5.2 3 3-2.2 2.2-3-3L6.5 16 4 13.5l5.8-5L9 3Z" />,
  "arrow-left": () => <path d="M20 12H4M10 6l-6 6 6 6" />,
  "arrow-right": () => <path d="M4 12h16M14 6l6 6-6 6" />,
  sun: () => (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  moon: () => <path d="M20 14.2A8.5 8.5 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />,
  sliders: () => (
    <>
      <path d="M4 7h6M14 7h6M4 17h10M18 17h2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  headphones: () => (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="13" width="4.5" height="7" rx="2" />
      <rect x="16.5" y="13" width="4.5" height="7" rx="2" />
    </>
  ),
  waves: () => <path d="M3 12c3-6 6-6 9 0s6 6 9 0M3 17c3-6 6-6 9 0s6 6 9 0" />,
  command: () => <path d="M9 9h6v6H9V9ZM9 9a3 3 0 1 0-3-3v3h3ZM15 9V6a3 3 0 1 1 3 3h-3ZM9 15H6a3 3 0 1 0 3 3v-3ZM15 15h3a3 3 0 1 1-3 3v-3Z" />,
  refresh: () => (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>
  ),
};

export function Icon(props: {
  name: IconName;
  size?: number;
  class?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  const filled = () => props.filled || props.name.endsWith("-fill");
  return (
    <svg
      class={props.class}
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill={filled() ? "currentColor" : "none"}
      stroke={filled() ? "none" : "currentColor"}
      stroke-width={props.strokeWidth ?? 1.75}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {paths[props.name]()}
    </svg>
  );
}
