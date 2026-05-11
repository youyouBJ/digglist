"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTrackById, updateTrack, type Track } from "@/lib/supabase-tracks";
import { PLATFORMS, STATUSES, EMPTY_TRACK_FORM } from "@/lib/constants";
import { extractTimestampFromUrl, formatTimestamp } from "@/lib/timestamp";
import type { TrackFormState } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { Field, inputClass, PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";

export default function EditTrackPage() {
  const user            = useRequireAuth();
  const { id }          = useParams<{ id: string }>();
  const router          = useRouter();
  const [track, setTrack]           = useState<Track | null | undefined>(undefined);
  const [form, setForm]             = useState<TrackFormState>(EMPTY_TRACK_FORM);
  const [storedTimestamp, setStoredTimestamp] = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getTrackById(id)
      .then((t) => {
        if (!t) { setTrack(null); return; }
        setTrack(t);
        setStoredTimestamp(t.sourceTimestamp);
        setForm({
          title:    t.title,
          artist:   t.artist,
          platform: t.sourcePlatform,
          url:      t.sourceUrl,
          imageUrl: t.imageUrl,
          genre:    t.genre,
          mood:     t.mood,
          status:   t.status,
          notes:    t.notes,
        });
      })
      .catch((e: Error) => { setError(e.message); setTrack(null); });
  }, [id, user]);

  function set(field: keyof TrackFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Re-detect timestamp from current URL — updates if URL was changed
      const finalTimestamp = extractTimestampFromUrl(form.url) ?? storedTimestamp;
      await updateTrack(id, {
        title:           form.title,
        artist:          form.artist,
        sourcePlatform:  form.platform,
        sourceUrl:       form.url,
        imageUrl:        form.imageUrl,
        genre:           form.genre,
        mood:            form.mood,
        status:          form.status,
        notes:           form.notes,
        sourceTimestamp: finalTimestamp,
      });
      router.push(`/track/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
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

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-10 sm:py-12">
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

            {/* Cover preview */}
            {form.imageUrl && (
              <div className="flex items-center gap-3 bg-[#161616] border border-white/8 rounded-2xl px-4 py-3">
                <img
                  src={form.imageUrl}
                  alt="Current cover"
                  className="w-11 h-11 rounded-lg object-cover shrink-0"
                />
                <p className="text-xs text-white/25 truncate flex-1">Cover image attached</p>
                <button
                  type="button"
                  onClick={() => set("imageUrl", "")}
                  className="shrink-0 text-xs text-white/25 hover:text-red-400 transition-colors"
                  aria-label="Remove cover"
                >
                  ✕
                </button>
              </div>
            )}

            <Field label="Track title" required>
              <input
                type="text"
                placeholder="e.g. Midnight Rider"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Artist">
              <input
                type="text"
                placeholder="e.g. Allman Brothers Band"
                value={form.artist}
                onChange={(e) => set("artist", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="flex flex-col sm:flex-row gap-4">
              <Field label="Platform" className="sm:w-1/2">
                <select
                  value={form.platform}
                  onChange={(e) => set("platform", e.target.value)}
                  className={inputClass}
                >
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Source URL" className="sm:w-1/2">
                <input
                  type="url"
                  placeholder="https://…"
                  value={form.url}
                  onChange={(e) => set("url", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Timestamp — computed from URL, read-only */}
            {(extractTimestampFromUrl(form.url) ?? storedTimestamp) !== null && (
              <p className="text-xs text-orange-400/70 font-mono -mt-1 px-1">
                ⏱ Timestamp: {formatTimestamp((extractTimestampFromUrl(form.url) ?? storedTimestamp)!)}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Field label="Genre" className="sm:w-1/2">
                <input
                  type="text"
                  placeholder="e.g. Jazz, House, Soul…"
                  value={form.genre}
                  onChange={(e) => set("genre", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Mood" className="sm:w-1/2">
                <input
                  type="text"
                  placeholder="e.g. Chill, Dark, Uplifting…"
                  value={form.mood}
                  onChange={(e) => set("mood", e.target.value)}
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
                      checked={form.status === s}
                      onChange={() => set("status", s)}
                      className="accent-white"
                    />
                    <span className="text-sm text-white/60 group-hover:text-white transition-colors">{s}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Notes">
              <textarea
                rows={3}
                placeholder="Context, feelings, where you found it…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
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
