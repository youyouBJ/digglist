"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createTrack } from "@/lib/supabase-tracks";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PLATFORMS, STATUSES } from "@/lib/constants";
import { PageLoader } from "@/app/components/ui";
import { extractTimestampFromUrl, formatTimestamp } from "@/lib/timestamp";

type FetchPhase = "idle" | "fetching" | "ready" | "error";

const URL_RE = /^https?:\/\/.+\..+/;

export default function QuickAddPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [url, setUrl]                   = useState("");
  const [phase, setPhase]               = useState<FetchPhase>("idle");
  const [fetchError, setFetchError]     = useState("");
  const [title, setTitle]               = useState("");
  const [artist, setArtist]             = useState("");
  const [platform, setPlatform]         = useState("Other");
  const [imageUrl, setImageUrl]         = useState("");
  const [sourceTimestamp, setTimestamp] = useState<number | null>(null);
  const [status, setStatus]             = useState("To listen");
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState("");
  const [saved, setSaved]               = useState(false);
  const [leaving, setLeaving]           = useState(false);

  const inputRef   = useRef<HTMLInputElement>(null);
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFocus   = useRef(false);

  // P0 — iOS autoFocus: fires when user is confirmed (after auth redirect)
  useEffect(() => {
    if (!user || didFocus.current) return;
    didFocus.current = true;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [user]);

  // Pre-set status from URL param (?status=IDs+Needed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("status");
    if (preset && (STATUSES as readonly string[]).includes(preset)) {
      setStatus(preset);
    }
  }, []);

  if (!user) return <PageLoader />;

  const urlValid    = URL_RE.test(url.trim());
  const showPreview = phase === "ready" || phase === "error";

  const inputBorderClass = !urlValid
    ? "border-white/10 focus:border-white/35"
    : phase === "fetching"
    ? "border-white/25"
    : phase === "ready"
    ? "border-emerald-500/30"
    : phase === "error"
    ? "border-amber-500/30"
    : "border-white/25";

  function handleUrlChange(value: string) {
    setUrl(value);
    if (fetchTimer.current) clearTimeout(fetchTimer.current);

    const trimmed = value.trim();
    if (!URL_RE.test(trimmed)) {
      setPhase("idle");
      setTitle(""); setArtist(""); setPlatform("Other");
      setImageUrl(""); setTimestamp(null); setFetchError("");
      return;
    }

    // Timestamp detected immediately — no need to wait for the API
    const ts = extractTimestampFromUrl(trimmed);
    setTimestamp(ts);

    fetchTimer.current = setTimeout(() => triggerFetch(trimmed, ts), 100);
  }

  async function triggerFetch(rawUrl: string, ts: number | null) {
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

      // Smart IDs Needed: timestamp in a set + no artist identified
      if (ts !== null && !data.artist) {
        setStatus("IDs Needed");
      }

      setPhase("ready");
      inputRef.current?.blur(); // P0: reveal buttons by closing keyboard
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Could not fetch metadata.");
      setPhase("error");
      inputRef.current?.blur();
    }
  }

  async function handleSave() {
    if (!urlValid || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await createTrack({
        title:           title.trim() || (status === "IDs Needed" ? "Unknown track" : url.trim()),
        artist:          artist.trim(),
        sourcePlatform:  platform,
        sourceUrl:       url.trim(),
        imageUrl,
        genre:           "",
        mood:            "",
        status,
        notes:           "",
        sourceTimestamp,
      });
      setSaved(true);
      setTimeout(() => {
        setLeaving(true);
        setTimeout(() => router.push("/library"), 300);
      }, 1200);
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
    `&status=${encodeURIComponent(status)}` +
    (sourceTimestamp !== null ? `&ts=${sourceTimestamp}` : "");

  return (
    <main
      className="min-h-[100dvh] bg-[#0d0d0d] text-white flex flex-col transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 shrink-0">
        <Link href="/library" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Library
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-white/40">
          Quick Add
        </span>
        <div className="w-16" />
      </header>

      <section className="flex flex-col flex-1 px-4 sm:px-8 pt-8 pb-10 gap-6 max-w-lg mx-auto w-full">

        {/* URL input — border encodes state immediately */}
        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Paste a link…"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className={`w-full bg-transparent text-white text-xl placeholder:text-white/40 focus:outline-none py-2 border-b transition-colors duration-300 ${inputBorderClass}`}
        />

        {/* Fetch error — actionable, not a dead end */}
        {phase === "error" && fetchError && (
          <p className="text-xs text-amber-400/80 -mt-3 animate-fade-in">
            {fetchError} — type the details below to save anyway.
          </p>
        )}

        {/* Skeleton */}
        {phase === "fetching" && (
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="w-14 h-14 rounded-xl bg-white/8 shrink-0 animate-pulse" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="h-4 bg-white/8 rounded-lg w-3/4 animate-pulse" />
              <div className="h-3 bg-white/8 rounded-lg w-1/2 animate-pulse" />
              {sourceTimestamp !== null && (
                <span className="text-xs text-orange-400/50 font-mono">
                  ⏱ {formatTimestamp(sourceTimestamp)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preview card — inline editable */}
        {showPreview && (
          <div className="flex items-start gap-4 bg-white/[0.03] rounded-2xl p-4 animate-fade-slide-up">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : status === "IDs Needed" ? (
              <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0 flex items-center justify-center text-orange-300/60 text-xl font-bold">
                ?
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/8 shrink-0" />
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <input
                type="text"
                placeholder={status === "IDs Needed" ? "Unknown track" : "Track title"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-white font-semibold text-base placeholder:text-white/25 focus:outline-none"
              />
              <input
                type="text"
                placeholder={status === "IDs Needed" ? "Unknown artist" : "Artist"}
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-transparent text-white/50 text-sm placeholder:text-white/20 focus:outline-none"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/25">{platform}</span>
                {sourceTimestamp !== null && (
                  <span className="text-xs text-orange-400/70 font-mono">
                    ⏱ {formatTimestamp(sourceTimestamp)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status pills */}
        {urlValid && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors active:scale-95 ${
                  status === s
                    ? s === "IDs Needed"
                      ? "bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30"
                      : "bg-white text-black"
                    : "bg-white/8 text-white/40 hover:bg-white/15 hover:text-white/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-400/80 animate-fade-in">{saveError}</p>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium animate-fade-slide-up">
            <span>✓</span>
            <span>Saved to library</span>
          </div>
        )}

        {/* Actions — mt-auto keeps them in thumb reach with 100dvh */}
        {urlValid && !saved && (
          <div className="flex flex-col gap-3 mt-auto animate-slide-up">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin inline-block" />
                  Saving…
                </span>
              ) : "Save Track"}
            </button>
            <Link
              href={detailsHref}
              className="w-full py-3 rounded-full border border-white/10 text-white/40 text-sm font-medium text-center hover:border-white/25 hover:text-white/70 active:scale-[0.98] transition-all duration-150"
            >
              Add details →
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}
