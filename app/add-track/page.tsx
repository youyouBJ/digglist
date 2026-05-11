"use client";

import Link from "next/link";
import { useState } from "react";
import { saveTrack } from "@/lib/tracks";
import Header from "@/app/components/Header";

const PLATFORMS = ["YouTube", "SoundCloud", "Discogs", "TikTok", "Instagram", "Other"];
const STATUSES = ["To listen", "To buy", "To play", "Inspiration"];

export default function AddTrackPage() {
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    saveTrack({
      title:          (data.get("title") as string) ?? "",
      artist:         (data.get("artist") as string) ?? "",
      sourcePlatform: (data.get("platform") as string) ?? "",
      sourceUrl:      (data.get("url") as string) ?? "",
      genre:          (data.get("genre") as string) ?? "",
      mood:           (data.get("mood") as string) ?? "",
      status:         (data.get("status") as string) ?? "",
      notes:          (data.get("notes") as string) ?? "",
    });
    setSaved(true);
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
                  onClick={() => setSaved(false)}
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
              <Field label="Track title" required>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Midnight Rider"
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Artist">
                <input
                  type="text"
                  name="artist"
                  placeholder="e.g. Allman Brothers Band"
                  className={inputClass}
                />
              </Field>

              <div className="flex gap-4">
                <Field label="Source platform" className="w-1/2">
                  <select name="platform" className={inputClass}>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Source URL" className="w-1/2">
                  <input
                    type="url"
                    name="url"
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
                    placeholder="e.g. Jazz, House, Soul…"
                    className={inputClass}
                  />
                </Field>
                <Field label="Mood" className="w-1/2">
                  <input
                    type="text"
                    name="mood"
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
                        defaultChecked={s === "To listen"}
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
                  placeholder="Context, feelings, where you found it…"
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <button
                type="submit"
                className="mt-2 w-full py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors"
              >
                Save Track
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
