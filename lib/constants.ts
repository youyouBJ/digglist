export const PLATFORMS = [
  "YouTube",
  "SoundCloud",
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
  "To listen":  "bg-blue-500/15 text-blue-300",
  "To buy":     "bg-yellow-500/15 text-yellow-300",
  "To play":    "bg-green-500/15 text-green-300",
  "Inspiration":"bg-purple-500/15 text-purple-300",
  "IDs Needed": "bg-orange-500/15 text-orange-300",
};

export const STATUS_COLOR_DEFAULT = "bg-white/10 text-white/50";

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as Status] ?? STATUS_COLOR_DEFAULT;
}

import type { TrackFormState } from "./types";

export const EMPTY_TRACK_FORM: TrackFormState = {
  title:    "",
  artist:   "",
  platform: "YouTube",
  url:      "",
  imageUrl: "",
  genre:    "",
  mood:     "",
  status:   "To listen",
  notes:    "",
};
