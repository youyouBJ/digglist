"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTracks, deleteTrack, type Track } from "@/lib/supabase-tracks";
import { PLATFORMS, STATUSES, getStatusColor } from "@/lib/constants";
import { formatTimestamp } from "@/lib/timestamp";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";

export default function LibraryPage() {
  const user = useRequireAuth();

  const [tracks, setTracks]           = useState<Track[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [platformFilter, setPlatform] = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [confirmId, setConfirmId]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getTracks()
      .then(setTracks)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <PageLoader />;

  const hasFilters = search !== "" || platformFilter !== "" || statusFilter !== "";

  const filtered = tracks.filter((t) => {
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
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-10 sm:py-12">
        <div className="w-full max-w-2xl">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Library
              {!loading && tracks.length > 0 && (
                <span className="ml-3 text-base font-normal text-white/30">
                  {filtered.length !== tracks.length
                    ? `${filtered.length} / ${tracks.length}`
                    : `${tracks.length} track${tracks.length !== 1 ? "s" : ""}`}
                </span>
              )}
            </h2>
          </div>

          {error && (
            <p className="mb-6 text-sm text-red-400 text-center">{error}</p>
          )}

          {loading ? (
            <div className="py-24 text-center text-white/30 text-sm">Loading…</div>
          ) : (
            <>
              {tracks.length > 0 && (
                <div className="flex flex-col gap-3 mb-8">
                  <input
                    type="text"
                    placeholder="Search by title, artist, genre, mood, notes…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
                  />
                  <div className="flex gap-2 flex-wrap items-center">
                    <select
                      value={platformFilter}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 focus:outline-none focus:border-white/30 transition-colors"
                    >
                      <option value="">All platforms</option>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatus(e.target.value)}
                      className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 focus:outline-none focus:border-white/30 transition-colors"
                    >
                      <option value="">All statuses</option>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={() => { setSearch(""); setPlatform(""); setStatus(""); }}
                        className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-2"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {tracks.length === 0 ? (
                <EmptyState />
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-white/30 text-sm">
                  No tracks match your search.
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {filtered.map((track) => (
                    <TrackCard
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
        </div>
      </section>
    </main>
  );
}

function TrackCard({
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
  const statusColor = getStatusColor(track.status);

  return (
    <li className="group bg-[#161616] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors">
      <Link href={`/track/${track.id}`} className="block px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex gap-4 items-start">
          {track.imageUrl ? (
            <img
              src={track.imageUrl}
              alt={track.title}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0"
            />
          ) : track.status === "IDs Needed" ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0 flex items-center justify-center text-orange-300/50 text-lg font-bold">
              ?
            </div>
          ) : null}
          <div className="flex flex-col gap-2.5 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`text-base font-semibold truncate leading-snug ${
                  !track.title && track.status === "IDs Needed"
                    ? "text-white/40 italic"
                    : "text-white"
                }`}>
                  {track.title || (track.status === "IDs Needed" ? "Unknown track" : "Untitled")}
                </span>
                {track.artist && (
                  <span className="text-sm text-white/50">{track.artist}</span>
                )}
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                {track.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/35">{track.sourcePlatform}</span>
              {track.sourceTimestamp !== null && track.sourceTimestamp !== undefined && (
                <span className="text-xs text-orange-400/60 font-mono">
                  ⏱ {formatTimestamp(track.sourceTimestamp)}
                </span>
              )}
              {track.genre && <Tag>{track.genre}</Tag>}
              {track.mood  && <Tag>{track.mood}</Tag>}
            </div>

            {track.notes && (
              <p className="text-sm text-white/35 leading-relaxed line-clamp-2">
                {track.notes}
              </p>
            )}

            <span className="text-xs text-white/20">
              {new Date(track.createdAt).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-5 pb-4 sm:px-6 flex items-center gap-3">
        {confirming ? (
          <>
            <span className="text-xs text-white/50">Delete this track?</span>
            <button
              type="button"
              onClick={onConfirmDelete}
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAskDelete}
            className="text-xs text-white/20 hover:text-red-400 transition-colors group-hover:text-white/35"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/40 text-xs border border-white/8">
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 py-24 text-center">
      <p className="text-4xl">🎵</p>
      <p className="text-white/40 text-base">No tracks saved yet.</p>
      <Link
        href="/quick-add"
        className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
      >
        + Add Track
      </Link>
    </div>
  );
}
