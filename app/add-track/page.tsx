"use client";

import Link from "next/link";
import { useState } from "react";
import { createTrack } from "@/lib/supabase-tracks";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import Header from "@/app/components/Header";

const PLATFORMS = ["YouTube", "SoundCloud", "Discogs", "TikTok", "Instagram", "Other"];
const STATUSES  = ["To listen", "To buy", "To play", "Inspiration"];

type FormState = {
  title: string;
  artist: string;
  platform: string;
  url: string;
  imageUrl: string;
  genre: string;
  mood: string;
  status: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  title:    "",
  artist:   "",
  platform: "YouTube",
  url:      "",
  imageUrl: "",
  genre:    "",
  mood:     "",
  status:   "To listen",
  notes:    "",
};

export default function AddTrackPage() {
  const user = useRequireAuth();

  const [form, setForm]     = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Fetch metadata state
  const [fetchUrl, setFetchUrl]   = useState("");
  const [fetching, setFetching]   = useState(false);
  const [fetchMsg, setFetchMsg]   = useState<{ type: "error" | "success"; text: string } | null>(null);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-white/30 text-sm">Loading…</p>
        </div>
      </main>
    );
  }

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFetch() {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(fetchUrl.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not fetch metadata.");
      setForm((prev) => ({
        ...prev,
        title:    data.title    || prev.title,
        artist:   data.artist   || prev.artist,
        platform: PLATFORMS.includes(data.platform) ? data.platform : prev.platform,
        url:      data.sourceUrl || prev.url,
        imageUrl: data.imageUrl  || prev.imageUrl,
      }));
      setFetchMsg({ type: "success", text: "Metadata imported — verify the fields then save." });
    } catch (err) {
      setFetchMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Could not fetch metadata.",
      });
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTrack({
        title:          form.title,
        artist:         form.artist,
        sourcePlatform: form.platform,
        sourceUrl:      form.url,
        imageUrl:       form.imageUrl,
        genre:          form.genre,
        mood:           form.mood,
        status:         form.status,
        notes:          form.notes,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save track.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center flex-1 px-4 py-12">
        <div className="w-full max-w-xl">
          <h2 className="text-2xl font-bold mb-8 tracking-tight">Add a track</h2>

          {saved ? (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
              <p className="text-3xl">✅</p>
              <p className="text-xl font-semibold text-white">Track saved!</p>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => { setSaved(false); setForm(EMPTY_FORM); setFetchUrl(""); setFetchMsg(null); }}
                  className="px-6 py-2 rounded-full border border-white/20 text-white/70 text-sm hover:border-white/50 hover:text-white transition-colors"
                >
                  Add another
                </button>
                <Link
                  href="/library"
                  className="px-6 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  View Library
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* ── Import from URL ── */}
              <div className="bg-[#161616] border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Import from URL
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste a YouTube, SoundCloud or Discogs URL…"
                    value={fetchUrl}
                    onChange={(e) => setFetchUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetch(); } }}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleFetch}
                    disabled={fetching || !fetchUrl.trim()}
                    className="shrink-0 px-4 py-3 rounded-xl border border-white/15 text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {fetching ? "Fetching…" : "Fetch metadata"}
                  </button>
                </div>
                {fetchMsg && (
                  <p className={`text-xs ${fetchMsg.type === "error" ? "text-red-400" : "text-green-400"}`}>
                    {fetchMsg.text}
                  </p>
                )}
                {form.imageUrl && (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.imageUrl}
                      alt="Cover preview"
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <p className="text-xs text-white/30 truncate">{form.imageUrl}</p>
                    <button
                      type="button"
                      onClick={() => set("imageUrl", "")}
                      className="shrink-0 text-xs text-white/25 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              {/* ── Manual fields ── */}
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

              <div className="flex gap-4">
                <Field label="Source platform" className="w-1/2">
                  <select
                    value={form.platform}
                    onChange={(e) => set("platform", e.target.value)}
                    className={inputClass}
                  >
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Source URL" className="w-1/2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => set("url", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex gap-4">
                <Field label="Genre" className="w-1/2">
                  <input
                    type="text"
                    placeholder="e.g. Jazz, House, Soul…"
                    value={form.genre}
                    onChange={(e) => set("genre", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Mood" className="w-1/2">
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

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Track"}
              </button>
            </form>
          )}
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
