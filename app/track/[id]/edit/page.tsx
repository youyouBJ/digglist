"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTrackById, updateTrack, type Track } from "@/lib/supabase-tracks";
import { PLATFORMS, STATUSES, EMPTY_TRACK_FORM } from "@/lib/constants";
import { extractTimestampFromUrl, formatTimestamp } from "@/lib/timestamp";
import type { TrackFormState } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

export default function EditTrackPage() {
  const user  = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [track, setTrack]                     = useState<Track | null | undefined>(undefined);
  const [form, setForm]                       = useState<TrackFormState>(EMPTY_TRACK_FORM);
  const [storedTimestamp, setStoredTimestamp] = useState<number | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);

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

  const detectedTs = extractTimestampFromUrl(form.url) ?? storedTimestamp;
  const isIds      = form.status === "IDs Needed";

  return (
    <main
      className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <Header />

      {/* ── Back bar ─────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link
          href={`/track/${id}`}
          className="flex items-center gap-2 text-[13px] transition-colors"
          style={{ color: "var(--teal)" }}
        >
          <ArrowLeft />
          Track detail
        </Link>
      </div>

      {/* ── Page title ───────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pb-5">
        <h2 className="text-[22px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--t1)" }}>
          Edit track
        </h2>
        {(track.title || track.artist) && (
          <p className="text-[13px] mt-[3px]" style={{ color: "var(--t3)" }}>
            {[track.artist, track.title].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>

      {/* ── Cover preview ────────────────────────────────────────── */}
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

      {error && (
        <p className="mx-5 sm:mx-8 mb-4 text-[13px] text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">

        {/* ── Section: Track info ──────────────────────────────────── */}
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

        {/* ── Section: Source ──────────────────────────────────────── */}
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
          <FormRow label="URL" last={detectedTs === null}>
            <input
              type="url"
              placeholder="https://…"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              className="form-input"
            />
          </FormRow>
          {detectedTs !== null && (
            <FormRow label="Timestamp" last readonly>
              <span
                className="text-[15px] font-medium"
                style={{
                  color:               "var(--amber)",
                  fontFamily:          "var(--font-jb-mono, monospace)",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {formatTimestamp(detectedTs)}
              </span>
            </FormRow>
          )}
        </FormSection>

        {/* ── Section: Tags ────────────────────────────────────────── */}
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

        {/* ── Section: Status ──────────────────────────────────────── */}
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

        {/* ── Section: Notes ───────────────────────────────────────── */}
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

        {/* ── Action bar ───────────────────────────────────────────── */}
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
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/track/${id}`}
            className="h-11 px-5 flex items-center rounded-[10px] text-[13px] transition-colors"
            style={{ background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }}
          >
            Cancel
          </Link>
        </div>
      </form>

      <BottomNav />

      <style>{`
        .form-input {
          width: 100%;
          background: transparent;
          color: var(--t1);
          font-size: 14px;
          outline: none;
          border: none;
        }
        .form-input::placeholder { color: var(--t4); }
        select.form-input option { background: var(--bg2); }
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
  label, children, last, required, readonly,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  required?: boolean;
  readonly?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]"
      style={{ borderBottom: last ? undefined : "0.5px solid var(--rule)" }}
    >
      <span
        className="text-[13px] shrink-0 w-[80px]"
        style={{ color: readonly ? "var(--t4)" : "var(--t3)" }}
      >
        {label}{required && <span style={{ color: "var(--amber)" }}> *</span>}
      </span>
      <div className="flex-1 min-w-0 text-right">
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
