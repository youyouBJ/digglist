"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrack } from "@/lib/supabase-tracks";
import { PLATFORMS, STATUSES, EMPTY_TRACK_FORM } from "@/lib/constants";
import type { TrackFormState } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { extractTimestampFromUrl, formatTimestamp } from "@/lib/timestamp";

export default function AddTrackPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [form, setForm]     = useState<TrackFormState>(EMPTY_TRACK_FORM);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [fetchUrl, setFetchUrl]         = useState("");
  const [fetching, setFetching]         = useState(false);
  const [fetchPhase, setFetchPhase]     = useState<"idle" | "success" | "error">("idle");
  const [fetchMsg, setFetchMsg]         = useState("");
  const [sourceTimestamp, setTimestamp] = useState<number | null>(null);

  // Pre-fill from quick-add via URL search params
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const prefillUrl = params.get("url");
    if (!prefillUrl) return;

    const prefillPlatform = params.get("platform") ?? "";
    const prefillStatus   = params.get("status") ?? "";
    const tsStr           = params.get("ts");
    const ts              = tsStr ? parseInt(tsStr, 10) : null;

    setFetchUrl(prefillUrl);
    setTimestamp(Number.isFinite(ts) && ts! > 0 ? ts : extractTimestampFromUrl(prefillUrl));
    setForm((prev) => ({
      ...prev,
      url:      prefillUrl,
      title:    params.get("title")    ?? prev.title,
      artist:   params.get("artist")   ?? prev.artist,
      imageUrl: params.get("imageUrl") ?? prev.imageUrl,
      platform: (PLATFORMS as readonly string[]).includes(prefillPlatform) ? prefillPlatform : prev.platform,
      status:   (STATUSES  as readonly string[]).includes(prefillStatus)   ? prefillStatus   : prev.status,
    }));
  }, []);

  if (!user) return <PageLoader />;

  function set(field: keyof TrackFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFetch() {
    const trimmed = fetchUrl.trim();
    if (!trimmed) return;
    setFetching(true);
    setFetchPhase("idle");
    setFetchMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(trimmed)}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not fetch metadata.");
      setForm((prev) => ({
        ...prev,
        title:    data.title    || prev.title,
        artist:   data.artist   || prev.artist,
        platform: (PLATFORMS as readonly string[]).includes(data.platform) ? data.platform : prev.platform,
        url:      data.sourceUrl || prev.url,
        imageUrl: data.imageUrl  || prev.imageUrl,
      }));
      setTimestamp(data.timestamp ?? extractTimestampFromUrl(trimmed));
      setFetchPhase("success");
      setFetchMsg("Metadata imported — check the fields below.");
    } catch (err) {
      setFetchPhase("error");
      setFetchMsg(err instanceof Error ? err.message : "Could not fetch metadata.");
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
        title:           form.title,
        artist:          form.artist,
        sourcePlatform:  form.platform,
        sourceUrl:       form.url,
        imageUrl:        form.imageUrl,
        genre:           form.genre,
        mood:            form.mood,
        status:          form.status,
        notes:           form.notes,
        sourceTimestamp: sourceTimestamp ?? extractTimestampFromUrl(form.url),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save track.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddAnother() {
    setSaved(false);
    setForm(EMPTY_TRACK_FORM);
    setFetchUrl("");
    setFetchPhase("idle");
    setFetchMsg("");
    setTimestamp(null);
    setError(null);
  }

  const isIds = form.status === "IDs Needed";

  return (
    <main
      className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <Header />

      {/* ── Back bar ─────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link
          href="/library"
          className="flex items-center gap-2 text-[13px] transition-colors"
          style={{ color: "var(--teal)" }}
        >
          <ArrowLeft />
          Library
        </Link>
      </div>

      {/* ── Page title ───────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pb-5">
        <h2 className="text-[22px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--t1)" }}>
          Add a track
        </h2>
      </div>

      {/* ── Saved state ──────────────────────────────────────────── */}
      {saved ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-5 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(61,158,135,0.12)", border: "0.5px solid rgba(61,158,135,0.25)" }}
          >
            <CheckIcon />
          </div>
          <div>
            <p className="text-[17px] font-medium mb-1" style={{ color: "var(--t1)" }}>
              Saved to library
            </p>
            <p className="text-[13px]" style={{ color: "var(--t3)" }}>
              {[form.artist, form.title].filter(Boolean).join(" — ") || "Track added"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddAnother}
              className="px-5 py-[10px] rounded-[10px] text-[13px] transition-colors"
              style={{ background: "var(--bg3)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}
            >
              Add another
            </button>
            <Link
              href="/library"
              className="px-5 py-[10px] rounded-[10px] text-[13px] font-medium transition-colors"
              style={{ background: "var(--t1)", color: "var(--bg)" }}
            >
              View Library
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">

          {/* ── Import from URL ──────────────────────────────────── */}
          <div style={{ borderTop: "0.5px solid var(--rule)" }}>
            <p
              className="px-5 sm:px-8 pt-[14px] pb-[6px] text-[10px] tracking-[0.12em] uppercase"
              style={{ color: "var(--t4)" }}
            >
              Import from URL
            </p>

            {/* URL input row */}
            <div
              className="mx-5 sm:mx-8 mb-1 flex items-center gap-3 rounded-[10px] px-4"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
            >
              <input
                type="url"
                placeholder="Paste a YouTube, SoundCloud, Discogs URL…"
                value={fetchUrl}
                onChange={(e) => setFetchUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetch(); } }}
                className="flex-1 py-[13px] text-[14px] bg-transparent outline-none"
                style={{ color: "var(--t1)" }}
              />
              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching || !fetchUrl.trim()}
                className="shrink-0 text-[12px] font-medium py-[7px] px-[12px] rounded-[7px] transition-colors disabled:opacity-40"
                style={{ background: "var(--bg4)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}
              >
                {fetching ? "Fetching…" : "Fetch"}
              </button>
            </div>

            {/* Fetch status */}
            {fetchPhase !== "idle" && (
              <p
                className="px-5 sm:px-8 pt-1 pb-3 text-[12px]"
                style={{ color: fetchPhase === "error" ? "#f87171" : "var(--teal)" }}
              >
                {fetchMsg}
              </p>
            )}

            {/* Timestamp badge */}
            {sourceTimestamp !== null && (
              <p
                className="px-5 sm:px-8 pb-3 text-[12px] font-medium"
                style={{
                  color:               "var(--amber)",
                  fontFamily:          "var(--font-jb-mono, monospace)",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                ⏱ {formatTimestamp(sourceTimestamp)}
              </p>
            )}

            {/* Cover preview */}
            {form.imageUrl && (
              <div
                className="mx-5 sm:mx-8 mb-4 flex items-center gap-3 rounded-[10px] px-4 py-3"
                style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
              >
                <img
                  src={form.imageUrl}
                  alt="Cover"
                  className="w-11 h-11 rounded-lg object-cover shrink-0"
                  style={{ border: "0.5px solid var(--rule2)" }}
                />
                <p className="text-[12px] flex-1 truncate" style={{ color: "var(--t3)" }}>
                  Cover image attached
                </p>
                <button
                  type="button"
                  onClick={() => set("imageUrl", "")}
                  className="shrink-0 text-[11px] transition-colors"
                  style={{ color: "var(--t4)" }}
                  aria-label="Remove cover"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="px-5 sm:px-8 mb-2 text-[13px] text-red-400">{error}</p>
          )}

          {/* ── Section: Track info ──────────────────────────────── */}
          <FormSection label="Track info">
            <FormRow label="Title" required>
              <input
                type="text"
                placeholder={isIds ? "Unknown track" : "Track title"}
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="form-input"
              />
            </FormRow>
            <FormRow label="Artist" last>
              <input
                type="text"
                placeholder={isIds ? "Unknown artist" : "Artist name"}
                value={form.artist}
                onChange={(e) => set("artist", e.target.value)}
                className="form-input"
              />
            </FormRow>
          </FormSection>

          {/* ── Section: Source ──────────────────────────────────── */}
          <FormSection label="Source">
            <FormRow label="Platform">
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                className="form-input"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormRow>
            <FormRow label="URL" last>
              <input
                type="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                className="form-input"
              />
            </FormRow>
          </FormSection>

          {/* ── Section: Tags ────────────────────────────────────── */}
          <FormSection label="Tags">
            <FormRow label="Genre">
              <input
                type="text"
                placeholder="Jazz, House, Soul…"
                value={form.genre}
                onChange={(e) => set("genre", e.target.value)}
                className="form-input"
              />
            </FormRow>
            <FormRow label="Mood" last>
              <input
                type="text"
                placeholder="Chill, Dark, Uplifting…"
                value={form.mood}
                onChange={(e) => set("mood", e.target.value)}
                className="form-input"
              />
            </FormRow>
          </FormSection>

          {/* ── Section: Status ──────────────────────────────────── */}
          <FormSection label="Status">
            <div className="px-5 sm:px-8 py-4 flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const active = form.status === s;
                const ids    = s === "IDs Needed";
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className="px-[13px] py-[6px] rounded-full text-[12px] font-medium transition-colors"
                    style={active
                      ? ids
                        ? { background: "var(--amber-fill)", color: "var(--amber)", border: "0.5px solid var(--amber-rule)" }
                        : { background: "var(--t1)", color: "var(--bg)", border: "0.5px solid transparent" }
                      : { background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* ── Section: Notes ───────────────────────────────────── */}
          <FormSection label="Notes">
            <div className="px-5 sm:px-8 py-4">
              <textarea
                rows={4}
                placeholder="Context, feelings, where you found it…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="form-input w-full resize-none"
              />
            </div>
          </FormSection>

          {/* ── Action bar ───────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-5 sm:px-8 pt-3 pb-4 mt-auto"
            style={{ borderTop: "0.5px solid var(--rule)" }}
          >
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-[10px] text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--t1)", color: "var(--bg)" }}
            >
              {saving ? "Saving…" : "Save track"}
            </button>
            <Link
              href="/library"
              className="h-11 px-5 flex items-center rounded-[10px] text-[13px] transition-colors"
              style={{ background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }}
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      <BottomNav />

      <style>{`
        .form-input {
          width: 100%;
          background: transparent;
          color: var(--t1);
          font-size: 14px;
          outline: none;
          border: none;
          text-align: right;
        }
        .form-input::placeholder { color: var(--t4); }
        select.form-input option { background: var(--bg2); }
        textarea.form-input { text-align: left; }
      `}</style>
    </main>
  );
}

/* ─── Form layout helpers ────────────────────────────────────────────────── */

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "0.5px solid var(--rule)" }}>
      <p
        className="px-5 sm:px-8 pt-[14px] pb-[6px] text-[10px] tracking-[0.12em] uppercase"
        style={{ color: "var(--t4)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function FormRow({
  label, children, last, required,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  required?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]"
      style={{ borderBottom: last ? undefined : "0.5px solid var(--rule)" }}
    >
      <span className="text-[13px] shrink-0 w-[80px]" style={{ color: "var(--t3)" }}>
        {label}{required && <span style={{ color: "var(--amber)" }}> *</span>}
      </span>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function ArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--teal)" }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
