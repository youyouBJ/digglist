"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTracks, deleteTrack, type Track } from "@/lib/supabase-tracks";
import { getCrates, getCrateTrackIds, getTrackCrateMap, type Crate, type CrateWithCount } from "@/lib/supabase-crates";
import { formatTimestamp } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

/* ─── Relative date ──────────────────────────────────────────────────────── */

function relativeDate(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor(diff / 60_000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  === 1) return "Yesterday";
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function IdsPage() {
  const user = useRequireAuth();

  const [tracks, setTracks]         = useState<Track[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState<"date" | "rating" | "az">("date");
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  /* Crates */
  const [crates, setCrates]               = useState<CrateWithCount[]>([]);
  const [crateFilter, setCrateFilter]     = useState("");
  const [crateTrackIds, setCrateTrackIds] = useState<Set<string> | null>(null);
  const [trackCrateMap, setTrackCrateMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([getTracks(), getCrates(), getTrackCrateMap()])
      .then(([t, c, tcm]) => {
        setTracks(t.filter((tr) => tr.recordType === "id_needed"));
        setCrates(c);
        setTrackCrateMap(tcm);
      })
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

  /* Count IDs per crate */
  const crateCountMap: Record<string, number> = {};
  for (const t of tracks) {
    for (const cid of (trackCrateMap[t.id] ?? [])) {
      crateCountMap[cid] = (crateCountMap[cid] ?? 0) + 1;
    }
  }

  const filtered = tracks.filter((t) => {
    if (crateFilter && crateTrackIds && !crateTrackIds.has(t.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q)  ||
        t.artist.toLowerCase().includes(q) ||
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
      setTracks((prev) => prev.filter((t) => t.id !== id));
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col pb-20 sm:pb-0"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 sm:px-8 sm:pt-8 flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
            style={{ color: "rgba(201,162,74,0.55)" }}>
            Unknown tracks
          </p>
          <h1 className="text-[30px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: "var(--amber)" }}>
            IDs
          </h1>
          {!loading && (
            <p className="text-[12px] mt-2" style={{ color: "rgba(201,162,74,0.55)" }}>
              {tracks.length === 0
                ? "No IDs logged yet"
                : `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"} to identify`}
            </p>
          )}
        </div>
        <Link
          href="/ids/new"
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-medium mt-2"
          style={{
            background: "var(--amber-soft)",
            color:      "var(--amber)",
            border:     "0.5px solid var(--amber-rule)",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>
          Log an ID
        </Link>
      </div>

      {error && (
        <p className="px-5 sm:px-8 mb-4 text-[13px] text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: "var(--t3)" }}>Loading…</span>
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Search + Sort ───────────────────────────────────────── */}
          <div className="px-5 sm:px-8 mb-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Artists, notes, sources…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--t1)", caretColor: "var(--amber)" }}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="text-[11px] transition-colors" style={{ color: "var(--t3)" }}>
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
                color:              sort !== "date" ? "var(--amber)" : "rgba(201,162,74,0.45)",
                appearance:         "none",
                paddingRight:       "1.75rem",
                backgroundImage:    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23C9A24A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat:   "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="date">Date ↓</option>
              <option value="rating">Rating ↓</option>
              <option value="az">A–Z</option>
            </select>
          </div>

          {/* ── Crate filter pills ──────────────────────────────────── */}
          {crates.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto px-5 sm:px-8 pb-3"
              style={{ scrollbarWidth: "none" }}>
              {crates.filter((c) => (crateCountMap[c.id] ?? 0) > 0).map((c) => {
                const count  = crateCountMap[c.id] ?? 0;
                const active = crateFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCrateFilter(active ? "" : c.id)}
                    className="flex items-center gap-1.5 shrink-0 h-[30px] px-3 rounded-full text-[12px] transition-colors"
                    style={{
                      background: active ? `${c.color}18` : "transparent",
                      border:     active ? `0.5px solid ${c.color}40` : "0.5px solid var(--rule2)",
                      color:      active ? c.color : "var(--t2)",
                    }}
                  >
                    <span className="w-[5px] h-[5px] rounded-full shrink-0"
                      style={{ background: c.color, opacity: active ? 1 : 0.5 }} />
                    {c.name}
                    <span className="text-[10px]" style={{ opacity: 0.5, fontFeatureSettings: '"tnum"' }}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {crateFilter && (
                <button
                  type="button"
                  onClick={() => setCrateFilter("")}
                  className="shrink-0 text-[11px] underline underline-offset-2"
                  style={{ color: "var(--t3)" }}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* ── ID list ─────────────────────────────────────────────── */}
          {sorted.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-sm" style={{ color: "var(--t3)" }}>No IDs match your search.</p>
            </div>
          ) : (
            <ul style={{ borderTop: "0.5px solid var(--rule)" }}>
              {sorted.map((track) => (
                <IdRow
                  key={track.id}
                  track={track}
                  trackCrates={crates.filter((c) => (trackCrateMap[track.id] ?? []).includes(c.id))}
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

/* ─── ID row ─────────────────────────────────────────────────────────────── */

function IdRow({
  track,
  trackCrates,
  confirming,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  track: Track;
  trackCrates: Crate[];
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const hasRating = track.rating !== null && track.rating > 0;
  const hasCrates = trackCrates.length > 0;
  const hasExtras = hasRating || hasCrates;
  const tsStart   = track.sourceTimestamp;
  const tsEnd     = track.timestampEnd;
  const hasTs     = tsStart !== null && tsStart !== undefined;

  return (
    <li
      className="group relative"
      style={{
        borderBottom: "0.5px solid var(--rule)",
        borderLeft:   "1.5px solid var(--amber)",
        background:   "var(--amber-soft)",
      }}
    >
      <Link
        href={`/track/${track.id}`}
        className="flex items-start gap-3 px-5 py-[13px] sm:px-8"
      >
        {/* Thumb */}
        {track.imageUrl ? (
          <img
            src={track.imageUrl}
            alt={track.title}
            className="shrink-0 object-cover"
            style={{ width: 44, height: 44, borderRadius: 5, border: "0.5px solid var(--amber-rule)" }}
          />
        ) : (
          <div
            className="shrink-0 flex items-center justify-center text-[13px] font-medium"
            style={{
              width: 44, height: 44, borderRadius: 5,
              background: "rgba(201,162,74,0.12)",
              border:     "0.5px solid var(--amber-rule)",
              color:      "var(--amber)",
            }}
          >
            ?
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] mb-[2px] truncate"
            style={{ color: "rgba(201,162,74,0.65)" }}>
            {track.artist || "Unknown artist"}
          </p>
          <p className="text-[14px] font-medium tracking-[-0.01em] leading-[1.25] truncate mb-[6px]"
            style={{ color: track.title ? "var(--t1)" : "var(--amber)" }}>
            {track.title || "Unknown track"}
          </p>
          {track.notes && (
            <p className="text-[11px] leading-[1.5] line-clamp-1"
              style={{ color: "rgba(201,162,74,0.60)" }}>
              {track.notes}
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

        {/* Right — timestamp + date */}
        <div className="flex flex-col items-end gap-[3px] shrink-0 pt-[1px]">
          {hasTs && (
            <span
              className="text-[11px] leading-none whitespace-nowrap"
              style={{
                color:               "var(--amber)",
                fontFamily:          "var(--font-jb-mono, monospace)",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {tsEnd !== null && tsEnd !== undefined
                ? `${formatTimestamp(tsStart!)} – ${formatTimestamp(tsEnd)}`
                : formatTimestamp(tsStart!)}
            </span>
          )}
          <span className="text-[10px] leading-none whitespace-nowrap"
            style={{ color: "rgba(201,162,74,0.45)" }}>
            {relativeDate(track.createdAt)}
          </span>
        </div>
      </Link>

      {/* Delete zone */}
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
            style={{ color: "rgba(201,162,74,0.55)" }}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20 px-8 text-center">
      <div className="text-[48px] leading-none" style={{ color: "var(--amber)", opacity: 0.35 }}>?</div>
      <p className="text-[14px]" style={{ color: "var(--t3)" }}>No IDs logged yet.</p>
      <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: "var(--t4)" }}>
        Heard something you can't identify? Log it here — set, timestamp, source, any details you remember.
      </p>
      <Link
        href="/ids/new"
        className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-medium"
        style={{ background: "var(--amber)", color: "#1a1000" }}
      >
        + Log your first ID
      </Link>
    </div>
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
