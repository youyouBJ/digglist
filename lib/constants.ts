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
  // Sky & cyan
  "#4a9ec9", "#3a8ab8", "#62b0d8",
  // Blues & slate
  "#5272a0", "#3a5a9a", "#7090b8",
  // Purples
  "#8b6fd4", "#7058c8", "#a882e0",
  // Roses
  "#c94a7d", "#b83870", "#d85e90",
  // Ambers
  "#c9a24a", "#b88c38", "#d8b45e",
  // Terracotta
  "#c96a4a", "#b85838", "#d87e5e",
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
