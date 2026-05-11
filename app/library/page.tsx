"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTracks, deleteTrack, type Track } from "@/lib/tracks";
import Header from "@/app/components/Header";

const PLATFORMS = ["YouTube", "SoundCloud", "Discogs", "TikTok", "Instagram", "Other"];
const STATUSES  = ["To listen", "To buy", "To play", "Inspiration"];

const STATUS_COLORS: Record<string, string> = {
  "To listen":   "bg-blue-500/15 text-blue-300",
  "To buy":      "bg-yellow-500/15 text-yellow-300",
  "To play":     "bg-green-500/15 text-green-300",
  "Inspiration": "bg-purple-500/15 text-purple-300",
};

export default function LibraryPage() {
  const [tracks, setTracks]             = useState<Track[]>([]);
  const [search, setSearch]             = useState("");
  const [platformFilter, setPlatform]   = useState("");
  const [statusFilter, setStatus]       = useState("");
  const [confirmId, setConfirmId]       = useState<string | null>(null);

  useEffect(() => { setTracks(getTracks()); }, []);

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

  function handleDelete(id: string) {
    deleteTrack(id);
    setTracks(getTracks());
    setConfirmId(null);
  }

  function clearFilters() {
    setSearch("");
    setPlatform("");
    setStatus("");
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Library
              {tracks.length > 0 && (
                <span className="ml-3 text-base font-normal text-white/30">
                  {filtered.length !== tracks.length
                    ? `${filtered.length} / ${tracks.length}`
                    : `${tracks.length} track${tracks.length > 1 ? "s" : ""}`}
                </span>
              )}
            </h2>
          </div>

          {/* Search + Filters */}
          {tracks.length > 0 && (
            <div className="flex flex-col gap-3 mb-8">
              <input
                type="text"
                placeholder="Search by title, artist, genre, mood, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
              />
              <div className="flex gap-3 flex-wrap items-center">
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
                    onClick={clearFilters}
                    className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {tracks.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-white/30 text-sm">
              No tracks match your search.
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
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
  const statusColor = STATUS_COLORS[track.status] ?? "bg-white/10 text-white/50";

  return (
    <li className="group bg-[#161616] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors">
      <Link href={`/track/${track.id}`} className="block px-6 py-5">
        <div className="flex flex-col gap-3">
          {/* Top */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-base font-semibold text-white truncate">{track.title}</span>
              {track.artist && (
                <span className="text-sm text-white/50">{track.artist}</span>
              )}
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
              {track.status}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/40">{track.sourcePlatform}</span>
            {track.genre && <Tag>{track.genre}</Tag>}
            {track.mood  && <Tag>{track.mood}</Tag>}
          </div>

          {track.notes && (
            <p className="text-sm text-white/40 leading-relaxed line-clamp-2">
              {track.notes}
            </p>
          )}

          <span className="text-xs text-white/20">
            {new Date(track.createdAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
      </Link>

      {/* Delete area */}
      <div className="px-6 pb-4 flex items-center gap-3">
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
            className="text-xs text-white/25 hover:text-red-400 transition-colors group-hover:text-white/40"
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
        href="/add-track"
        className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
      >
        + Add Track
      </Link>
    </div>
  );
}
