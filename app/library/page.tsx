"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTracks, deleteTrack, type Track } from "@/lib/supabase-tracks";
import { getCrates, getCrateTrackIds, type CrateWithCount } from "@/lib/supabase-crates";
import { PLATFORMS, STATUSES } from "@/lib/constants";
import { formatTimestamp } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

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

  const [tracks, setTracks]           = useState<Track[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [platformFilter, setPlatform] = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [confirmId, setConfirmId]     = useState<string | null>(null);

  /* Crates */
  const [crates, setCrates]                     = useState<CrateWithCount[]>([]);
  const [crateFilter, setCrateFilter]           = useState("");
  const [crateTrackIds, setCrateTrackIds]       = useState<Set<string> | null>(null);
  const [loadingCrateFilter, setLoadingCrateFilter] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getTracks(),
      getCrates(),
    ])
      .then(([t, c]) => { setTracks(t); setCrates(c); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!crateFilter) { setCrateTrackIds(null); return; }
    setLoadingCrateFilter(true);
    getCrateTrackIds(crateFilter)
      .then((ids) => setCrateTrackIds(new Set(ids)))
      .catch(() => setCrateTrackIds(null))
      .finally(() => setLoadingCrateFilter(false));
  }, [crateFilter]);

  /* Pre-set status filter from URL param (?ids=1) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ids") === "1") setStatus("IDs Needed");
  }, []);

  if (!user) return <PageLoader />;

  const idsCount  = tracks.filter((t) => t.status === "IDs Needed").length;
  const hasFilter = search !== "" || platformFilter !== "" || statusFilter !== "" || crateFilter !== "";

  const filtered = tracks.filter((t) => {
    if (crateFilter && crateTrackIds && !crateTrackIds.has(t.id)) return false;
    if (platformFilter && t.sourcePlatform !== platformFilter) return false;
    if (statusFilter   && t.status         !== statusFilter)   return false;
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

  async function handleDelete(id: string) {
    try {
      await deleteTrack(id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
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
        <div className="flex items-start justify-between">
          <h1 className="text-[30px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: "var(--t1)" }}>
            Library
          </h1>
        </div>

        {!loading && tracks.length > 0 && (
          <div className="flex items-center gap-4 mt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[18px] font-medium tracking-[-0.03em] leading-none"
                style={{ color: "var(--t1)", fontFeatureSettings: '"tnum"' }}>
                {tracks.length}
              </span>
              <span className="text-[11px]" style={{ color: "var(--t3)" }}>discoveries</span>
            </div>

            <div className="w-px h-6" style={{ background: "var(--rule2)" }} />

            <div className="flex flex-col gap-0.5">
              <span className="text-[18px] font-medium tracking-[-0.03em] leading-none"
                style={{ color: idsCount > 0 ? "var(--amber)" : "var(--t3)", fontFeatureSettings: '"tnum"' }}>
                {idsCount}
              </span>
              <span className="text-[11px]" style={{ color: "var(--t3)" }}>IDs needed</span>
            </div>

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
          {/* ── Search ──────────────────────────────────────────────── */}
          <div className="px-5 sm:px-8 mb-3">
            <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
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
          </div>

          {/* ── Filter pills ────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto px-5 sm:px-8 pb-3"
            style={{ scrollbarWidth: "none" }}>

            {/* All */}
            <FilterPill
              label="All"
              active={!statusFilter && !platformFilter}
              onClick={() => { setStatus(""); setPlatform(""); }}
            />

            {/* IDs needed */}
            {idsCount > 0 && (
              <button
                type="button"
                onClick={() => setStatus(statusFilter === "IDs Needed" ? "" : "IDs Needed")}
                className="flex items-center gap-1.5 shrink-0 h-[30px] px-3 rounded-full text-[12px] transition-colors"
                style={{
                  background: statusFilter === "IDs Needed" ? "var(--amber-fill)" : "var(--amber-soft)",
                  border:     "0.5px solid var(--amber-rule)",
                  color:      "var(--amber)",
                }}
              >
                IDs needed
                <span className="text-[10px] font-semibold px-1 rounded-md leading-[15px] min-w-[15px] text-center"
                  style={{ background: "var(--amber)", color: "#1a1000" }}>
                  {idsCount}
                </span>
              </button>
            )}

            {/* Status pills (excluding IDs Needed handled above) */}
            {STATUSES.filter(s => s !== "IDs Needed").map((s) => (
              <FilterPill
                key={s}
                label={s}
                active={statusFilter === s}
                onClick={() => setStatus(statusFilter === s ? "" : s)}
              />
            ))}

            {/* Platform filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatform(e.target.value)}
              className="shrink-0 h-[30px] px-2.5 rounded-full text-[12px] focus:outline-none transition-colors"
              style={{
                background:   "transparent",
                border:       "0.5px solid var(--rule2)",
                color:        platformFilter ? "var(--t1)" : "var(--t3)",
                appearance:   "none",
                paddingRight: "1.5rem",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23585754' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat:   "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="">Platform</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Crate filter pills */}
            {crates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCrateFilter(crateFilter === c.id ? "" : c.id)}
                className="flex items-center gap-1.5 shrink-0 h-[30px] px-3 rounded-full text-[12px] transition-colors"
                style={{
                  background: crateFilter === c.id ? `${c.color}18` : "transparent",
                  border:     crateFilter === c.id ? `0.5px solid ${c.color}40` : "0.5px solid var(--rule2)",
                  color:      crateFilter === c.id ? c.color : "var(--t2)",
                }}
              >
                <span className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ background: c.color, opacity: crateFilter === c.id ? 1 : 0.5 }} />
                {c.name}
              </button>
            ))}

            {hasFilter && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPlatform(""); setStatus(""); setCrateFilter(""); }}
                className="shrink-0 text-[11px] transition-colors underline underline-offset-2"
                style={{ color: "var(--t3)" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Track list ──────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-sm" style={{ color: "var(--t3)" }}>No tracks match your search.</p>
            </div>
          ) : (
            <ul style={{ borderTop: "0.5px solid var(--rule)" }}>
              {filtered.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
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
  confirming,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  track: Track;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const isIds = track.status === "IDs Needed";

  // Dot-separated meta tags (editorial style, no pills)
  const metaTags = [
    track.sourcePlatform,
    track.genre,
    track.mood,
  ].filter(Boolean);

  return (
    <li
      className="group relative"
      style={{
        borderBottom:   "0.5px solid var(--rule)",
        borderLeft:     isIds ? "1.5px solid var(--amber)" : "none",
        background:     isIds ? "var(--amber-soft)" : "transparent",
      }}
    >
      <Link
        href={`/track/${track.id}`}
        className="flex items-start gap-3 px-5 py-[13px] sm:px-8"
      >
        {/* Thumb */}
        <TrackThumb track={track} />

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Artist */}
          <p className="text-[11px] mb-[2px] truncate"
            style={{ color: isIds ? "rgba(201,162,74,0.65)" : "var(--t3)" }}>
            {track.artist || (isIds ? "Unknown artist" : "")}
          </p>

          {/* Title */}
          <p className="text-[14px] font-medium tracking-[-0.01em] leading-[1.25] truncate mb-[7px]"
            style={{ color: isIds && !track.title ? "var(--amber)" : "var(--t1)" }}>
            {track.title || (isIds ? "Unknown track" : "Untitled")}
          </p>

          {/* Meta — dot separated */}
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

          {/* IDs chip */}
          {isIds && (
            <p className="text-[10px] font-medium mb-[4px]" style={{ color: "var(--amber)" }}>
              ◆ ID needed
            </p>
          )}

          {/* Note */}
          {track.notes && (
            <p className="text-[11px] leading-[1.5] line-clamp-2 mt-[2px]"
              style={{ color: "var(--t3)" }}>
              {track.notes}
            </p>
          )}
        </div>

        {/* Right — timestamp + date */}
        <div className="flex flex-col items-end gap-[3px] shrink-0 pt-[1px]">
          {track.sourceTimestamp !== null && track.sourceTimestamp !== undefined && (
            <span
              className="text-[11px] leading-none font-mono whitespace-nowrap"
              style={{
                color:      isIds ? "var(--amber)" : "var(--t3)",
                fontFamily: "var(--font-jb-mono, var(--font-geist-mono, monospace))",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatTimestamp(track.sourceTimestamp)}
            </span>
          )}
          <span className="text-[10px] leading-none whitespace-nowrap"
            style={{ color: "var(--t4)" }}>
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
              className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors">
              Yes, delete
            </button>
            <button type="button" onClick={onCancelDelete}
              className="text-[11px] transition-colors" style={{ color: "var(--t3)" }}>
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

  if (track.status === "IDs Needed") {
    return (
      <div
        className="shrink-0 flex items-center justify-center text-[13px] font-medium"
        style={{
          width: 44, height: 44, borderRadius: 5,
          background: "var(--amber-soft)",
          border:     "0.5px solid var(--amber-rule)",
          color:      "var(--amber)",
        }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: 44, height: 44, borderRadius: 5,
        background: "var(--bg4)",
        border:     "0.5px solid var(--rule2)",
      }}
    >
      <VinylIcon />
    </div>
  );
}

/* ─── Filter pill ────────────────────────────────────────────────────────── */

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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

/* ─── Empty / fallback states ────────────────────────────────────────────── */

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
        className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
        style={{ background: "var(--t1)", color: "var(--bg)" }}
      >
        + Add your first track
      </Link>
    </div>
  );
}
