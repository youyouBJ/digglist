"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getCrateById, getCrateTracks,
  addTrackToCrate, removeTrackFromCrate,
  type Crate,
} from "@/lib/supabase-crates";
import { getTracks } from "@/lib/supabase-tracks";
import type { Track } from "@/lib/types";
import { formatTimestamp } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

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

export default function CrateDetailPage() {
  const user      = useRequireAuth();
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();

  const [crate, setCrate]               = useState<Crate | null | undefined>(undefined);
  const [tracks, setTracks]             = useState<Track[]>([]);
  const [crateTrackIds, setCrateTrackIds] = useState<Set<string>>(new Set());
  const [error, setError]               = useState<string | null>(null);

  /* Add-tracks sheet */
  const [showSheet, setShowSheet]       = useState(false);
  const [allTracks, setAllTracks]       = useState<Track[] | null>(null);
  const [loadingAll, setLoadingAll]     = useState(false);
  const [sheetSearch, setSheetSearch]   = useState("");
  const prevOverflow                    = useRef("");

  useEffect(() => {
    if (!user) return;
    Promise.all([getCrateById(id), getCrateTracks(id)])
      .then(([c, t]) => {
        if (!c) { setCrate(null); return; }
        setCrate(c);
        setTracks(t);
        setCrateTrackIds(new Set(t.map((x) => x.id)));
      })
      .catch((e: Error) => { setError(e.message); setCrate(null); });
  }, [id, user]);

  /* Body scroll lock */
  useEffect(() => {
    if (showSheet) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => { document.body.style.overflow = prevOverflow.current; };
  }, [showSheet]);

  async function openSheet() {
    setShowSheet(true);
    if (!allTracks) {
      setLoadingAll(true);
      try { setAllTracks(await getTracks()); }
      catch { /* ignore */ }
      finally { setLoadingAll(false); }
    }
  }

  async function handleToggle(trackId: string) {
    const inCrate = crateTrackIds.has(trackId);
    /* Optimistic update */
    setCrateTrackIds((prev) => {
      const next = new Set(prev);
      inCrate ? next.delete(trackId) : next.add(trackId);
      return next;
    });
    if (inCrate) {
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      await removeTrackFromCrate(id, trackId).catch(() => {
        setCrateTrackIds((prev) => { const n = new Set(prev); n.add(trackId); return n; });
        setTracks((prev) => {
          const t = allTracks?.find((x) => x.id === trackId);
          return t ? [...prev, t] : prev;
        });
      });
    } else {
      const added = allTracks?.find((t) => t.id === trackId);
      if (added) setTracks((prev) => [...prev, added]);
      await addTrackToCrate(id, trackId).catch(() => {
        setCrateTrackIds((prev) => { const n = new Set(prev); n.delete(trackId); return n; });
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      });
    }
  }

  if (!user || crate === undefined) return <PageLoader />;
  if (crate === null) {
    return <PageError message={error ?? "Crate not found."} backHref="/crates" backLabel="Back to Crates" />;
  }

  const rgb = hexToRgb(crate.color);

  const sheetTracks = (allTracks ?? []).filter((t) => {
    if (!sheetSearch) return true;
    const q = sheetSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q)
    );
  });

  return (
    <main
      className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <Header />

      {/* ── Back bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link
          href="/crates"
          className="flex items-center gap-2 text-[13px] transition-colors"
          style={{ color: "var(--teal)" }}
        >
          <ArrowLeft />
          Crates
        </Link>
        <Link
          href={`/crates/${id}/edit`}
          className="text-[12px] transition-colors"
          style={{ color: "var(--t3)" }}
        >
          Edit
        </Link>
      </div>

      {/* ── Crate hero ───────────────────────────────────────────── */}
      <div
        className="mx-5 sm:mx-8 mb-5 rounded-[14px] overflow-hidden"
        style={{
          background: `rgba(${rgb},0.06)`,
          border:     `0.5px solid rgba(${rgb},0.22)`,
        }}
      >
        <div style={{ height: 3, background: crate.color, opacity: 0.75 }} />
        <div className="p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-[34px] font-medium tracking-[-0.04em] leading-none"
              style={{ color: crate.color, fontFeatureSettings: '"tnum"' }}
            >
              {tracks.length}
            </span>
            <span className="text-[12px]" style={{ color: "var(--t4)" }}>
              {tracks.length === 1 ? "track" : "tracks"}
            </span>
          </div>
          <p className="text-[18px] font-medium tracking-[-0.02em]"
            style={{ color: "var(--t1)" }}>
            {crate.name}
          </p>
          {crate.description && (
            <p className="text-[13px] mt-1" style={{ color: "var(--t3)" }}>
              {crate.description}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="px-5 sm:px-8 mb-4 text-[13px] text-red-400">{error}</p>
      )}

      {/* ── Add tracks button ────────────────────────────────────── */}
      <div className="px-5 sm:px-8 mb-3">
        <button
          type="button"
          onClick={openSheet}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-medium transition-colors"
          style={{ background: `rgba(${rgb},0.10)`, color: crate.color, border: `0.5px solid rgba(${rgb},0.25)` }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
          Add tracks
        </button>
      </div>

      {/* ── Track list ───────────────────────────────────────────── */}
      {tracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
          <p className="text-[14px]" style={{ color: "var(--t3)" }}>This crate is empty.</p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--t4)" }}>
            Tap "Add tracks" to dig through your library and fill it up.
          </p>
        </div>
      ) : (
        <ul style={{ borderTop: "0.5px solid var(--rule)" }}>
          {tracks.map((track) => (
            <CrateTrackRow
              key={track.id}
              track={track}
              crateColor={crate.color}
              onRemove={() => handleToggle(track.id)}
            />
          ))}
        </ul>
      )}

      {/* ── Add tracks sheet ─────────────────────────────────────── */}
      {showSheet && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(3px)" }}
            onClick={() => setShowSheet(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col rounded-t-[22px] animate-sheet-up"
            style={{
              background:    "var(--bg2)",
              borderTop:     "0.5px solid var(--rule2)",
              boxShadow:     "0 -20px 50px -10px rgba(0,0,0,0.6)",
              maxHeight:     "85vh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 mb-3 w-9 h-1 rounded-full shrink-0"
              style={{ background: "var(--rule3)" }} />

            <div className="flex items-center justify-between px-5 mb-3 shrink-0">
              <p className="text-[15px] font-medium" style={{ color: "var(--t1)" }}>
                Add tracks to {crate.name}
              </p>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="text-[13px] font-medium"
                style={{ color: crate.color }}
              >
                Done
              </button>
            </div>

            {/* Search */}
            <div className="px-5 mb-3 shrink-0">
              <div
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
                style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
              >
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search tracks…"
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] focus:outline-none"
                  style={{ color: "var(--t1)", caretColor: crate.color }}
                />
              </div>
            </div>

            {/* Track list */}
            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
              {loadingAll ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-[13px]" style={{ color: "var(--t3)" }}>Loading…</span>
                </div>
              ) : sheetTracks.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-[13px]" style={{ color: "var(--t3)" }}>No tracks found.</span>
                </div>
              ) : (
                sheetTracks.map((track) => {
                  const inCrate = crateTrackIds.has(track.id);
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleToggle(track.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors active:opacity-70"
                      style={{ borderBottom: "0.5px solid var(--rule)" }}
                    >
                      <SheetThumb track={track} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--t1)" }}>
                          {track.title || "Untitled"}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "var(--t3)" }}>
                          {track.artist || track.sourcePlatform}
                        </p>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                        style={inCrate
                          ? { background: crate.color, border: `1.5px solid ${crate.color}` }
                          : { border: "1.5px solid var(--rule2)" }
                        }
                      >
                        {inCrate && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

/* ─── Crate track row ────────────────────────────────────────────────────── */

function CrateTrackRow({
  track, crateColor, onRemove,
}: {
  track: Track;
  crateColor: string;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const isIds = track.status === "IDs Needed";

  return (
    <li
      className="group"
      style={{
        borderBottom: "0.5px solid var(--rule)",
        borderLeft:   isIds ? "1.5px solid var(--amber)" : "none",
        background:   isIds ? "var(--amber-soft)" : "transparent",
      }}
    >
      <Link
        href={`/track/${track.id}`}
        className="flex items-start gap-3 px-5 sm:px-8 py-[13px]"
      >
        <CrateThumb track={track} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] mb-[2px] truncate"
            style={{ color: isIds ? "rgba(201,162,74,0.65)" : "var(--t3)" }}>
            {track.artist || (isIds ? "Unknown artist" : "")}
          </p>
          <p className="text-[14px] font-medium tracking-[-0.01em] leading-[1.25] truncate"
            style={{ color: isIds && !track.title ? "var(--amber)" : "var(--t1)" }}>
            {track.title || (isIds ? "Unknown track" : "Untitled")}
          </p>
          {(track.genre || track.mood) && (
            <p className="text-[11px] mt-[5px]" style={{ color: "var(--t3)" }}>
              {[track.genre, track.mood].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-[3px] shrink-0 pt-[1px]">
          {track.sourceTimestamp !== null && track.sourceTimestamp !== undefined && (
            <span
              className="text-[11px] font-mono"
              style={{
                color:      isIds ? "var(--amber)" : "var(--t3)",
                fontFamily: "var(--font-jb-mono, monospace)",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatTimestamp(track.sourceTimestamp)}
            </span>
          )}
          <span className="text-[10px]" style={{ color: "var(--t4)" }}>
            {new Date(track.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
      </Link>

      <div className="px-5 sm:px-8 pb-2 -mt-1">
        {confirming ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: "var(--t3)" }}>Remove?</span>
            <button type="button" onClick={onRemove}
              className="text-[11px] font-medium text-red-400">
              Yes, remove
            </button>
            <button type="button" onClick={() => setConfirming(false)}
              className="text-[11px]" style={{ color: "var(--t3)" }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[11px] opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--t4)" }}
          >
            Remove from crate
          </button>
        )}
      </div>
    </li>
  );
}

/* ─── Thumbs ─────────────────────────────────────────────────────────────── */

function CrateThumb({ track }: { track: Track }) {
  if (track.imageUrl) {
    return (
      <img src={track.imageUrl} alt={track.title}
        className="shrink-0 object-cover"
        style={{ width: 44, height: 44, borderRadius: 5, border: "0.5px solid var(--rule2)" }} />
    );
  }
  if (track.status === "IDs Needed") {
    return (
      <div className="shrink-0 flex items-center justify-center text-[13px] font-medium"
        style={{ width: 44, height: 44, borderRadius: 5, background: "var(--amber-soft)", border: "0.5px solid var(--amber-rule)", color: "var(--amber)" }}>
        ?
      </div>
    );
  }
  return (
    <div className="shrink-0 flex items-center justify-center"
      style={{ width: 44, height: 44, borderRadius: 5, background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.2} style={{ color: "var(--t4)" }}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

function SheetThumb({ track }: { track: Track }) {
  if (track.imageUrl) {
    return (
      <img src={track.imageUrl} alt={track.title}
        className="shrink-0 object-cover"
        style={{ width: 36, height: 36, borderRadius: 5, border: "0.5px solid var(--rule2)" }} />
    );
  }
  return (
    <div className="shrink-0 flex items-center justify-center"
      style={{ width: 36, height: 36, borderRadius: 5, background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.2} style={{ color: "var(--t4)" }}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function ArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--t3)", flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}
