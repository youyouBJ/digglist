import { supabase } from "./supabase";
import type { Crate, CrateWithCount, Track } from "./types";
import { toTrack, type TrackRow } from "./supabase-tracks";

export type { Crate, CrateWithCount } from "./types";

type CrateRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  parent_id: string | null;
  position: number;
  created_at: string;
};

function toCrate(row: CrateRow): Crate {
  return {
    id:          row.id,
    userId:      row.user_id,
    name:        row.name,
    description: row.description,
    color:       row.color,
    parentId:    row.parent_id,
    position:    row.position,
    createdAt:   row.created_at,
  };
}

/* ─── Crate CRUD ─────────────────────────────────────────────────────────── */

export async function getCrates(): Promise<CrateWithCount[]> {
  const { data, error } = await supabase
    .from("crates")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  const crates = (data as CrateRow[]).map(toCrate);
  if (crates.length === 0) return [];

  const { data: ctData, error: ctError } = await supabase
    .from("crate_tracks")
    .select("crate_id");
  if (ctError) throw new Error(ctError.message);

  const countMap: Record<string, number> = {};
  for (const { crate_id } of ctData as { crate_id: string }[]) {
    countMap[crate_id] = (countMap[crate_id] ?? 0) + 1;
  }
  return crates.map((c) => ({ ...c, trackCount: countMap[c.id] ?? 0 }));
}

export async function getCrateById(id: string): Promise<Crate | null> {
  const { data, error } = await supabase
    .from("crates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return toCrate(data as CrateRow);
}

export async function createCrate(input: {
  name: string;
  description?: string;
  color?: string;
  parentId?: string | null;
  position?: number;
}): Promise<Crate> {
  const { data, error } = await supabase
    .from("crates")
    .insert({
      name:        input.name,
      description: input.description ?? "",
      color:       input.color ?? "#3d9e87",
      parent_id:   input.parentId ?? null,
      position:    input.position ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCrate(data as CrateRow);
}

export async function updateCrate(
  id: string,
  patch: {
    name?: string;
    description?: string;
    color?: string;
    parentId?: string | null;
    position?: number;
  }
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name        !== undefined) update.name        = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.color       !== undefined) update.color       = patch.color;
  if (patch.parentId    !== undefined) update.parent_id   = patch.parentId;
  if (patch.position    !== undefined) update.position    = patch.position;

  const { error } = await supabase.from("crates").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCrate(id: string): Promise<void> {
  const { error } = await supabase.from("crates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ─── Crate ↔ Track relations ────────────────────────────────────────────── */

export async function getCrateTracks(crateId: string): Promise<Track[]> {
  const { data: ctData, error: ctError } = await supabase
    .from("crate_tracks")
    .select("track_id, position")
    .eq("crate_id", crateId)
    .order("position", { ascending: true });

  if (ctError) throw new Error(ctError.message);
  if (!ctData || ctData.length === 0) return [];

  const rows = ctData as { track_id: string; position: number }[];
  const ids  = rows.map((r) => r.track_id);
  const posMap: Record<string, number> = {};
  rows.forEach((r) => { posMap[r.track_id] = r.position; });

  const { data: tData, error: tError } = await supabase
    .from("tracks")
    .select("*")
    .in("id", ids);
  if (tError) throw new Error(tError.message);

  return (tData as TrackRow[])
    .map(toTrack)
    .sort((a, b) => (posMap[a.id] ?? 0) - (posMap[b.id] ?? 0));
}

export async function getTrackCrates(trackId: string): Promise<Crate[]> {
  const { data, error } = await supabase
    .from("crate_tracks")
    .select("crate_id")
    .eq("track_id", trackId);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const crateIds = (data as { crate_id: string }[]).map((r) => r.crate_id);
  const { data: cratesData, error: cratesError } = await supabase
    .from("crates")
    .select("*")
    .in("id", crateIds);
  if (cratesError) throw new Error(cratesError.message);
  return (cratesData as CrateRow[]).map(toCrate);
}

export async function getCrateTrackIds(crateId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("crate_tracks")
    .select("track_id")
    .eq("crate_id", crateId);
  if (error) throw new Error(error.message);
  return (data as { track_id: string }[]).map((r) => r.track_id);
}

export async function addTrackToCrate(crateId: string, trackId: string): Promise<void> {
  const { error } = await supabase
    .from("crate_tracks")
    .upsert({ crate_id: crateId, track_id: trackId, position: 0 });
  if (error) throw new Error(error.message);
}

export async function removeTrackFromCrate(crateId: string, trackId: string): Promise<void> {
  const { error } = await supabase
    .from("crate_tracks")
    .delete()
    .eq("crate_id", crateId)
    .eq("track_id", trackId);
  if (error) throw new Error(error.message);
}

export async function syncTrackCrates(
  trackId: string,
  newCrateIds: string[],
  oldCrateIds: string[]
): Promise<void> {
  const added   = newCrateIds.filter((id) => !oldCrateIds.includes(id));
  const removed = oldCrateIds.filter((id) => !newCrateIds.includes(id));
  await Promise.all([
    ...added.map((id) => addTrackToCrate(id, trackId)),
    ...removed.map((id) => removeTrackFromCrate(id, trackId)),
  ]);
}
