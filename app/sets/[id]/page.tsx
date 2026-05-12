"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSetById, deleteSet, getSetTracks, type MixSet } from "@/lib/supabase-sets";
import { createTrack, type Track } from "@/lib/supabase-tracks";
import { formatTimestamp, buildTimestampUrl, parseManualTimestamp } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

export default function SetDetailPage() {
  const user   = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [set, setSet]         = useState<MixSet | null | undefined>(undefined);
  const [moments, setMoments] = useState<Track[]>([]);
  const [error, setError]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  /* Log moment sheet */
  const [showSheet, setShowSheet]   = useState(false);
  const [logMode, setLogMode]       = useState<"track" | "id">("track");
  const [logTs, setLogTs]           = useState("");
  const [logTitle, setLogTitle]     = useState("");
  const [logArtist, setLogArtist]   = useState("");
  const [logNotes, setLogNotes]     = useState("");
  const [logSaving, setLogSaving]   = useState(false);
  const prevOverflow                = useRef("");

  useEffect(() => {
    if (!user) return;
    Promise.all([getSetById(id), getSetTracks(id)])
      .then(([s, m]) => { setSet(s); setMoments(m); })
      .catch((e: Error) => { setError(e.message); setSet(null); });
  }, [id, user]);

  useEffect(() => {
    if (showSheet) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => { document.body.style.overflow = prevOverflow.current; };
  }, [showSheet]);

  function openSheet() {
    setLogTs(""); setLogTitle(""); setLogArtist(""); setLogNotes("");
    setLogMode("track");
    setShowSheet(true);
  }

  async function handleLogMoment() {
    if (!set) return;
    const ts = parseManualTimestamp(logTs);
    setLogSaving(true);
    try {
      const newTrack = await createTrack({
        title:           logMode === "track" ? logTitle.trim() : "Unknown track",
        artist:          logArtist.trim(),
        label:           "",
        recordType:      logMode === "track" ? "track" : "id_needed",
        rating:          null,
        sourcePlatform:  set.platform ?? "",
        sourceUrl:       set.sourceUrl ?? "",
        imageUrl:        "",
        genre:           "",
        mood:            "",
        status:          logMode === "track" ? "" : "IDs Needed",
        notes:           logMode === "id" ? logNotes.trim() : "",
        sourceTimestamp: ts,
        timestampEnd:    null,
        videoAuthor:     "",
        trackIdHint:     "",
        setId:           set.id,
      });
      setMoments((prev) => {
        const updated = [...prev, newTrack];
        return updated.sort((a, b) => {
          if (a.sourceTimestamp === null) return 1;
          if (b.sourceTimestamp === null) return -1;
          return a.sourceTimestamp - b.sourceTimestamp;
        });
      });
      setShowSheet(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save moment.");
    } finally {
      setLogSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSet(id);
      router.push("/sets");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
      setDeleting(false);
    }
  }

  if (!user || set === undefined) return <PageLoader />;

  if (set === null) {
    return (
      <PageError
        message={error ?? "Set not found."}
        backHref="/sets"
        backLabel="Back to Sets"
      />
    );
  }

  const trackMoments = moments.filter((m) => m.recordType !== "id_needed");
  const idMoments    = moments.filter((m) => m.recordType === "id_needed");

  return (
    <main className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Back bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link href="/sets" className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--teal)" }}>
          <ArrowLeft />
          Sets
        </Link>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 px-5 sm:px-8 pb-5">
        {set.coverUrl ? (
          <img src={set.coverUrl} alt={set.title}
            className="shrink-0 object-cover rounded-[8px]"
            style={{ width: 78, height: 78, border: "0.5px solid var(--rule2)" }} />
        ) : (
          <div className="shrink-0 flex items-center justify-center rounded-[8px]"
            style={{ width: 78, height: 78, background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}>
            <WaveIconLarge />
          </div>
        )}
        <div className="flex-1 min-w-0 pt-[2px]">
          {set.platform && (
            <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
              style={{ color: "var(--teal)" }}>
              {set.platform}
            </p>
          )}
          <h2 className="text-[20px] font-medium tracking-[-0.02em] leading-[1.2] mb-1"
            style={{ color: "var(--t1)" }}>
            {set.title || "Untitled set"}
          </h2>
          <p className="text-[11px]" style={{ color: "var(--t3)" }}>
            {formatDate(set.createdAt)}
            {moments.length > 0 && ` · ${moments.length} ${moments.length === 1 ? "moment" : "moments"}`}
          </p>
        </div>
      </div>

      {set.notes && (
        <div className="mx-5 sm:mx-8 mb-4 rounded-[8px] px-3 py-2.5"
          style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}>
          <p className="text-[13px] leading-[1.6]" style={{ color: "var(--t2)" }}>
            {set.notes}
          </p>
        </div>
      )}

      {error && (
        <p className="mx-5 sm:mx-8 mb-4 text-sm text-red-400">{error}</p>
      )}

      {/* ── Embed ─────────────────────────────────────────────────────── */}
      {set.sourceUrl && <SetEmbed url={set.sourceUrl} />}

      {/* ── Moments list ──────────────────────────────────────────────── */}
      <div style={{ borderTop: "0.5px solid var(--rule)" }}>
        {moments.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center px-8">
            <p className="text-[13px]" style={{ color: "var(--t3)" }}>No moments logged yet.</p>
            <p className="text-[12px]" style={{ color: "var(--t4)" }}>
              Log the tracks and IDs you discover while listening.
            </p>
          </div>
        ) : (
          <>
            {trackMoments.length > 0 && (
              <>
                <SectionHeader label="Tracks" count={trackMoments.length} />
                {trackMoments.map((m) => <MomentRow key={m.id} track={m} set={set} />)}
              </>
            )}
            {idMoments.length > 0 && (
              <>
                <SectionHeader label="IDs" count={idMoments.length} amber />
                {idMoments.map((m) => <MomentRow key={m.id} track={m} set={set} />)}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 sm:px-8 pt-3 pb-4 mt-1"
        style={{ borderTop: "0.5px solid var(--rule)" }}>
        <button
          type="button"
          onClick={openSheet}
          className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium"
          style={{ background: "var(--t1)", color: "var(--bg)" }}
        >
          <PlusIcon />
          Log from set
        </button>

        {set.sourceUrl && (
          <a
            href={set.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t2)" }}
          >
            <ExternalIcon />
            Open set
          </a>
        )}

        <Link
          href={`/sets/${id}/edit`}
          className="w-10 h-10 flex items-center justify-center rounded-lg"
          style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t3)" }}
          aria-label="Edit set"
        >
          <EditIcon />
        </Link>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-[12px] text-red-400 font-medium disabled:opacity-50">
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)}
              className="text-[12px]" style={{ color: "var(--t3)" }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg"
            style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t3)" }}
            aria-label="Delete set"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      <BottomNav />

      {/* ── Log moment sheet ──────────────────────────────────────────── */}
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
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto mt-3 mb-4 w-9 h-1 rounded-full shrink-0"
              style={{ background: "var(--rule3)" }} />

            <div className="flex items-center justify-between px-5 mb-1 shrink-0">
              <p className="text-[15px] font-medium" style={{ color: "var(--t1)" }}>Log from this set</p>
              <button type="button" onClick={() => setShowSheet(false)}
                className="text-[13px]" style={{ color: "var(--t3)" }}>
                Cancel
              </button>
            </div>
            <p className="px-5 mb-4 text-[11px]" style={{ color: "var(--t3)" }}>
              A moment at a specific timestamp in this set.
            </p>

            {/* Mode toggle */}
            <div className="flex px-5 mb-4 gap-2 shrink-0">
              {(["track", "id"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLogMode(m)}
                  className="flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: logMode === m ? "var(--bg4)" : "transparent",
                    border:     "0.5px solid var(--rule2)",
                    color:      logMode === m
                      ? (m === "id" ? "var(--amber)" : "var(--t1)")
                      : "var(--t3)",
                  }}
                >
                  {m === "track" ? "I know it" : "Unknown track"}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5 flex flex-col gap-4">
              {/* Timestamp */}
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5"
                  style={{ color: "var(--t4)" }}>
                  Timestamp
                  <span className="ml-1 normal-case tracking-normal"
                    style={{ color: "var(--t4)", opacity: 0.6 }}>— optional</span>
                </p>
                <input
                  type="text"
                  value={logTs}
                  onChange={(e) => setLogTs(e.target.value)}
                  placeholder="1:23:45"
                  autoFocus
                  className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                  style={{
                    background:  "var(--bg3)",
                    border:      "0.5px solid var(--rule2)",
                    color:       "var(--t1)",
                    caretColor:  logMode === "id" ? "var(--amber)" : "var(--teal)",
                    fontFamily:  "var(--font-jb-mono, monospace)",
                  }}
                />
              </div>

              {logMode === "track" ? (
                <>
                  <div>
                    <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5"
                      style={{ color: "var(--t4)" }}>Artist</p>
                    <input type="text" value={logArtist}
                      onChange={(e) => setLogArtist(e.target.value)}
                      placeholder="Artist name"
                      className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                      style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: "var(--teal)" }}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5"
                      style={{ color: "var(--t4)" }}>Title</p>
                    <input type="text" value={logTitle}
                      onChange={(e) => setLogTitle(e.target.value)}
                      placeholder="Track title"
                      className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                      style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: "var(--teal)" }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5"
                      style={{ color: "var(--t4)" }}>
                      Artist
                      <span className="ml-1 normal-case tracking-normal"
                        style={{ color: "var(--t4)", opacity: 0.6 }}>— optional</span>
                    </p>
                    <input
                      type="text"
                      value={logArtist}
                      onChange={(e) => setLogArtist(e.target.value)}
                      placeholder="If you know who's playing…"
                      className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                      style={{ background: "var(--bg3)", border: "0.5px solid var(--amber-rule)", color: "var(--t1)", caretColor: "var(--amber)" }}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5"
                      style={{ color: "var(--t4)" }}>
                      Notes
                      <span className="ml-1 normal-case tracking-normal"
                        style={{ color: "var(--t4)", opacity: 0.6 }}>— optional</span>
                    </p>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Anything you remember about this track…"
                      rows={2}
                      className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none resize-none"
                      style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: "var(--amber)" }}
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleLogMoment}
                disabled={logSaving || (logMode === "track" && !logTitle.trim() && !logArtist.trim())}
                className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
                style={{
                  background: logMode === "id" ? "var(--amber-soft)" : "var(--t1)",
                  border:     logMode === "id" ? "0.5px solid var(--amber-rule)" : "none",
                  color:      logMode === "id" ? "var(--amber)" : "var(--bg)",
                }}
              >
                {logSaving ? "Saving…" : logMode === "track" ? "Save track →" : "Log as ID →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────── */

function SectionHeader({ label, count, amber }: { label: string; count: number; amber?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-5 sm:px-8 py-[10px]"
      style={{ borderBottom: "0.5px solid var(--rule)", background: "var(--bg)" }}
    >
      <span className="text-[10px] tracking-[0.12em] uppercase font-medium"
        style={{ color: amber ? "rgba(201,162,74,0.6)" : "var(--t4)" }}>
        {label}
      </span>
      <span className="text-[11px]" style={{ color: amber ? "var(--amber)" : "var(--t3)", fontFeatureSettings: '"tnum"' }}>
        {count}
      </span>
    </div>
  );
}

/* ─── Moment row ─────────────────────────────────────────────────────────── */

function MomentRow({ track, set }: { track: Track; set: MixSet }) {
  const isId      = track.recordType === "id_needed";
  const hasTs     = track.sourceTimestamp !== null && track.sourceTimestamp !== undefined;
  const tsLink    = hasTs && set.sourceUrl
    ? buildTimestampUrl(set.sourceUrl, track.sourceTimestamp)
    : null;

  return (
    <Link
      href={`/track/${track.id}`}
      className="flex items-center gap-3 px-5 sm:px-8 py-[13px] transition-opacity active:opacity-70"
      style={{ borderBottom: "0.5px solid var(--rule)" }}
    >
      {/* Timestamp or placeholder */}
      <div className="shrink-0 w-[52px]">
        {hasTs ? (
          <span
            className="text-[12px] font-medium"
            style={{
              color:       isId ? "var(--amber)" : "var(--teal)",
              fontFamily:  "var(--font-jb-mono, monospace)",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatTimestamp(track.sourceTimestamp!)}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: "var(--t4)" }}>—</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {isId ? (
          <>
            <div className="flex items-center gap-2 mb-[3px]">
              <span className="text-[11px] px-1.5 py-[2px] rounded shrink-0"
                style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "0.5px solid var(--amber-rule)" }}>
                ID
              </span>
              {track.artist && (
                <p className="text-[12px] truncate" style={{ color: "rgba(201,162,74,0.75)" }}>
                  {track.artist}
                </p>
              )}
            </div>
            {track.notes && (
              <p className="text-[11px] line-clamp-1" style={{ color: "rgba(201,162,74,0.55)" }}>
                {track.notes}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[13px] font-medium truncate" style={{ color: "var(--t1)" }}>
              {track.title || "Untitled"}
            </p>
            {track.artist && (
              <p className="text-[11px] truncate mt-[1px]" style={{ color: "var(--t3)" }}>
                {track.artist}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {tsLink && (
          <a
            href={tsLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t3)" }}
            aria-label={`Open at ${formatTimestamp(track.sourceTimestamp!)}`}
          >
            <PlayIcon />
          </a>
        )}
        <ChevronIcon />
      </div>
    </Link>
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
    if (parsed.hostname === "m.soundcloud.com") parsed.hostname = "soundcloud.com";
    parsed.hash = "";
    parsed.searchParams.delete("t");
    let cleanUrl = parsed.toString();
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

function SetEmbed({ url }: { url: string }) {
  const ytId = getYouTubeEmbedId(url);
  const scUrl = getSoundCloudEmbedUrl(url);

  if (ytId) {
    return (
      <div className="mx-5 sm:mx-8 mb-4 rounded-[10px] overflow-hidden"
        style={{ border: "0.5px solid var(--rule2)", aspectRatio: "16/9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
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
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="mt-1.5 block text-right text-[11px]"
          style={{ color: "var(--t4)" }}>
          Open on SoundCloud →
        </a>
      </div>
    );
  }

  /* Link card for Bandcamp / TikTok / Instagram sets */
  const name = /bandcamp\.com/.test(url) ? "Bandcamp"
    : /tiktok\.com/.test(url)    ? "TikTok"
    : /instagram\.com/.test(url) ? "Instagram"
    : null;

  if (!name) return null;

  const accent = name === "Bandcamp"  ? "#1da0c3"
    : name === "Instagram" ? "#c13584"
    : "var(--t2)";
  const badge  = name === "Bandcamp" ? "bc" : name === "TikTok" ? "tt" : "ig";

  return (
    <div className="mx-5 sm:mx-8 mb-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-[10px] px-4 py-[13px] transition-opacity active:opacity-70"
        style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
      >
        <div
          className="shrink-0 w-8 h-8 rounded-[6px] flex items-center justify-center text-[11px] font-bold tracking-tight"
          style={{ background: "var(--bg4)", border: "0.5px solid var(--rule2)", color: accent }}
        >
          {badge}
        </div>
        <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--t2)" }}>
          Open on {name}
        </span>
        <ExternalIcon />
      </a>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
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

function WaveIconLarge() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.2} style={{ color: "var(--t4)" }}>
      <rect x="3"  y="14" width="2.5" height="6" rx="1.25" />
      <rect x="8"  y="9"  width="2.5" height="11" rx="1.25" />
      <rect x="13" y="5"  width="2.5" height="15" rx="1.25" />
      <rect x="18" y="11" width="2.5" height="8" rx="1.25" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5,3 19,12 5,21" />
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

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}
      style={{ color: "var(--t4)", flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}
