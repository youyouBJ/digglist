"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSet } from "@/lib/supabase-sets";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

const URL_RE = /^https?:\/\/.+\..+/;

function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
  if (/soundcloud\.com/.test(url))        return "SoundCloud";
  if (/tiktok\.com/.test(url))            return "TikTok";
  if (/instagram\.com/.test(url))         return "Instagram";
  return "Other";
}

export default function NewSetPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [url, setUrl]         = useState("");
  const [title, setTitle]     = useState("");
  const [notes, setNotes]     = useState("");
  const [coverUrl, setCover]  = useState("");
  const [platform, setPlatform] = useState("");

  const [fetching, setFetching] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  if (!user) return <PageLoader />;

  const urlValid = URL_RE.test(url.trim());

  async function handleFetch() {
    if (!urlValid || fetching) return;
    setFetching(true);
    setError(null);
    try {
      const res  = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(url.trim())}`);
      const meta = await res.json();
      if (meta.title)    setTitle(meta.title);
      if (meta.imageUrl) setCover(meta.imageUrl);
      setPlatform(detectPlatform(url.trim()));
      setFetchDone(true);
    } catch {
      setPlatform(detectPlatform(url.trim()));
      setFetchDone(true);
    } finally {
      setFetching(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const set = await createSet({
        title:     title.trim(),
        sourceUrl: url.trim() || null,
        platform:  platform || detectPlatform(url.trim()) || null,
        coverUrl:  coverUrl || null,
        notes:     notes.trim(),
      });
      router.push(`/sets/${set.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save set.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Back bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link href="/sets" className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--teal)" }}>
          <ArrowLeft />
          Sets
        </Link>
      </div>

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pb-5">
        <h1 className="text-[24px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--t1)" }}>
          New set
        </h1>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col gap-0">
        <div className="flex flex-col gap-5 px-5 sm:px-8">

          {/* URL */}
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>
              Source URL
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setFetchDone(false); }}
                placeholder="YouTube, SoundCloud…"
                className="flex-1 rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                style={{
                  background: "var(--bg3)",
                  border:     "0.5px solid var(--rule2)",
                  color:      "var(--t1)",
                  caretColor: "var(--teal)",
                }}
              />
              <button
                type="button"
                onClick={handleFetch}
                disabled={!urlValid || fetching}
                className="shrink-0 px-3 rounded-[8px] text-[12px] font-medium transition-opacity disabled:opacity-40"
                style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--teal)" }}
              >
                {fetching ? "…" : "Fetch"}
              </button>
            </div>
            {fetchDone && (
              <p className="text-[11px] mt-1.5" style={{ color: "var(--teal)" }}>
                Metadata loaded ✓
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>
              Title
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Set or mix title"
              required
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
              style={{
                background: "var(--bg3)",
                border:     "0.5px solid var(--rule2)",
                color:      "var(--t1)",
                caretColor: "var(--teal)",
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>
              Notes
              <span className="ml-1 normal-case tracking-normal"
                style={{ color: "var(--t4)", opacity: 0.6 }}>— optional</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, venue, artist…"
              rows={3}
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none resize-none"
              style={{
                background: "var(--bg3)",
                border:     "0.5px solid var(--rule2)",
                color:      "var(--t1)",
                caretColor: "var(--teal)",
              }}
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            {saving ? "Saving…" : "Create set →"}
          </button>
        </div>
      </form>

      <BottomNav />
    </main>
  );
}

function ArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
