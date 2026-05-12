"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSet } from "@/lib/supabase-sets";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

const URL_RE = /^https?:\/\/.+\..+/;

export default function NewSetPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [url, setUrl]           = useState("");
  const [title, setTitle]       = useState("");
  const [notes, setNotes]       = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [platform, setPlatform] = useState("");

  const [fetching, setFetching]   = useState(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  if (!user) return <PageLoader />;

  const urlValid = URL_RE.test(url.trim());

  async function handleUrlChange(val: string) {
    setUrl(val);
    setFetchDone(false);
  }

  async function handleFetch() {
    if (!urlValid || fetching) return;
    setFetching(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(url.trim())}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const meta = await res.json() as {
        title?: string; artist?: string; notes?: string;
        platform?: string; imageUrl?: string;
      };

      /* Title: if API gave us both artist + title, combine them (e.g. "Artist — Set name") */
      const apiTitle  = meta.title?.trim()  ?? "";
      const apiArtist = meta.artist?.trim() ?? "";
      const combined  = apiTitle && apiArtist ? `${apiArtist} — ${apiTitle}` : (apiTitle || apiArtist);
      if (combined) setTitle(combined);

      if (meta.imageUrl) setCoverUrl(meta.imageUrl);
      if (meta.platform) setPlatform(meta.platform);
      if (meta.notes)    setNotes(meta.notes);

      setFetchDone(true);
    } catch {
      setFetchDone(false);
      setError("Could not fetch metadata. You can fill the title manually.");
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
        platform:  platform || null,
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

      <div className="px-5 sm:px-8 pb-5">
        <h1 className="text-[24px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--t1)" }}>
          New set
        </h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--t3)" }}>
          Save a full mix or DJ set. Then log the tracks you discover in it.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col gap-0">
        <div className="flex flex-col gap-5 px-5 sm:px-8">

          {/* ── URL + Fetch ─────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>
              Source URL
              <span className="ml-1 normal-case tracking-normal"
                style={{ color: "var(--t4)", opacity: 0.6 }}>— optional</span>
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="YouTube, SoundCloud…"
                className="flex-1 rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                style={{
                  background: "var(--bg3)",
                  border:     `0.5px solid ${fetchDone ? "var(--teal)" : "var(--rule2)"}`,
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
          </div>

          {/* ── Metadata preview ────────────────────────────────────── */}
          {fetchDone && (
            <div className="flex items-center gap-3 rounded-[8px] p-3"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--teal)22" }}>
              {coverUrl ? (
                <img src={coverUrl} alt="" className="shrink-0 rounded-[4px] object-cover"
                  style={{ width: 40, height: 40, border: "0.5px solid var(--rule2)" }} />
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-[4px] flex items-center justify-center"
                  style={{ background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}>
                  <WaveIcon small />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: "var(--t1)" }}>
                  {title || "—"}
                </p>
                {platform && (
                  <p className="text-[10px] mt-[2px]" style={{ color: "var(--teal)" }}>{platform}</p>
                )}
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "var(--teal)" }}>✓ fetched</span>
            </div>
          )}

          {/* ── Title ───────────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>
              Title
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fabric Live 94, Panorama Bar night…"
              required
              autoFocus={!url}
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
              style={{
                background: "var(--bg3)",
                border:     "0.5px solid var(--rule2)",
                color:      "var(--t1)",
                caretColor: "var(--teal)",
              }}
            />
          </div>

          {/* ── Notes ───────────────────────────────────────────────── */}
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
              placeholder="Venue, date, context…"
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

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            {saving ? "Saving…" : "Save set →"}
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

function WaveIcon({ small }: { small?: boolean }) {
  const s = small ? 12 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} style={{ color: "var(--t4)" }}>
      <rect x="3"  y="14" width="2.5" height="6" rx="1.25" />
      <rect x="8"  y="9"  width="2.5" height="11" rx="1.25" />
      <rect x="13" y="5"  width="2.5" height="15" rx="1.25" />
      <rect x="18" y="11" width="2.5" height="8" rx="1.25" />
    </svg>
  );
}
