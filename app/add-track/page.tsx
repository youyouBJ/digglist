"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createTrack } from "@/lib/supabase-tracks";
import { getCrates, addTrackToCrate, type Crate } from "@/lib/supabase-crates";
import { PLATFORMS, EMPTY_TRACK_FORM } from "@/lib/constants";
import type { TrackFormState } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { extractTimestampFromUrl, formatTimestamp, parseManualTimestamp } from "@/lib/timestamp";

export default function AddTrackPage() {
  const user = useRequireAuth();

  const [form, setForm]     = useState<TrackFormState>(EMPTY_TRACK_FORM);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [fetching, setFetching]         = useState(false);
  const [fetchPhase, setFetchPhase]     = useState<"idle" | "success" | "error">("idle");
  const [fetchMsg, setFetchMsg]         = useState("");
  const [sourceTimestamp, setTimestamp] = useState<number | null>(null);
  const [tsInput, setTsInput]           = useState("");
  const [tsEndInput, setTsEndInput]     = useState("");

  const [rating, setRating]                     = useState<number | null>(null);
  const [videoAuthor, setVideoAuthor]           = useState("");
  const [allCrates, setAllCrates]               = useState<Crate[]>([]);
  const [selectedCrateIds, setSelectedCrateIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    getCrates().then(setAllCrates).catch(() => {});
  }, [user]);

  /* Pre-fill from quick-add redirect */
  useEffect(() => {
    const params          = new URLSearchParams(window.location.search);
    const prefillUrl      = params.get("url");
    if (!prefillUrl) return;
    const prefillPlatform = params.get("platform") ?? "";
    const prefillStatus   = params.get("status")   ?? "";
    const tsStr           = params.get("ts");
    const ts              = tsStr ? parseInt(tsStr, 10) : null;
    setTimestamp(Number.isFinite(ts) && ts! > 0 ? ts : extractTimestampFromUrl(prefillUrl));
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
      setTimestamp(data.timestamp ?? extractTimestampFromUrl(trimmed));
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
        sourceTimestamp: finalTs,
        timestampEnd:    tsEndParsed,
        videoAuthor:     videoAuthor.trim(),
        trackIdHint:     "",
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
    setTimestamp(null);
    setTsInput("");
    setTsEndInput("");
    setError(null);
    setSelectedCrateIds([]);
    setRating(null);
    setVideoAuthor("");
  }

  const tsFromUrl    = sourceTimestamp ?? extractTimestampFromUrl(form.url);
  const tsFromInput  = parseManualTimestamp(tsInput);
  const tsEndParsed  = parseManualTimestamp(tsEndInput);
  const finalTs      = tsFromInput ?? tsFromUrl;

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

              {tsFromUrl !== null && !tsFromInput && (
                <p className="mt-1 text-[12px] font-medium"
                  style={{ color: "var(--amber)", fontFamily: "var(--font-jb-mono, monospace)", fontFeatureSettings: '"tnum"' }}>
                  ⏱ {formatTimestamp(tsFromUrl)} (auto)
                </p>
              )}
            </div>

            <FormRow label="Début">
              <input
                type="text"
                inputMode="numeric"
                placeholder="12:43 ou 1:12:43"
                value={tsInput}
                onChange={(e) => setTsInput(e.target.value)}
                className="form-input"
                style={{ fontFamily: "var(--font-jb-mono, monospace)" }}
              />
              {tsFromInput !== null && (
                <p className="text-[11px] mt-1" style={{ color: "var(--amber)" }}>
                  ⏱ {formatTimestamp(tsFromInput)}
                </p>
              )}
            </FormRow>
            <FormRow label="Fin">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Optionnel — 15:20"
                value={tsEndInput}
                onChange={(e) => setTsEndInput(e.target.value)}
                className="form-input"
                style={{ fontFamily: "var(--font-jb-mono, monospace)" }}
              />
              {tsEndParsed !== null && (
                <p className="text-[11px] mt-1" style={{ color: "var(--amber)", opacity: 0.7 }}>
                  ⏱ {formatTimestamp(tsEndParsed)}
                </p>
              )}
            </FormRow>
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

          {/* ── Details ──────────────────────────────────────────── */}
          <FormSection label="Details">
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
          <FormSection label="Rating">
            <div className="px-5 sm:px-8 py-4">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </FormSection>

          {/* ── Notes ────────────────────────────────────────────── */}
          <FormSection label="Notes">
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
            <FormSection label="Crates">
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

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "0.5px solid var(--rule)" }}>
      <p className="px-5 sm:px-8 pt-[14px] pb-[6px] text-[10px] tracking-[0.12em] uppercase"
        style={{ color: "var(--t4)" }}>
        {label}
      </p>
      {children}
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
