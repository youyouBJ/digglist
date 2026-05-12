import { supabase } from "./supabase";
import type { MixSet, MixSetWithCount, Track } from "./types";
import { toTrack, type TrackRow } from "./supabase-tracks";

export type { MixSet, MixSetWithCount } from "./types";

type SetRow = {
  id:         string;
  user_id:    string;
  title:      string;
  source_url: string | null;
  platform:   string | null;
  cover_url:  string | null;
  notes:      string;
  created_at: string;
};

function toMixSet(row: SetRow): MixSet {
  return {
    id:        row.id,
    userId:    row.user_id,
    title:     row.title,
    sourceUrl: row.source_url,
    platform:  row.platform,
    coverUrl:  row.cover_url,
    notes:     row.notes,
    createdAt: row.created_at,
  };
}

export async function getSets(): Promise<MixSetWithCount[]> {
  const [setsRes, countsRes] = await Promise.all([
    supabase.from("sets").select("*").order("created_at", { ascending: false }),
    supabase.from("tracks").select("set_id").not("set_id", "is", null),
  ]);

  if (setsRes.error)   throw new Error(setsRes.error.message);
  if (countsRes.error) throw new Error(countsRes.error.message);

  const countMap: Record<string, number> = {};
  for (const row of (countsRes.data as { set_id: string }[])) {
    countMap[row.set_id] = (countMap[row.set_id] ?? 0) + 1;
  }

  return (setsRes.data as SetRow[]).map((row) => ({
    ...toMixSet(row),
    momentCount: countMap[row.id] ?? 0,
  }));
}

export async function getSetById(id: string): Promise<MixSet | null> {
  const { data, error } = await supabase
    .from("sets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return toMixSet(data as SetRow);
}

export async function createSet(input: {
  title:     string;
  sourceUrl: string | null;
  platform:  string | null;
  coverUrl:  string | null;
  notes:     string;
}): Promise<MixSet> {
  const { data, error } = await supabase
    .from("sets")
    .insert({
      title:      input.title,
      source_url: input.sourceUrl,
      platform:   input.platform,
      cover_url:  input.coverUrl,
      notes:      input.notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toMixSet(data as SetRow);
}

export async function updateSet(
  id: string,
  patch: Partial<{
    title:     string;
    sourceUrl: string | null;
    platform:  string | null;
    coverUrl:  string | null;
    notes:     string;
  }>
): Promise<void> {
  const update: Partial<Record<string, unknown>> = {};
  if (patch.title     !== undefined) update.title      = patch.title;
  if (patch.sourceUrl !== undefined) update.source_url = patch.sourceUrl;
  if (patch.platform  !== undefined) update.platform   = patch.platform;
  if (patch.coverUrl  !== undefined) update.cover_url  = patch.coverUrl;
  if (patch.notes     !== undefined) update.notes      = patch.notes;

  const { error } = await supabase.from("sets").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from("sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getSetTracks(setId: string): Promise<Track[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("set_id", setId);

  if (error) throw new Error(error.message);

  const tracks = (data as TrackRow[]).map(toTrack);
  return tracks.sort((a, b) => {
    if (a.sourceTimestamp === null) return 1;
    if (b.sourceTimestamp === null) return -1;
    return a.sourceTimestamp - b.sourceTimestamp;
  });
}
