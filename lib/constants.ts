export const PLATFORMS = [
  "YouTube",
  "SoundCloud",
  "Spotify",
  "Bandcamp",
  "Discogs",
  "TikTok",
  "Instagram",
  "Other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = [
  "To listen",
  "To buy",
  "To play",
  "Inspiration",
  "IDs Needed",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_COLORS: Record<Status, string> = {
  "To listen":  "bg-blue-500/10 text-blue-300",
  "To buy":     "bg-yellow-500/10 text-yellow-300",
  "To play":    "bg-green-500/10 text-green-300",
  "Inspiration":"bg-purple-500/10 text-purple-300",
  "IDs Needed": "bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber-rule)]",
};

export const STATUS_COLOR_DEFAULT = "bg-white/10 text-white/50";

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as Status] ?? STATUS_COLOR_DEFAULT;
}

import type { TrackFormState } from "./types";

export const CRATE_COLORS = [
  // Teals
  "#3d9e87", "#2e8a74", "#4dbfaa",
  // Greens
  "#6ac97d", "#4ab865", "#85d498",
  // Sage & olive
  "#7a9e4a", "#668a38", "#90b45c",
  // Sky & cyan
  "#4a9ec9", "#3a8ab8", "#62b0d8",
  // Blues
  "#5272a0", "#3a5a9a", "#7090b8",
  // Navy & midnight
  "#2e4a8a", "#243b73", "#3e5aa0",
  // Slate & cool gray
  "#5a7080", "#4a5e6e", "#6e8494",
  // Purples
  "#8b6fd4", "#7058c8", "#a882e0",
  // Roses
  "#c94a7d", "#b83870", "#d85e90",
  // Crimson
  "#c94a4a", "#b83838", "#d86262",
  // Ambers
  "#c9a24a", "#b88c38", "#d8b45e",
  // Terracotta
  "#c96a4a", "#b85838", "#d87e5e",
] as const;

type PatternStyle = { backgroundImage?: string; backgroundSize?: string };

export function getPatternStyle(pattern: string): PatternStyle {
  const pct = encodeURIComponent;
  const svg = (w: number, h: number, content: string): PatternStyle => ({
    backgroundImage: `url("data:image/svg+xml,${pct(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${content}</svg>`)}")`,
    backgroundSize:  `${w}px ${h}px`,
  });
  switch (pattern) {
    case "dots":     return svg(8,  8,  `<circle cx='4' cy='4' r='1.2' fill='white' fill-opacity='0.20'/>`);
    case "lines":    return svg(8,  6,  `<line x1='0' y1='0.5' x2='8' y2='0.5' stroke='white' stroke-opacity='0.16' stroke-width='1'/>`);
    case "diagonal": return svg(8,  8,  `<line x1='0' y1='8' x2='8' y2='0' stroke='white' stroke-opacity='0.16' stroke-width='1'/>`);
    case "grid":     return svg(8,  8,  `<path d='M 8 0 L 0 0 0 8' fill='none' stroke='white' stroke-opacity='0.13' stroke-width='0.5'/>`);
    case "rings":    return svg(16, 16, `<circle cx='8' cy='8' r='5.5' fill='none' stroke='white' stroke-opacity='0.17' stroke-width='0.8'/>`);
    case "cross":    return svg(12, 12, `<path d='M 6 2 L 6 10 M 2 6 L 10 6' stroke='white' stroke-opacity='0.17' stroke-width='0.8' stroke-linecap='round'/>`);
    default:         return {};
  }
}

export const CRATE_PATTERNS = [
  { id: "",          label: "None"     },
  { id: "dots",      label: "Dots"     },
  { id: "lines",     label: "Lines"    },
  { id: "diagonal",  label: "Diagonal" },
  { id: "grid",      label: "Grid"     },
  { id: "rings",     label: "Rings"    },
  { id: "cross",     label: "Cross"    },
] as const;

export const EMPTY_TRACK_FORM: TrackFormState = {
  title:    "",
  artist:   "",
  label:    "",
  platform: "YouTube",
  url:      "",
  imageUrl: "",
  genre:    "",
  mood:     "",
  status:   "To listen",
  notes:    "",
};
