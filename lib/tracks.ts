export type Track = {
  id: string;
  title: string;
  artist: string;
  sourcePlatform: string;
  sourceUrl: string;
  genre: string;
  mood: string;
  status: string;
  notes: string;
  createdAt: string;
};

const STORAGE_KEY = "digglist_tracks";

export function getTracks(): Track[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getTrackById(id: string): Track | undefined {
  return getTracks().find((t) => t.id === id);
}

export function saveTrack(track: Omit<Track, "id" | "createdAt">): Track {
  const newTrack: Track = {
    ...track,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newTrack, ...getTracks()]));
  return newTrack;
}

export function updateTrack(id: string, patch: Omit<Track, "id" | "createdAt">): void {
  const tracks = getTracks().map((t) =>
    t.id === id ? { ...t, ...patch } : t
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

export function deleteTrack(id: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(getTracks().filter((t) => t.id !== id))
  );
}
