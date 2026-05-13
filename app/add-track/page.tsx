"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createTrack } from "@/lib/supabase-tracks";
import { getCrates, addTrackToCrate, type Crate } from "@/lib/supabase-crates";
import { PLATFORMS, EMPTY_TRACK_FORM } from "@/lib/constants";
import type { TrackFormState, MixSetWithCount } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { getSets } from "@/lib/supabase-sets";

type AiSuggestions = {
  artist: string; title: string; genre: string;
  mood: string; summary: string; confidence: number;
};
type AiField = "artist" | "title" | "genre" | "mood";

export default function AddTrackPage() {
  const user = useRequireAuth();

  const [form, setForm]     = useState<TrackFormState>(EMPTY_TRACK_FORM);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [fetching, setFetching]         = useState(false);
  const [fetchPhase, setFetchPhase]     = useState<"idle" | "success" | "error">("idle");
  const [fetchMsg, setFetchMsg]         = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);
  const [aiResult, setAiResult]   = useState<AiSuggestions | null>(null);

  const [rating, setRating]                     = useState<number | null>(null);
  const [videoAuthor, setVideoAuthor]           = useState("");
  const [allCrates, setAllCrates]               = useState<Crate[]>([]);
  const [selectedCrateIds, setSelectedCrateIds] = useState<string[]>([]);
  const [allSets, setAllSets]                   = useState<MixSetWithCount[]>([]);
  const [selectedSetId, setSelectedSetId]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getCrates().then(setAllCrates).catch(() => {});
    getSets().then(setAllSets).catch(() => {});
  }, [user]);

  /* Pre-fill from quick-add redirect */
  useEffect(() => {
    const params          = new URLSearchParams(window.location.search);
    const prefillUrl      = params.get("url");
    if (!prefillUrl) return;
    const prefillPlatform = params.get("platform") ?? "";
    const prefillStatus   = params.get("status")   ?? "";
    setForm((prev) => ({
      ...prev,
      url:      prefillUrl,
      title:    params.get("title")    ?? prev.title,
      artist:   params.get("artist")   ?? prev.artist,
      imageUrl: params.get("imageUrl") ?? prev.imageUrl,
      platform: (PLATFORMS as readonly string[]).includes(prefillPlatform) ? prefillPlatform : prev.platform,
      status:   prefillStatus || prev.status,
    }));
  }, []);

  if (!user) return <PageLoader />;

  function set(field: keyof TrackFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const hasAiContext = !!(form.title.trim() || form.artist.trim() || form.notes.trim() || form.url.trim());

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/suggest-metadata", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          platform: form.platform,
          title:    form.title,
          artist:   form.artist,
          url:      form.url,
          notes:    form.notes,
          author:   videoAuthor,
        }),
      });
      const data = (await res.json()) as AiSuggestions & { error?: string };
      if (data.error) {
        setAiError(data.error === "AI unavailable" ? "AI suggestions are not configured." : data.error);
      } else {
        setAiResult(data);
      }
    } catch {
      setAiError("Could not reach AI.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleApplyAll() {
    if (!aiResult) return;
    if (aiResult.artist) set("artist", aiResult.artist);
    if (aiResult.title)  set("title",  aiResult.title);
    if (aiResult.genre)  set("genre",  aiResult.genre);
    if (aiResult.mood)   set("mood",   aiResult.mood);
    setAiResult(null);
  }

  function handleSetSelect(id: string) {
    if (selectedSetId === id) { setSelectedSetId(null); return; }
    setSelectedSetId(id);
    const chosen = allSets.find((s) => s.id === id);
    if (chosen?.sourceUrl && !form.url.trim()) set("url", chosen.sourceUrl);
  }

  async function handleFetch() {
    const trimmed = form.url.trim();
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
        notes:    data.notes    || prev.notes,
      }));
      setFetchPhase("success");
      setFetchMsg("Metadata imported.");
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
      const newTrack = await createTrack({
        title:           form.title,
        artist:          form.artist,
        label:           form.label,
        recordType:      "track",
        rating,
        sourcePlatform:  form.platform,
        sourceUrl:       form.url,
        imageUrl:        form.imageUrl,
        genre:           form.genre,
        mood:            form.mood,
        status:          form.status,
        notes:           form.notes,
        sourceTimestamp: null,
        timestampEnd:    null,
        videoAuthor:     videoAuthor.trim(),
        trackIdHint:     "",
        setId:           selectedSetId,
      });
      await Promise.all(selectedCrateIds.map((cid) => addTrackToCrate(cid, newTrack.id)));
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
    setFetchPhase("idle");
    setFetchMsg("");
    setError(null);
    setSelectedCrateIds([]);
    setSelectedSetId(null);
    setRating(null);
    setVideoAuthor("");
  }

  return (
    <main className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Back bar ─────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link href="/library" className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--teal)" }}>
          <ArrowLeft />
          Library
        </Link>
      </div>

      <div className="px-5 sm:px-8 pb-4">
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
            <button type="button" onClick={handleAddAnother}
              className="px-5 py-[10px] rounded-[10px] text-[13px]"
              style={{ background: "var(--bg3)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}>
              Add another
            </button>
            <Link href="/library"
              className="px-5 py-[10px] rounded-[10px] text-[13px] font-medium"
              style={{ background: "var(--t1)", color: "var(--bg)" }}>
              View Library
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">

          {/* ── Title + Artist ────────────────────────────────────── */}
          <div className="px-5 sm:px-8 py-5" style={{ borderTop: "0.5px solid var(--rule)" }}>
            <div className="flex items-start gap-4">
              {form.imageUrl && (
                <div className="relative shrink-0 mt-[3px]">
                  <img
                    src={form.imageUrl}
                    alt="Cover"
                    className="object-cover rounded-[8px] shrink-0"
                    style={{ width: 56, height: 56, border: "0.5px solid var(--rule2)" }}
                  />
                  <button
                    type="button"
                    onClick={() => set("imageUrl", "")}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: "var(--bg2)", border: "0.5px solid var(--rule2)", color: "var(--t3)" }}
                    aria-label="Remove cover"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Track title"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="hero-title w-full bg-transparent outline-none"
                />
                <input
                  type="text"
                  placeholder="Artist"
                  value={form.artist}
                  onChange={(e) => set("artist", e.target.value)}
                  className="hero-artist w-full bg-transparent outline-none mt-2"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="px-5 sm:px-8 mb-2 text-[13px] text-red-400">{error}</p>
          )}

          {/* ── Set ─────────────────────────────────────────────── */}
          {allSets.length > 0 && (
            <FormSection label="Set">
              <div className="px-5 sm:px-8 py-4 flex flex-wrap gap-2">
                {allSets.map((s) => {
                  const sel = selectedSetId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSetSelect(s.id)}
                      className="flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[12px] font-medium"
                      style={sel
                        ? { background: "rgba(61,158,135,0.10)", color: "var(--teal)", border: "0.5px solid rgba(61,158,135,0.35)" }
                        : { background: "var(--bg3)", color: "var(--t4)", border: "0.5px solid var(--rule2)" }
                      }
                    >
                      <span className="w-[5px] h-[5px] rounded-full shrink-0"
                        style={{ background: sel ? "var(--teal)" : "var(--t4)" }} />
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </FormSection>
          )}

          {/* ── Source ───────────────────────────────────────────── */}
          <FormSection label="Source">
            {/* URL + Fetch */}
            <div className="px-5 sm:px-8 pt-1 pb-3">
              <div
                className="flex items-center gap-2 rounded-[10px] px-3.5"
                style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
              >
                <input
                  type="url"
                  placeholder="YouTube, SoundCloud, Discogs… (optional)"
                  value={form.url}
                  onChange={(e) => set("url", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetch(); } }}
                  className="flex-1 py-[13px] text-[14px] bg-transparent outline-none"
                  style={{ color: "var(--t1)" }}
                />
                {form.url.trim() && (
                  <button
                    type="button"
                    onClick={handleFetch}
                    disabled={fetching}
                    className="shrink-0 text-[12px] font-medium py-[7px] px-[12px] rounded-[7px] disabled:opacity-40"
                    style={{ background: "var(--bg4)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}
                  >
                    {fetching ? "…" : "Fetch"}
                  </button>
                )}
              </div>

              {fetchPhase !== "idle" && (
                <p className="mt-2 text-[12px]"
                  style={{ color: fetchPhase === "error" ? "#f87171" : "var(--teal)" }}>
                  {fetchMsg}
                </p>
              )}

            </div>

            <FormRow label="Platform">
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                className="form-input"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormRow>
            <FormRow label="Video author" last>
              <input
                type="text"
                placeholder="Channel, DJ, label…"
                value={videoAuthor}
                onChange={(e) => setVideoAuthor(e.target.value)}
                className="form-input"
              />
            </FormRow>
          </FormSection>

          {/* ── AI suggestions ───────────────────────────────────── */}
          <div style={{ borderTop: "0.5px solid var(--rule)" }}>
            {aiResult ? (
              <AiPanel
                result={aiResult}
                onApplyField={(field, value) => set(field as keyof TrackFormState, value)}
                onApplyAll={handleApplyAll}
                onDismiss={() => { setAiResult(null); setAiError(null); }}
              />
            ) : (
              <div className="px-5 sm:px-8 py-[12px] flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: "var(--teal)" }}>
                  ✦ AI suggestions
                </span>
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiLoading || !hasAiContext}
                  className="flex items-center gap-1.5 h-8 px-3.5 rounded-[7px] text-[12px] font-medium disabled:opacity-35"
                  style={{ background: "rgba(61,158,135,0.08)", color: "var(--teal)", border: "0.5px solid rgba(61,158,135,0.25)" }}
                >
                  {aiLoading ? "Analyzing…" : "Suggest metadata"}
                </button>
              </div>
            )}
            {aiError && !aiResult && (
              <p className="px-5 sm:px-8 pb-[12px] text-[12px]" style={{ color: "#f87171" }}>
                {aiError}
              </p>
            )}
          </div>

          {/* ── Details ──────────────────────────────────────────── */}
          <FormSection label="Details" collapsible>
            <FormRow label="Label">
              <input
                type="text"
                placeholder="Warp, Ninja Tune, XL…"
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                className="form-input"
              />
            </FormRow>
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

          {/* ── Rating ───────────────────────────────────────────── */}
          <FormSection label="Rating" collapsible>
            <div className="px-5 sm:px-8 py-4">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </FormSection>

          {/* ── Notes ────────────────────────────────────────────── */}
          <FormSection label="Notes" collapsible>
            <div className="px-5 sm:px-8 py-4">
              <textarea
                rows={3}
                placeholder="Context, feelings, where you found it…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="form-input w-full resize-none"
                style={{ textAlign: "left" }}
              />
            </div>
          </FormSection>

          {/* ── Crates ───────────────────────────────────────────── */}
          {allCrates.length > 0 && (
            <FormSection label="Crates" collapsible>
              <div className="px-5 sm:px-8 py-4 flex flex-wrap gap-2">
                {allCrates.map((c) => {
                  const selected = selectedCrateIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelectedCrateIds((prev) =>
                          selected ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                        )
                      }
                      className="flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[12px] font-medium"
                      style={selected
                        ? { background: `${c.color}14`, color: c.color, border: `0.5px solid ${c.color}40` }
                        : { background: "var(--bg3)", color: "var(--t4)", border: "0.5px solid var(--rule2)" }
                      }
                    >
                      <span className="w-[5px] h-[5px] rounded-full shrink-0"
                        style={{ background: selected ? c.color : "var(--t4)" }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </FormSection>
          )}

          {/* ── Action bar ───────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-5 sm:px-8 pt-3 pb-4 mt-auto"
            style={{ borderTop: "0.5px solid var(--rule)" }}
          >
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-[10px] text-[13px] font-medium disabled:opacity-50"
              style={{ background: "var(--t1)", color: "var(--bg)" }}
            >
              {saving ? "Saving…" : "Save track"}
            </button>
            <Link
              href="/library"
              className="h-11 px-5 flex items-center rounded-[10px] text-[13px]"
              style={{ background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }}
            >
              Cancel
            </Link>
          </div>

        </form>
      )}

      <BottomNav />

      <style>{`
        .hero-title {
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--t1);
          line-height: 1.25;
        }
        .hero-title::placeholder { color: var(--t4); }
        .hero-artist {
          font-size: 15px;
          color: var(--t3);
          line-height: 1.4;
        }
        .hero-artist::placeholder { color: var(--t4); }
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

/* ─── Star rating ────────────────────────────────────────────────────────── */

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value !== null && star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? null : star)}
            className="p-2 transition-transform active:scale-90"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <svg width="26" height="26" viewBox="0 0 24 24"
              fill={filled ? "var(--amber)" : "none"}
              stroke={filled ? "var(--amber)" : "var(--rule3)"}
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        );
      })}
      {value !== null && (
        <span className="ml-2 text-[12px]" style={{ color: "var(--amber)" }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

/* ─── Form helpers ───────────────────────────────────────────────────────── */

function FormSection({ label, children, collapsible }: {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderTop: "0.5px solid var(--rule)" }}>
      <div
        className="px-5 sm:px-8 pt-[14px] pb-[6px] flex items-center justify-between"
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        style={collapsible ? { cursor: "pointer" } : undefined}
      >
        <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--t4)" }}>
          {label}
        </p>
        {collapsible && (
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5}
            style={{ color: "var(--t4)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      {(!collapsible || open) && children}
    </div>
  );
}

function FormRow({ label, children, last, required }: {
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
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

/* ─── AI Suggestions Panel ───────────────────────────────────────────────── */

function AiPanel({
  result,
  onApplyField,
  onApplyAll,
  onDismiss,
}: {
  result: AiSuggestions;
  onApplyField: (field: AiField, value: string) => void;
  onApplyAll: () => void;
  onDismiss: () => void;
}) {
  const isLow = result.confidence < 0.5;
  const pct   = Math.round(result.confidence * 100);

  const rows = [
    { field: "artist" as AiField, label: "Artist", value: result.artist },
    { field: "title"  as AiField, label: "Title",  value: result.title  },
    { field: "genre"  as AiField, label: "Genre",  value: result.genre  },
    { field: "mood"   as AiField, label: "Mood",   value: result.mood   },
  ].filter((r) => r.value.trim() !== "");

  const noSuggestions = rows.length === 0 && !result.summary;

  return (
    <div
      className="mx-5 sm:mx-8 my-3 rounded-[10px] overflow-hidden"
      style={{ border: `0.5px solid ${isLow ? "var(--amber-rule)" : "var(--rule2)"}`, background: "var(--bg3)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-[10px]"
        style={{ borderBottom: "0.5px solid var(--rule)" }}>
        <span className="text-[11px] font-medium tracking-[0.04em]"
          style={{ color: "var(--teal)" }}>
          ✦ AI suggestions
        </span>
        <span className="text-[11px]" style={{ color: isLow ? "var(--amber)" : "var(--t3)" }}>
          {pct}% confidence
        </span>
      </div>

      {/* Low-confidence warning */}
      {isLow && (
        <p className="px-4 py-[8px] text-[11px] leading-[1.5]"
          style={{ color: "var(--amber)", borderBottom: "0.5px solid var(--amber-rule)", background: "var(--amber-soft)" }}>
          Low confidence — review carefully before applying.
        </p>
      )}

      {/* No suggestions */}
      {noSuggestions && (
        <p className="px-4 py-3 text-[12px]" style={{ color: "var(--t3)" }}>
          Couldn't extract metadata from this content.
        </p>
      )}

      {/* Field rows */}
      {rows.map((r, i) => (
        <div
          key={r.field}
          className="flex items-center gap-3 px-4 py-[10px]"
          style={{ borderBottom: i < rows.length - 1 ? "0.5px solid var(--rule)" : undefined }}
        >
          <span className="text-[11px] w-[42px] shrink-0" style={{ color: "var(--t4)" }}>{r.label}</span>
          <span className="flex-1 text-[13px] min-w-0 truncate" style={{ color: "var(--t1)" }}>{r.value}</span>
          <button
            type="button"
            onClick={() => onApplyField(r.field, r.value)}
            className="shrink-0 text-[11px] font-medium h-[26px] px-[10px] rounded-[5px]"
            style={{ background: "var(--bg4)", color: "var(--teal)", border: "0.5px solid rgba(61,158,135,0.25)" }}
          >
            Apply
          </button>
        </div>
      ))}

      {/* Summary */}
      {result.summary && (
        <p
          className="px-4 py-[10px] text-[11px] leading-[1.6] italic"
          style={{ color: "var(--t3)", borderTop: rows.length > 0 ? "0.5px solid var(--rule)" : undefined }}
        >
          "{result.summary}"
        </p>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-4 py-[10px]"
        style={{ borderTop: "0.5px solid var(--rule)" }}
      >
        {!noSuggestions && rows.length > 0 && (
          <button
            type="button"
            onClick={onApplyAll}
            className="flex-1 h-8 rounded-[7px] text-[12px] font-medium"
            style={{ background: "rgba(61,158,135,0.08)", color: "var(--teal)", border: "0.5px solid rgba(61,158,135,0.20)" }}
          >
            Apply all
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="h-8 px-4 rounded-[7px] text-[12px]"
          style={{ color: "var(--t4)" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
