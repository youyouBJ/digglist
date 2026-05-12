import { supabase } from "./supabase";
import type { Track } from "./types";

export type { Track } from "./types";

export type TrackRow = {
  id: string;
  title: string;
  artist: string;
  source_platform: string;
  source_url: string;
  image_url: string;
  genre: string;
  mood: string;
  status: string;
  notes: string;
  source_timestamp: number | null;
  created_at: string;
};

export function toTrack(row: TrackRow): Track {
  return {
    id:              row.id,
    title:           row.title,
    artist:          row.artist,
    sourcePlatform:  row.source_platform,
    sourceUrl:       row.source_url,
    imageUrl:        row.image_url,
    genre:           row.genre,
    mood:            row.mood,
    status:          row.status,
    notes:           row.notes,
    sourceTimestamp: row.source_timestamp ?? null,
    createdAt:       row.created_at,
  };
}

function toRow(data: Omit<Track, "id" | "createdAt">) {
  return {
    title:            data.title,
    artist:           data.artist,
    source_platform:  data.sourcePlatform,
    source_url:       data.sourceUrl,
    image_url:        data.imageUrl,
    genre:            data.genre,
    mood:             data.mood,
    status:           data.status,
    notes:            data.notes,
    source_timestamp: data.sourceTimestamp ?? null,
  };
}

export async function getTracks(): Promise<Track[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TrackRow[]).map(toTrack);
}

export async function getTrackById(id: string): Promise<Track | null> {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return toTrack(data as TrackRow);
}

export async function createTrack(
  track: Omit<Track, "id" | "createdAt">
): Promise<Track> {
  const { data, error } = await supabase
    .from("tracks")
    .insert(toRow(track))
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toTrack(data as TrackRow);
}

export async function updateTrack(
  id: string,
  patch: Omit<Track, "id" | "createdAt">
): Promise<void> {
  const { error } = await supabase
    .from("tracks")
    .update(toRow(patch))
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTrack(id: string): Promise<void> {
  const { error } = await supabase.from("tracks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
