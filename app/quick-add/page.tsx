"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createTrack } from "@/lib/supabase-tracks";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PLATFORMS, STATUSES } from "@/lib/constants";
import { PageLoader } from "@/app/components/ui";

type FetchPhase = "idle" | "fetching" | "ready" | "error";

const URL_RE = /^https?:\/\/.+\..+/;

export default function QuickAddPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [url, setUrl]               = useState("");
  const [phase, setPhase]           = useState<FetchPhase>("idle");
  const [fetchError, setFetchError] = useState("");
  const [title, setTitle]           = useState("");
  const [artist, setArtist]         = useState("");
  const [platform, setPlatform]     = useState("Other");
  const [imageUrl, setImageUrl]     = useState("");
  const [status, setStatus]         = useState("To listen");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [saved, setSaved]           = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!user) return <PageLoader />;

  const urlValid   = URL_RE.test(url.trim());
  const showPreview = phase === "ready" || phase === "error";

  function handleUrlChange(value: string) {
    setUrl(value);
    if (timer.current) clearTimeout(timer.current);

    if (!URL_RE.test(value.trim())) {
      setPhase("idle");
      setTitle(""); setArtist(""); setPlatform("Other"); setImageUrl(""); setFetchError("");
      return;
    }
    timer.current = setTimeout(() => triggerFetch(value.trim()), 100);
  }

  async function triggerFetch(rawUrl: string) {
    setPhase("fetching");
    setFetchError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(rawUrl)}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not fetch metadata.");
      setTitle(data.title ?? "");
      setArtist(data.artist ?? "");
      setPlatform((PLATFORMS as readonly string[]).includes(data.platform) ? data.platform : "Other");
      setImageUrl(data.imageUrl ?? "");
      setPhase("ready");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Could not fetch metadata.");
      setPhase("error");
    }
  }

  async function handleSave() {
    if (!urlValid || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await createTrack({
        title:          title.trim() || url.trim(),
        artist:         artist.trim(),
        sourcePlatform: platform,
        sourceUrl:      url.trim(),
        imageUrl,
        genre:          "",
        mood:           "",
        status,
        notes:          "",
      });
      setSaved(true);
      setTimeout(() => router.push("/library"), 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  const detailsHref =
    `/add-track?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}` +
    `&artist=${encodeURIComponent(artist)}` +
    `&platform=${encodeURIComponent(platform)}` +
    `&imageUrl=${encodeURIComponent(imageUrl)}` +
    `&status=${encodeURIComponent(status)}`;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 shrink-0">
        <Link href="/library" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Library
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-white/30">
          Quick Add
        </span>
        <div className="w-16" />
      </header>

      <section className="flex flex-col flex-1 px-4 sm:px-8 pt-8 pb-10 gap-6 max-w-lg mx-auto w-full">

        {/* URL input — minimal, large hit area */}
        <input
          type="url"
          inputMode="url"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Paste a link…"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="w-full bg-transparent text-white text-xl placeholder:text-white/20 focus:outline-none py-2 border-b border-white/10 focus:border-white/35 transition-colors"
        />

        {/* Fetch error — amber, non-blocking */}
        {phase === "error" && fetchError && (
          <p className="text-xs text-amber-400/70 -mt-3">{fetchError}</p>
        )}

        {/* Loading skeleton */}
        {phase === "fetching" && (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 rounded-xl bg-white/8 shrink-0" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="h-4 bg-white/8 rounded-lg w-3/4" />
              <div className="h-3 bg-white/8 rounded-lg w-1/2" />
            </div>
          </div>
        )}

        {/* Preview card — inline editable */}
        {showPreview && (
          <div className="flex items-start gap-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/6 shrink-0" />
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <input
                type="text"
                placeholder="Track title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-white font-semibold text-base placeholder:text-white/25 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-transparent text-white/50 text-sm placeholder:text-white/20 focus:outline-none"
              />
              <span className="text-xs text-white/20 mt-0.5">{platform}</span>
            </div>
          </div>
        )}

        {/* Status pills */}
        {urlValid && (
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  status === s
                    ? "bg-white text-black"
                    : "bg-white/8 text-white/40 hover:bg-white/15 hover:text-white/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {saveError && <p className="text-xs text-red-400/80">{saveError}</p>}

        {saved && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <span>✓</span>
            <span>Saved to library</span>
          </div>
        )}

        {/* Actions — pushed to bottom */}
        {urlValid && !saved && (
          <div className="flex flex-col gap-3 mt-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Track"}
            </button>
            <Link
              href={detailsHref}
              className="w-full py-3 rounded-full border border-white/10 text-white/40 text-sm font-medium text-center hover:border-white/25 hover:text-white/70 transition-colors"
            >
              Add details →
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}
