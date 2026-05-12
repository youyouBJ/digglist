"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTrack } from "@/lib/supabase-tracks";
import { getCrates, addTrackToCrate, type Crate } from "@/lib/supabase-crates";
import { PLATFORMS } from "@/lib/constants";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import { supabase } from "@/lib/supabase";
import {
  extractTimestampFromUrl,
  formatTimestamp,
  parseManualTimestamp,
} from "@/lib/timestamp";

const URL_RE = /^https?:\/\/.+\..+/;

export default function LogIdPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  /* Source */
  const [url, setUrl]               = useState("");
  const [platform, setPlatform]     = useState("YouTube");
  const [imageUrl, setImageUrl]     = useState("");

  /* Fetch state */
  const [fetching, setFetching]     = useState(false);
  const [fetchPhase, setFetchPhase] = useState<"idle" | "success" | "error">("idle");
  const [fetchMsg, setFetchMsg]     = useState("");
  const fetchTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Timestamps */
  const [tsInput, setTsInput]       = useState("");
  const [tsEndInput, setTsEndInput] = useState("");

  /* ID fields */
  const [artist, setArtist]         = useState("");
  const [videoAuthor, setVideoAuthor] = useState("");
  const [trackIdHint, setTrackIdHint] = useState("");
  const [notes, setNotes]           = useState("");

  /* Crates */
  const [allCrates, setAllCrates]               = useState<Crate[]>([]);
  const [selectedCrateIds, setSelectedCrateIds] = useState<string[]>([]);

  /* Rating */
  const [rating, setRating]         = useState<number | null>(null);

  /* Save */
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getCrates().then(setAllCrates).catch(() => {});
  }, [user]);

  if (!user) return <PageLoader />;

  const urlValid = URL_RE.test(url.trim());
  const tsStart  = parseManualTimestamp(tsInput) ?? (urlValid ? extractTimestampFromUrl(url.trim()) : null);
  const tsEnd    = parseManualTimestamp(tsEndInput);

  /* Auto-fetch on URL change */
  function handleUrlChange(value: string) {
    setUrl(value);
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    const trimmed = value.trim();
    if (!URL_RE.test(trimmed)) {
      setFetchPhase("idle");
      return;
    }
    fetchTimer.current = setTimeout(() => triggerFetch(trimmed), 150);
  }

  async function triggerFetch(rawUrl: string) {
    setFetching(true);
    setFetchPhase("idle");
    setFetchMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(rawUrl)}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not fetch metadata.");

      if (data.imageUrl)  setImageUrl(data.imageUrl);
      if (data.artist)    setVideoAuthor(data.artist);
      if (data.notes)     setNotes((prev) => prev || data.notes);
      if ((PLATFORMS as readonly string[]).includes(data.platform)) setPlatform(data.platform);

      const urlTs = extractTimestampFromUrl(rawUrl);
      if (urlTs && !tsInput) setTsInput(formatTimestamp(urlTs));

      setFetchPhase("success");
      setFetchMsg("Source importée.");
    } catch (err) {
      setFetchPhase("error");
      setFetchMsg(err instanceof Error ? err.message : "Erreur lors de la récupération.");
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const newTrack = await createTrack({
        title:           "Unknown track",
        artist:          artist.trim(),
        label:           "",
        recordType:      "id_needed",
        rating,
        sourcePlatform:  platform,
        sourceUrl:       url.trim(),
        imageUrl,
        genre:           "",
        mood:            "",
        status:          "IDs Needed",
        notes:           notes.trim(),
        sourceTimestamp: tsStart,
        timestampEnd:    tsEnd,
        videoAuthor:     videoAuthor.trim(),
        trackIdHint:     trackIdHint.trim(),
      });
      await Promise.all(selectedCrateIds.map((cid) => addTrackToCrate(cid, newTrack.id)));
      router.push("/ids");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      {/* ── Back bar ─────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link href="/ids" className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--amber)" }}>
          <ArrowLeft />
          IDs
        </Link>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pb-5">
        <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
          style={{ color: "rgba(201,162,74,0.55)" }}>
          Unknown track
        </p>
        <h2 className="text-[22px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--amber)" }}>
          Log an ID
        </h2>
        <p className="text-[13px] mt-1" style={{ color: "var(--t3)" }}>
          Heard something you can't identify? Save it now, find it later.
        </p>
      </div>

      {error && (
        <p className="mx-5 sm:mx-8 mb-3 text-[13px] text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">

        {/* ── Section: Source ──────────────────────────────────────── */}
        <FormSection label="Source">
          <div className="px-5 sm:px-8 pt-1 pb-3">
            {/* URL + auto-fetch */}
            <div className="flex items-center gap-2 rounded-[10px] px-3.5"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--amber-rule)" }}>
              <input
                type="url"
                placeholder="YouTube, SoundCloud, Instagram, TikTok…"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1 py-[13px] text-[14px] bg-transparent outline-none"
                style={{ color: "var(--t1)" }}
              />
              {fetching && (
                <span className="shrink-0 text-[11px]" style={{ color: "var(--t3)" }}>…</span>
              )}
            </div>
            {fetchPhase !== "idle" && (
              <p className="mt-2 text-[12px]"
                style={{ color: fetchPhase === "error" ? "#f87171" : "var(--amber)" }}>
                {fetchMsg}
              </p>
            )}

            {/* Thumbnail preview */}
            {imageUrl && (
              <div className="flex items-center gap-3 mt-3">
                <img src={imageUrl} alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                  style={{ border: "0.5px solid var(--amber-rule)" }} />
                <button type="button" onClick={() => setImageUrl("")}
                  className="text-[11px]" style={{ color: "var(--t3)" }}>
                  Remove thumbnail
                </button>
              </div>
            )}
          </div>

          <FormRow label="Platform">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="form-input">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormRow>

          <FormRow label="Auteur vidéo" last>
            <input type="text" placeholder="Nom du compte, DJ, label…"
              value={videoAuthor} onChange={(e) => setVideoAuthor(e.target.value)}
              className="form-input" />
          </FormRow>
        </FormSection>

        {/* ── Section: Timestamps ──────────────────────────────────── */}
        <FormSection label="Timestamps">
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
            {tsStart !== null && (
              <p className="text-[11px] mt-1 text-right" style={{ color: "var(--amber)" }}>
                ⏱ {formatTimestamp(tsStart)}
              </p>
            )}
          </FormRow>
          <FormRow label="Fin" last>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Optionnel — 15:20"
              value={tsEndInput}
              onChange={(e) => setTsEndInput(e.target.value)}
              className="form-input"
              style={{ fontFamily: "var(--font-jb-mono, monospace)" }}
            />
            {tsEnd !== null && (
              <p className="text-[11px] mt-1 text-right" style={{ color: "var(--amber)", opacity: 0.7 }}>
                ⏱ {formatTimestamp(tsEnd)}
              </p>
            )}
          </FormRow>
        </FormSection>

        {/* ── Section: ID Info ─────────────────────────────────────── */}
        <FormSection label="ID info">
          <FormRow label="Artiste connu">
            <input type="text" placeholder="Si tu sais qui c'est…"
              value={artist} onChange={(e) => setArtist(e.target.value)}
              className="form-input" />
          </FormRow>
          <FormRow label="Track ID" last>
            <input type="text" placeholder="Indice, Shazam result…"
              value={trackIdHint} onChange={(e) => setTrackIdHint(e.target.value)}
              className="form-input" />
          </FormRow>
        </FormSection>

        {/* ── Section: Rating ──────────────────────────────────────── */}
        <FormSection label="Rating">
          <div className="px-5 sm:px-8 py-4">
            <StarRating value={rating} onChange={setRating} />
          </div>
        </FormSection>

        {/* ── Section: Notes ───────────────────────────────────────── */}
        <FormSection label="Notes">
          <div className="px-5 sm:px-8 py-4">
            <textarea
              rows={3}
              placeholder="Context, feeling, moments… Tout ce qui peut aider à retrouver le track."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input w-full resize-none"
              style={{ textAlign: "left" }}
            />
          </div>
        </FormSection>

        {/* ── Section: Crates ──────────────────────────────────────── */}
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

        {/* ── Action bar ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 sm:px-8 pt-3 pb-4 mt-auto"
          style={{ borderTop: "0.5px solid var(--rule)" }}>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-11 rounded-[10px] text-[13px] font-medium disabled:opacity-50"
            style={{ background: "var(--amber)", color: "#1a1000" }}
          >
            {saving ? "Saving…" : "Log this ID"}
          </button>
          <Link href="/ids"
            className="h-11 px-5 flex items-center rounded-[10px] text-[13px]"
            style={{ background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }}>
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

function FormRow({ label, children, last }: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 px-5 sm:px-8 py-[14px]"
      style={{ borderBottom: last ? undefined : "0.5px solid var(--rule)" }}
    >
      <span className="text-[13px] shrink-0 w-[90px] pt-[1px]" style={{ color: "var(--t3)" }}>
        {label}
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
