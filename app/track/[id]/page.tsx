"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getTrackById, deleteTrack, type Track } from "@/lib/supabase-tracks";
import {
  getTrackCrates, getCrates,
  addTrackToCrate, removeTrackFromCrate,
  type Crate,
} from "@/lib/supabase-crates";
import { formatTimestamp, buildTimestampUrl } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

export default function TrackDetailPage() {
  const user                              = useRequireAuth();
  const { id }                            = useParams<{ id: string }>();
  const router                            = useRouter();
  const [track, setTrack]                 = useState<Track | null | undefined>(undefined);
  const [error, setError]                 = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* Crates */
  const [trackCrates, setTrackCrates]     = useState<Crate[]>([]);
  const [allCrates, setAllCrates]         = useState<Crate[]>([]);
  const [showCrateSheet, setShowCrateSheet] = useState(false);
  const prevOverflow                      = useRef("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getTrackById(id),
      getTrackCrates(id),
      getCrates(),
    ])
      .then(([t, tc, ac]) => {
        setTrack(t);
        setTrackCrates(tc);
        setAllCrates(ac);
      })
      .catch((e: Error) => { setError(e.message); setTrack(null); });
  }, [id, user]);

  /* Scroll lock for crate sheet */
  useEffect(() => {
    if (showCrateSheet) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => { document.body.style.overflow = prevOverflow.current; };
  }, [showCrateSheet]);

  async function handleCrateToggle(crate: Crate) {
    const inCrate = trackCrates.some((c) => c.id === crate.id);
    setTrackCrates((prev) =>
      inCrate ? prev.filter((c) => c.id !== crate.id) : [...prev, crate]
    );
    try {
      if (inCrate) await removeTrackFromCrate(crate.id, id);
      else         await addTrackToCrate(crate.id, id);
    } catch {
      setTrackCrates((prev) =>
        inCrate ? [...prev, crate] : prev.filter((c) => c.id !== crate.id)
      );
    }
  }

  async function handleDelete() {
    const backDest = track?.recordType === "id_needed" ? "/ids" : "/library";
    setDeleting(true);
    try {
      await deleteTrack(id);
      router.push(backDest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
      setDeleting(false);
    }
  }

  if (!user || track === undefined) return <PageLoader />;

  if (track === null) {
    return (
      <PageError
        message={error ?? "Track not found."}
        backHref="/library"
        backLabel="Back to Library"
      />
    );
  }

  const isIds  = track.recordType === "id_needed";
  const tsUrl  = buildTimestampUrl(track.sourceUrl, track.sourceTimestamp);
  const hasTs  = track.sourceTimestamp !== null && track.sourceTimestamp !== undefined;

  const metaTags = [track.genre, track.mood].filter(Boolean);

  /* Days since discovery */
  const daysSince = Math.floor(
    (Date.now() - new Date(track.createdAt).getTime()) / 86_400_000
  );

  return (
    <main className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Back bar ───────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link
          href={isIds ? "/ids" : "/library"}
          className="flex items-center gap-2 text-[13px] transition-colors"
          style={{ color: "var(--teal)" }}
        >
          <ArrowLeft />
          {isIds ? "IDs" : "Library"}
        </Link>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 px-5 sm:px-8 pb-5">
        <DetailThumb track={track} />

        <div className="flex-1 min-w-0 pt-[2px]">
          <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
            style={{ color: isIds ? "rgba(201,162,74,0.65)" : "var(--t3)" }}>
            {track.artist || (isIds ? "Unknown artist" : " ")}
          </p>
          <h2 className="text-[20px] font-medium tracking-[-0.02em] leading-[1.2] mb-2"
            style={{ color: isIds && !track.title ? "var(--amber)" : "var(--t1)" }}>
            {track.title || (isIds ? "Unknown track" : "Untitled")}
          </h2>

          {metaTags.length > 0 && (
            <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--t3)" }}>
              <span className="w-[5px] h-[5px] rounded-full shrink-0 inline-block"
                style={{ background: isIds ? "var(--amber)" : "var(--teal)" }} />
              {metaTags.join(" / ")}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mx-5 sm:mx-8 mb-4 text-sm text-red-400">{error}</p>
      )}

      {/* ── IDs Needed banner ──────────────────────────────────────── */}
      {isIds && (
        <div className="mx-5 sm:mx-8 mb-4 rounded-[10px] p-[13px_14px] flex gap-3"
          style={{
            background: "var(--amber-soft)",
            border:     "0.5px solid var(--amber-rule)",
          }}>
          <BookmarkIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium mb-1" style={{ color: "var(--amber)" }}>
              ID needed · open {daysSince === 0 ? "today" : `${daysSince}d`}
            </p>
            {track.notes && (
              <p className="text-[12px] leading-[1.55] mb-3"
                style={{ color: "rgba(201,162,74,0.70)" }}>
                {track.notes}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {hasTs && track.sourceUrl && (
                <a
                  href={tsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[5px] text-[11px] rounded-[6px] px-[10px] py-[5px] transition-colors"
                  style={{
                    color:   "var(--amber)",
                    border:  "0.5px solid var(--amber-rule)",
                    background: "transparent",
                  }}
                >
                  <TimestampIcon />
                  Listen from {formatTimestamp(track.sourceTimestamp!)}
                </a>
              )}
              <Link
                href={`/track/${id}/edit`}
                className="inline-flex items-center gap-[5px] text-[11px] rounded-[6px] px-[10px] py-[5px] transition-colors"
                style={{
                  color:   "var(--amber)",
                  border:  "0.5px solid var(--amber-rule)",
                  background: "transparent",
                }}
              >
                <CheckIcon />
                Mark as found
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Embed ──────────────────────────────────────────────────── */}
      {track.sourceUrl && (
        <TrackEmbed url={track.sourceUrl} timestamp={track.sourceTimestamp} />
      )}

      {/* ── Detail sections ────────────────────────────────────────── */}
      <div style={{ borderTop: "0.5px solid var(--rule)" }}>

        <SectionRow label="Platform">
          <span className="text-[13px]" style={{ color: "var(--t2)" }}>
            {track.sourcePlatform}
          </span>
        </SectionRow>

        {hasTs && (
          <SectionRow label="Timestamp">
            <span
              className="text-[15px] font-medium tracking-[-0.01em]"
              style={{
                color:      "var(--amber)",
                fontFamily: "var(--font-jb-mono, monospace)",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatTimestamp(track.sourceTimestamp!)}
            </span>
          </SectionRow>
        )}

        {(track.genre || track.mood) && (
          <SectionRow label="Tags">
            <span className="text-[13px]" style={{ color: "var(--t2)" }}>
              {[track.genre, track.mood].filter(Boolean).join(" · ")}
            </span>
          </SectionRow>
        )}

        {track.label && (
          <SectionRow label="Label">
            <span className="text-[13px]" style={{ color: "var(--t2)" }}>
              {track.label}
            </span>
          </SectionRow>
        )}

        {track.videoAuthor && (
          <SectionRow label="Video author">
            <span className="text-[13px]" style={{ color: "var(--t2)" }}>
              {track.videoAuthor}
            </span>
          </SectionRow>
        )}

        {track.trackIdHint && (
          <SectionRow label="Track ID">
            <span className="text-[13px]" style={{ color: "var(--t2)" }}>
              {track.trackIdHint}
            </span>
          </SectionRow>
        )}

        {track.timestampEnd !== null && (
          <SectionRow label={track.sourceTimestamp !== null ? "Segment" : "End"}>
            <span
              className="text-[13px] font-medium"
              style={{
                color: "var(--amber)",
                fontFamily: "var(--font-jb-mono, monospace)",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {track.sourceTimestamp !== null
                ? `${formatTimestamp(track.sourceTimestamp!)} → ${formatTimestamp(track.timestampEnd!)}`
                : formatTimestamp(track.timestampEnd!)}
            </span>
          </SectionRow>
        )}

        {track.sourceUrl && (
          <SectionRow label="Source">
            <a
              href={tsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] underline underline-offset-2 transition-colors max-w-[200px] truncate"
              style={{
                color:                 "var(--slate)",
                textDecorationColor:   "rgba(82,114,160,0.35)",
              }}
            >
              {hasTs
                ? `Open at ${formatTimestamp(track.sourceTimestamp!)} →`
                : "Open source →"}
            </a>
          </SectionRow>
        )}

        {track.notes && !isIds && (
          <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--rule)" }}
            className="sm:px-8">
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>Note</p>
            <p className="text-[13px] leading-[1.65]" style={{ color: "var(--t2)" }}>
              {track.notes}
            </p>
          </div>
        )}

        <SectionRow label="Discovered">
          <span className="text-[13px]" style={{ color: "var(--t2)" }}>
            {new Date(track.createdAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </SectionRow>

        {track.rating !== null && !isIds && (
          <SectionRow label="Rating">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} width="14" height="14" viewBox="0 0 24 24"
                  fill={star <= (track.rating ?? 0) ? "var(--amber)" : "none"}
                  stroke={star <= (track.rating ?? 0) ? "var(--amber)" : "var(--rule3)"}
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
              <span className="ml-1 text-[12px]" style={{ color: "var(--amber)" }}>
                {track.rating}/5
              </span>
            </div>
          </SectionRow>
        )}

        {/* Crates */}
        <div
          className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--rule)" }}
        >
          <span className="text-[10px] tracking-[0.12em] uppercase shrink-0"
            style={{ color: "var(--t4)" }}>
            Crates
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {trackCrates.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1 text-[11px] px-2 py-[3px] rounded-full"
                style={{
                  background: `${c.color}14`,
                  border:     `0.5px solid ${c.color}30`,
                  color:      c.color,
                }}
              >
                <span className="w-[5px] h-[5px] rounded-full inline-block shrink-0"
                  style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
            {allCrates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCrateSheet(true)}
                className="text-[11px] transition-colors"
                style={{ color: "var(--teal)" }}
              >
                {trackCrates.length === 0 ? "+ Add to crate" : "Manage"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Add-to-crate sheet ───────────────────────────────────────── */}
      {showCrateSheet && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(3px)" }}
            onClick={() => setShowCrateSheet(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col rounded-t-[22px] animate-sheet-up"
            style={{
              background:    "var(--bg2)",
              borderTop:     "0.5px solid var(--rule2)",
              boxShadow:     "0 -20px 50px -10px rgba(0,0,0,0.6)",
              maxHeight:     "70vh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto mt-3 mb-4 w-9 h-1 rounded-full shrink-0"
              style={{ background: "var(--rule3)" }} />
            <div className="flex items-center justify-between px-5 mb-4 shrink-0">
              <p className="text-[15px] font-medium" style={{ color: "var(--t1)" }}>Add to crate</p>
              <button
                type="button"
                onClick={() => setShowCrateSheet(false)}
                className="text-[13px] font-medium"
                style={{ color: "var(--teal)" }}
              >
                Done
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5" style={{ scrollbarWidth: "none" }}>
              {allCrates.map((crate) => {
                const inCrate = trackCrates.some((c) => c.id === crate.id);
                return (
                  <button
                    key={crate.id}
                    type="button"
                    onClick={() => handleCrateToggle(crate)}
                    className="w-full flex items-center gap-3 py-3 text-left"
                    style={{ borderBottom: "0.5px solid var(--rule)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ background: `${crate.color}14`, border: `0.5px solid ${crate.color}30` }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: crate.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--t1)" }}>
                        {crate.name}
                      </p>
                      {crate.description && (
                        <p className="text-[11px] truncate" style={{ color: "var(--t3)" }}>
                          {crate.description}
                        </p>
                      )}
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
              })}
              {allCrates.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[13px]" style={{ color: "var(--t3)" }}>No crates yet.</p>
                  <Link
                    href="/crates/new"
                    onClick={() => setShowCrateSheet(false)}
                    className="text-[12px] mt-2 inline-block"
                    style={{ color: "var(--teal)" }}
                  >
                    Create one →
                  </Link>
                </div>
              )}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* ── Action bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-5 sm:px-8 pt-3 pb-4 mt-1"
        style={{ borderTop: "0.5px solid var(--rule)" }}
      >
        {/* Edit */}
        <Link
          href={`/track/${id}/edit`}
          className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors"
          style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t2)" }}
        >
          <EditIcon />
          Edit
        </Link>

        {/* Open source */}
        {track.sourceUrl && (
          <a
            href={tsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            <ExternalIcon />
            {hasTs ? "Open at timestamp" : "Open source"}
          </a>
        )}

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[12px] text-red-400 hover:text-red-300 transition-colors font-medium disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-[12px] transition-colors"
              style={{ color: "var(--t3)" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t3)" }}
            aria-label="Delete track"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

/* ─── Embed ──────────────────────────────────────────────────────────────── */

function getYouTubeEmbedId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function getSoundCloudEmbedUrl(url: string): string | null {
  if (!/soundcloud\.com/.test(url)) return null;
  try {
    const parsed = new URL(url);
    // mobile app shares m.soundcloud.com — widget only accepts soundcloud.com
    if (parsed.hostname === "m.soundcloud.com") parsed.hostname = "soundcloud.com";
    parsed.hash = "";
    parsed.searchParams.delete("t");
    let cleanUrl = parsed.toString();
    // strip trailing ? left after removing all params
    if (cleanUrl.endsWith("?")) cleanUrl = cleanUrl.slice(0, -1);
    const p = new URLSearchParams({
      url:           cleanUrl,
      color:         "#3d9e87",
      auto_play:     "false",
      hide_related:  "true",
      show_comments: "false",
      show_user:     "true",
      show_reposts:  "false",
      show_teaser:   "false",
    });
    return `https://w.soundcloud.com/player/?${p.toString()}`;
  } catch {
    return null;
  }
}

function TrackEmbed({ url, timestamp }: { url: string; timestamp: number | null }) {
  const ytId = getYouTubeEmbedId(url);
  const scUrl = getSoundCloudEmbedUrl(url);

  if (ytId) {
    const src = `https://www.youtube.com/embed/${ytId}${timestamp ? `?start=${timestamp}` : ""}`;
    return (
      <div className="mx-5 sm:mx-8 mb-4 rounded-[10px] overflow-hidden"
        style={{ border: "0.5px solid var(--rule2)", aspectRatio: "16/9" }}>
        <iframe
          src={src}
          title="YouTube player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          style={{ border: "none" }}
        />
      </div>
    );
  }

  if (scUrl) {
    const isSet = /\/sets\//.test(url);
    return (
      <div className="mx-5 sm:mx-8 mb-4">
        <div className="rounded-[10px] overflow-hidden"
          style={{ border: "0.5px solid var(--rule2)" }}>
          <iframe
            src={scUrl}
            title="SoundCloud player"
            allow="autoplay"
            className="w-full"
            style={{ border: "none", height: isSet ? 300 : 120 }}
          />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block text-right text-[11px] transition-colors"
          style={{ color: "var(--t4)" }}
        >
          Open on SoundCloud →
        </a>
      </div>
    );
  }

  return null;
}

/* ─── Detail thumb ───────────────────────────────────────────────────────── */

function DetailThumb({ track }: { track: Track }) {
  const size = { width: 78, height: 78, borderRadius: 8 };

  if (track.imageUrl) {
    return (
      <img
        src={track.imageUrl}
        alt={track.title}
        className="shrink-0 object-cover"
        style={{ ...size, border: "0.5px solid var(--rule2)" }}
      />
    );
  }

  if (track.recordType === "id_needed") {
    return (
      <div
        className="shrink-0 flex items-center justify-center text-[22px] font-medium"
        style={{ ...size, background: "var(--amber-soft)", border: "0.5px solid var(--amber-rule)", color: "var(--amber)" }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{ ...size, background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1} style={{ color: "var(--t4)" }}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

/* ─── Section row ────────────────────────────────────────────────────────── */

function SectionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 px-5 sm:px-8 py-[14px]"
      style={{ borderBottom: "0.5px solid var(--rule)" }}
    >
      <span className="text-[10px] tracking-[0.12em] uppercase shrink-0"
        style={{ color: "var(--t4)" }}>
        {label}
      </span>
      {children}
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

function BookmarkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"
      stroke="none" style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}>
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function TimestampIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
