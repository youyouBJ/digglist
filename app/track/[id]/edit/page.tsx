"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTrackById, updateTrack, type Track } from "@/lib/supabase-tracks";
import Header from "@/app/components/Header";

const PLATFORMS = ["YouTube", "SoundCloud", "Discogs", "TikTok", "Instagram", "Other"];
const STATUSES  = ["To listen", "To buy", "To play", "Inspiration"];

export default function EditTrackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack]   = useState<Track | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    getTrackById(id)
      .then((t) => setTrack(t))
      .catch((e: Error) => {
        setError(e.message);
        setTrack(null);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!track) return;
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await updateTrack(id, {
        title:          (data.get("title") as string) ?? "",
        artist:         (data.get("artist") as string) ?? "",
        sourcePlatform: (data.get("platform") as string) ?? "",
        sourceUrl:      (data.get("url") as string) ?? "",
        genre:          (data.get("genre") as string) ?? "",
        mood:           (data.get("mood") as string) ?? "",
        status:         (data.get("status") as string) ?? "",
        notes:          (data.get("notes") as string) ?? "",
      });
      router.push(`/track/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
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

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-12">
        <div className="w-full max-w-xl">
          <Link
            href={`/track/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-8"
          >
            ← Back to track
          </Link>

          <h2 className="text-2xl font-bold mb-8 tracking-tight">Edit track</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <Field label="Track title" required>
              <input
                type="text"
                name="title"
                defaultValue={track.title}
                required
                className={inputClass}
              />
            </Field>

            <Field label="Artist">
              <input
                type="text"
                name="artist"
                defaultValue={track.artist}
                className={inputClass}
              />
            </Field>

            <div className="flex gap-4">
              <Field label="Source platform" className="w-1/2">
                <select name="platform" defaultValue={track.sourcePlatform} className={inputClass}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source URL" className="w-1/2">
                <input
                  type="url"
                  name="url"
                  defaultValue={track.sourceUrl}
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="flex gap-4">
              <Field label="Genre" className="w-1/2">
                <input
                  type="text"
                  name="genre"
                  defaultValue={track.genre}
                  placeholder="e.g. Jazz, House, Soul…"
                  className={inputClass}
                />
              </Field>
              <Field label="Mood" className="w-1/2">
                <input
                  type="text"
                  name="mood"
                  defaultValue={track.mood}
                  placeholder="e.g. Chill, Dark, Uplifting…"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Status">
              <div className="flex flex-wrap gap-4 pt-1">
                {STATUSES.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      defaultChecked={track.status === s}
                      className="accent-white"
                    />
                    <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Notes">
              <textarea
                name="notes"
                rows={3}
                defaultValue={track.notes}
                placeholder="Context, feelings, where you found it…"
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link
                href={`/track/${id}`}
                className="px-6 py-3 rounded-full border border-white/10 text-white/40 text-sm hover:border-white/25 hover:text-white/70 transition-colors flex items-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

const inputClass =
  "w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {label}
        {required && <span className="text-white/60 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
