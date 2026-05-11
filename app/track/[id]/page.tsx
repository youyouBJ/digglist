"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTrackById, deleteTrack, type Track } from "@/lib/supabase-tracks";
import Header from "@/app/components/Header";

const STATUS_COLORS: Record<string, string> = {
  "To listen":   "bg-blue-500/15 text-blue-300",
  "To buy":      "bg-yellow-500/15 text-yellow-300",
  "To play":     "bg-green-500/15 text-green-300",
  "Inspiration": "bg-purple-500/15 text-purple-300",
};

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack]           = useState<Track | null | undefined>(undefined);
  const [error, setError]           = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getTrackById(id)
      .then((t) => setTrack(t))
      .catch((e: Error) => {
        setError(e.message);
        setTrack(null);
      });
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTrack(id);
      router.push("/library");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete track.");
      setDeleting(false);
    }
  }

  if (track === undefined) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-white/30 text-sm">Loading…</p>
        </div>
      </main>
    );
  }

  if (track === null) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
          <p className="text-white/40">{error ?? "Track not found."}</p>
          <Link href="/library" className="text-sm text-white hover:text-white/70 transition-colors underline">
            Back to Library
          </Link>
        </div>
      </main>
    );
  }

  const statusColor = STATUS_COLORS[track.status] ?? "bg-white/10 text-white/50";

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-12">
        <div className="w-full max-w-xl">

          {/* Back */}
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-8"
          >
            ← Library
          </Link>

          {/* Error */}
          {error && (
            <p className="mb-6 text-sm text-red-400 text-center">{error}</p>
          )}

          {/* Title block */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-1">{track.title}</h2>
              {track.artist && (
                <p className="text-lg text-white/50">{track.artist}</p>
              )}
            </div>
            <span className={`shrink-0 mt-1 px-3 py-1.5 rounded-full text-xs font-semibold ${statusColor}`}>
              {track.status}
            </span>
          </div>

          {/* Details grid */}
          <div className="bg-[#161616] border border-white/8 rounded-2xl divide-y divide-white/5">
            <DetailRow label="Platform" value={track.sourcePlatform} />
            {track.genre     && <DetailRow label="Genre" value={track.genre} />}
            {track.mood      && <DetailRow label="Mood"  value={track.mood} />}
            {track.sourceUrl && (
              <div className="flex items-baseline justify-between gap-4 px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/30 shrink-0">
                  Source URL
                </span>
                <a
                  href={track.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 hover:text-white transition-colors underline underline-offset-2 truncate text-right"
                >
                  {track.sourceUrl}
                </a>
              </div>
            )}
            <DetailRow
              label="Added"
              value={new Date(track.createdAt).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            />
          </div>

          {/* Notes */}
          {track.notes && (
            <div className="mt-6 bg-[#161616] border border-white/8 rounded-2xl px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Notes</p>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{track.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center gap-4">
            <Link
              href={`/track/${track.id}/edit`}
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Edit
            </Link>

            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">Delete this track?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="text-sm text-white/30 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-6 py-2.5 rounded-full border border-white/10 text-white/40 text-sm hover:border-red-500/40 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-6 py-4">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/30 shrink-0">
        {label}
      </span>
      <span className="text-sm text-white/60 text-right">{value}</span>
    </div>
  );
}
