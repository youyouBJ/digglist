"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTracks, deleteTrack, type Track } from "@/lib/supabase-tracks";
import { getSets } from "@/lib/supabase-sets";
import type { MixSetWithCount } from "@/lib/types";
import { getCrates, getCrateTrackIds, getTrackCrateMap, type Crate, type CrateWithCount } from "@/lib/supabase-crates";
import { PLATFORMS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

/* ─── Hierarchy sort ─────────────────────────────────────────────────────── */

function sortCratesHierarchically<T extends { id: string; parentId: string | null }>(crates: T[]): T[] {
  const result: T[] = [];
  for (const parent of crates.filter((c) => !c.parentId)) {
    result.push(parent);
    result.push(...crates.filter((c) => c.parentId === parent.id));
  }
  for (const c of crates) {
    if (c.parentId && !crates.some((p) => p.id === c.parentId)) result.push(c);
  }
  return result;
}

/* ─── Relative date ──────────────────────────────────────────────────────── */

function relativeDate(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  === 1) return "Yesterday";
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LibraryPage() {
  const user = useRequireAuth();

  const [allTracks, setAllTracks]       = useState<Track[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [platformFilter, setPlatform]   = useState("");
  const [sort, setSort]                 = useState<"date" | "rating" | "az">("date");
  const [confirmId, setConfirmId]       = useState<string | null>(null);

  /* Sets */
  const [allSets, setAllSets]             = useState<MixSetWithCount[]>([]);

  /* Crates */
  const [crates, setCrates]               = useState<CrateWithCount[]>([]);
  const [crateFilter, setCrateFilter]     = useState("");
  const [crateTrackIds, setCrateTrackIds] = useState<Set<string> | null>(null);
  const [trackCrateMap, setTrackCrateMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([getTracks(), getCrates(), getTrackCrateMap(), getSets()])
      .then(([t, c, tcm, s]) => { setAllTracks(t); setCrates(c); setTrackCrateMap(tcm); setAllSets(s); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!crateFilter) { setCrateTrackIds(null); return; }
    getCrateTrackIds(crateFilter)
      .then((ids) => setCrateTrackIds(new Set(ids)))
      .catch(() => setCrateTrackIds(null));
  }, [crateFilter]);

  if (!user) return <PageLoader />;

  /* Set title lookup map */
  const setTitleMap: Record<string, string> = {};
  for (const s of allSets) setTitleMap[s.id] = s.title;

  /* IDs live on /ids — exclude from Library */
  const idsCount = allTracks.filter((t) => t.recordType === "id_needed").length;
  const tracks   = allTracks.filter((t) => t.recordType !== "id_needed");

  /* Count Library tracks per crate (excludes IDs) */
  const crateCountMap: Record<string, number> = {};
  for (const t of tracks) {
    for (const cid of (trackCrateMap[t.id] ?? [])) {
      crateCountMap[cid] = (crateCountMap[cid] ?? 0) + 1;
    }
  }

  const hasFilter = search !== "" || platformFilter !== "" || crateFilter !== "";

  const filtered = tracks.filter((t) => {
    if (crateFilter && crateTrackIds && !crateTrackIds.has(t.id)) return false;
    if (platformFilter && t.sourcePlatform !== platformFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q)  ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)  ||
        t.mood.toLowerCase().includes(q)   ||
        t.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "rating") {
      const diff = (b.rating ?? 0) - (a.rating ?? 0);
      return diff !== 0 ? diff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sort === "az") {
      return (a.title || a.artist || "").toLowerCase()
        .localeCompare((b.title || b.artist || "").toLowerCase());
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function handleDelete(id: string) {
    try {
      await deleteTrack(id);
      setAllTracks((prev) => prev.filter((t) => t.id !== id));
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete track.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col pb-20 sm:pb-0"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 sm:px-8 sm:pt-8">
        <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
          style={{ color: "var(--t3)" }}>
          Your library
        </p>
        <h1 className="text-[30px] font-medium tracking-[-0.04em] leading-none"
          style={{ color: "var(--t1)" }}>
          Library
        </h1>

        {!loading && allTracks.length > 0 && (
          <div className="flex items-center gap-4 mt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[18px] font-medium tracking-[-0.03em] leading-none"
                style={{ color: "var(--t1)", fontFeatureSettings: '"tnum"' }}>
                {tracks.length}
              </span>
              <span className="text-[11px]" style={{ color: "var(--t3)" }}>discoveries</span>
            </div>

            <div className="w-px h-6" style={{ background: "var(--rule2)" }} />

            <Link href="/ids" className="flex flex-col gap-0.5">
              <span className="text-[18px] font-medium tracking-[-0.03em] leading-none"
                style={{ color: idsCount > 0 ? "var(--amber)" : "var(--t3)", fontFeatureSettings: '"tnum"' }}>
                {idsCount}
              </span>
              <span className="text-[11px]" style={{ color: "var(--t3)" }}>IDs needed</span>
            </Link>

            <div className="w-px h-6" style={{ background: "var(--rule2)" }} />

            <Link href="/crates" className="flex flex-col gap-0.5">
              <span className="text-[18px] font-medium tracking-[-0.03em] leading-none"
                style={{ color: crates.length > 0 ? "var(--t1)" : "var(--t4)", fontFeatureSettings: '"tnum"' }}>
                {crates.length > 0 ? crates.length : "—"}
              </span>
              <span className="text-[11px]" style={{ color: "var(--t3)" }}>crates</span>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <p className="px-5 mb-3 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: "var(--t3)" }}>Loading…</span>
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Crates quick access ─────────────────────────────────── */}
          <Link
            href="/crates"
            className="flex items-center gap-3 px-5 sm:px-8 py-[12px] transition-opacity active:opacity-70"
            style={{ borderBottom: "0.5px solid var(--rule)", borderTop: "0.5px solid var(--rule)" }}
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-[6px] shrink-0"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}>
              <StackIcon />
            </div>
            <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--t2)" }}>
              Crates
            </span>
            {crates.length > 0 && (
              <span className="text-[11px]" style={{ color: "var(--t3)", fontFeatureSettings: '"tnum"' }}>
                {crates.filter((c) => !c.parentId).length}
              </span>
            )}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--t4)", flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>

          {/* ── Search + Sort ───────────────────────────────────────── */}
          <div className="px-5 sm:px-8 mb-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Artists, titles, tags, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--t1)", caretColor: "var(--amber)" }}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="text-[11px] transition-colors"
                  style={{ color: "var(--t3)" }}>
                  ✕
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "date" | "rating" | "az")}
              className="shrink-0 h-[40px] px-2.5 rounded-[10px] text-[12px] focus:outline-none"
              style={{
                background:         "var(--bg3)",
                border:             "0.5px solid var(--rule2)",
                color:              sort !== "date" ? "var(--t1)" : "var(--t3)",
                appearance:         "none",
                paddingRight:       "1.75rem",
                backgroundImage:    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23585754' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat:   "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="date">Date ↓</option>
              <option value="rating">Rating ↓</option>
              <option value="az">A–Z</option>
            </select>
          </div>

          {/* ── Filter pills ────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto px-5 sm:px-8 pb-3"
            style={{ scrollbarWidth: "none" }}>

            <FilterPill
              label="All"
              active={!platformFilter && !crateFilter}
              onClick={() => { setPlatform(""); setCrateFilter(""); }}
            />

            {/* Platform filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatform(e.target.value)}
              className="shrink-0 h-[30px] px-2.5 rounded-full text-[12px] focus:outline-none"
              style={{
                background:          "transparent",
                border:              "0.5px solid var(--rule2)",
                color:               platformFilter ? "var(--t1)" : "var(--t3)",
                appearance:          "none",
                paddingRight:        "1.5rem",
                backgroundImage:     `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23585754' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat:    "no-repeat",
                backgroundPosition:  "right 8px center",
              }}
            >
              <option value="">Platform</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Crate filter pills — hierarchical order, only show crates that have Library tracks */}
            {sortCratesHierarchically(crates).filter((c) => (crateCountMap[c.id] ?? 0) > 0).map((c) => {
              const count  = crateCountMap[c.id] ?? 0;
              const active = crateFilter === c.id;
              const isSub  = !!c.parentId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCrateFilter(active ? "" : c.id)}
                  className="flex items-center gap-1 shrink-0 h-[30px] px-3 rounded-full transition-colors"
                  style={{
                    background: active ? `${c.color}18` : "transparent",
                    border:     active ? `0.5px solid ${c.color}40` : "0.5px solid var(--rule2)",
                    color:      active ? c.color : "var(--t2)",
                    fontSize:   isSub ? 11 : 12,
                  }}
                >
                  {isSub && (
                    <span className="text-[9px] mr-0.5" style={{ color: "var(--t4)" }}>↳</span>
                  )}
                  <span className="w-[5px] h-[5px] rounded-full shrink-0 mr-1"
                    style={{ background: c.color, opacity: active ? 1 : 0.5 }} />
                  {c.name}
                  <span className="text-[10px] ml-1" style={{ opacity: 0.5, fontFeatureSettings: '"tnum"' }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {hasFilter && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPlatform(""); setCrateFilter(""); }}
                className="shrink-0 text-[11px] underline underline-offset-2"
                style={{ color: "var(--t3)" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Track list ──────────────────────────────────────────── */}
          {sorted.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-sm" style={{ color: "var(--t3)" }}>No tracks match your search.</p>
            </div>
          ) : (
            <ul style={{ borderTop: "0.5px solid var(--rule)" }}>
              {sorted.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  trackCrates={crates.filter((c) => (trackCrateMap[track.id] ?? []).includes(c.id))}
                  setTitle={track.setId ? setTitleMap[track.setId] : undefined}
                  confirming={confirmId === track.id}
                  onAskDelete={() => setConfirmId(track.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onConfirmDelete={() => handleDelete(track.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <BottomNav />
    </main>
  );
}

/* ─── Track row ──────────────────────────────────────────────────────────── */

function TrackRow({
  track,
  trackCrates,
  setTitle,
  confirming,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  track: Track;
  trackCrates: Crate[];
  setTitle?: string;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const metaTags   = [track.sourcePlatform, track.genre, track.mood].filter(Boolean);
  const hasRating  = track.rating !== null && track.rating > 0;
  const hasCrates  = trackCrates.length > 0;
  const hasExtras  = hasRating || hasCrates;
  const tsStart    = track.sourceTimestamp;
  const tsEnd      = track.timestampEnd;
  const hasTs      = tsStart !== null && tsStart !== undefined;

  return (
    <li
      className="group relative"
      style={{ borderBottom: "0.5px solid var(--rule)" }}
    >
      <Link
        href={`/track/${track.id}`}
        className="flex items-start gap-3 px-5 py-[13px] sm:px-8"
      >
        <TrackThumb track={track} />

        <div className="flex-1 min-w-0">
          <p className="text-[11px] mb-[2px] truncate" style={{ color: "var(--t3)" }}>
            {track.artist}
          </p>
          <p className="text-[14px] font-medium tracking-[-0.01em] leading-[1.25] truncate mb-[7px]"
            style={{ color: "var(--t1)" }}>
            {track.title || "Untitled"}
          </p>
          {metaTags.length > 0 && (
            <p className="text-[11px] leading-none mb-[5px]" style={{ color: "var(--t3)" }}>
              {metaTags.map((tag, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: "var(--t4)", margin: "0 3px" }}>·</span>}
                  {tag}
                </span>
              ))}
            </p>
          )}
          {track.notes && (
            <p className="text-[11px] leading-[1.5] line-clamp-1 mt-[2px]"
              style={{ color: "var(--t3)" }}>
              {track.notes}
            </p>
          )}
          {track.setId && setTitle && (
            <p className="text-[10px] leading-none mt-[4px] flex items-center gap-[3px]"
              style={{ color: "var(--t4)" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <rect x="3"  y="14" width="2.5" height="6"  rx="1.25" />
                <rect x="8"  y="9"  width="2.5" height="11" rx="1.25" />
                <rect x="13" y="5"  width="2.5" height="15" rx="1.25" />
                <rect x="18" y="11" width="2.5" height="8"  rx="1.25" />
              </svg>
              <span className="truncate">{setTitle}</span>
            </p>
          )}
          {hasExtras && (
            <div className="flex items-center gap-[7px] mt-[6px]">
              {hasRating && (
                <span className="text-[10px] leading-none tracking-[0.06em]"
                  style={{ color: "var(--amber)" }}>
                  {"★".repeat(track.rating!)}
                </span>
              )}
              {hasCrates && (
                <span className="flex items-center gap-[4px]">
                  {trackCrates.slice(0, 4).map((c) => (
                    <span key={c.id} className="w-[5px] h-[5px] rounded-full shrink-0"
                      style={{ background: c.color }} />
                  ))}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-[3px] shrink-0 pt-[1px]">
          {hasTs && (
            <span
              className="text-[11px] leading-none whitespace-nowrap"
              style={{
                color:               "var(--t3)",
                fontFamily:          "var(--font-jb-mono, var(--font-geist-mono, monospace))",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {tsEnd !== null && tsEnd !== undefined
                ? `${formatTimestamp(tsStart!)} – ${formatTimestamp(tsEnd)}`
                : formatTimestamp(tsStart!)}
            </span>
          )}
          <span className="text-[10px] leading-none whitespace-nowrap"
            style={{ color: "var(--t4)" }}>
            {relativeDate(track.createdAt)}
          </span>
        </div>
      </Link>

      <div className="px-5 sm:px-8 pb-2 flex items-center gap-3 -mt-1">
        {confirming ? (
          <>
            <span className="text-[11px]" style={{ color: "var(--t3)" }}>Delete?</span>
            <button type="button" onClick={onConfirmDelete}
              className="text-[11px] font-medium text-red-400">
              Yes, delete
            </button>
            <button type="button" onClick={onCancelDelete}
              className="text-[11px]" style={{ color: "var(--t3)" }}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAskDelete}
            className="text-[11px] transition-opacity opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
            style={{ color: "var(--t4)" }}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

/* ─── Track thumb ────────────────────────────────────────────────────────── */

function TrackThumb({ track }: { track: Track }) {
  if (track.imageUrl) {
    return (
      <img
        src={track.imageUrl}
        alt={track.title}
        className="shrink-0 object-cover"
        style={{ width: 44, height: 44, borderRadius: 5, border: "0.5px solid var(--rule2)" }}
      />
    );
  }
  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{ width: 44, height: 44, borderRadius: 5, background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}
    >
      <VinylIcon />
    </div>
  );
}

/* ─── Filter pill ────────────────────────────────────────────────────────── */

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 h-[30px] px-3 rounded-full text-[12px] transition-colors"
      style={{
        background: active ? "var(--bg3)" : "transparent",
        border:     "0.5px solid var(--rule2)",
        color:      active ? "var(--t1)" : "var(--t2)",
      }}
    >
      {label}
    </button>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--t3)", flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} style={{ color: "var(--t3)" }}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function VinylIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.2} style={{ color: "var(--t4)" }}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24 text-center px-8">
      <div style={{ color: "var(--t4)", fontSize: 40 }}>◎</div>
      <p className="text-[14px]" style={{ color: "var(--t3)" }}>Your library is empty.</p>
      <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: "var(--t4)" }}>
        Save your first discovery — a track from a set, a record you heard, anything worth remembering.
      </p>
      <Link
        href="/quick-add"
        className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-medium"
        style={{ background: "var(--t1)", color: "var(--bg)" }}
      >
        + Add your first track
      </Link>
    </div>
  );
}
