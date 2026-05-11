"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTrackById, deleteTrack, type Track } from "@/lib/supabase-tracks";
import { getStatusColor } from "@/lib/constants";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";

export default function TrackDetailPage() {
  const user                              = useRequireAuth();
  const { id }                            = useParams<{ id: string }>();
  const router                            = useRouter();
  const [track, setTrack]                 = useState<Track | null | undefined>(undefined);
  const [error, setError]                 = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    getTrackById(id)
      .then(setTrack)
      .catch((e: Error) => { setError(e.message); setTrack(null); });
  }, [id, user]);

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

  const statusColor = getStatusColor(track.status);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-10 sm:py-12">
        <div className="w-full max-w-xl">

          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-8"
          >
            ← Library
          </Link>

          {error && (
            <p className="mb-6 text-sm text-red-400 text-center">{error}</p>
          )}

          {/* Title block */}
          <div className="flex items-start gap-4 sm:gap-5 mb-8">
            {track.imageUrl && (
              <img
                src={track.imageUrl}
                alt={track.title}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0"
              />
            )}
            <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 leading-tight">
                  {track.title}
                </h2>
                {track.artist && (
                  <p className="text-base sm:text-lg text-white/50">{track.artist}</p>
                )}
              </div>
              <span className={`shrink-0 mt-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold ${statusColor}`}>
                {track.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="bg-[#161616] border border-white/8 rounded-2xl divide-y divide-white/5">
            <DetailRow label="Platform" value={track.sourcePlatform} />
            {track.genre && <DetailRow label="Genre" value={track.genre} />}
            {track.mood  && <DetailRow label="Mood"  value={track.mood} />}
            {track.sourceUrl && (
              <div className="flex items-baseline justify-between gap-4 px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/30 shrink-0">
                  Source
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

          {track.notes && (
            <div className="mt-4 bg-[#161616] border border-white/8 rounded-2xl px-6 py-5">
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
