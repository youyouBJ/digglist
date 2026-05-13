"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSet } from "@/lib/supabase-sets";
import { createTrack } from "@/lib/supabase-tracks";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import { parseManualTimestamp, formatTimestamp } from "@/lib/timestamp";

const URL_RE = /^https?:\/\/.+\..+/;

type MomentDraft = {
  key:        number;
  mode:       "track" | "id";
  title:      string;
  artist:     string;
  tsInput:    string;
  tsEndInput: string;
  rating:     number | null;
};

export default function NewSetPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  /* Set info */
  const [url, setUrl]           = useState("");
  const [title, setTitle]       = useState("");
  const [artist, setArtist]     = useState("");
  const [party, setParty]       = useState("");
  const [setDate, setSetDate]   = useState("");
  const [notes, setNotes]       = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [platform, setPlatform] = useState("");

  /* Fetch */
  const [fetching, setFetching]   = useState(false);
  const [fetchDone, setFetchDone] = useState(false);

  /* Moments */
  const [momentDrafts, setMomentDrafts]   = useState<MomentDraft[]>([]);
  const [showMomentForm, setShowMomentForm] = useState(false);
  const [nextKey, setNextKey]             = useState(0);

  /* Save */
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  if (!user) return <PageLoader />;

  const urlValid = URL_RE.test(url.trim());

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
      const apiTitle  = meta.title?.trim()  ?? "";
      const apiArtist = meta.artist?.trim() ?? "";
      if (apiTitle  && !title)    setTitle(apiTitle);
      if (apiArtist && !artist)   setArtist(apiArtist);
      if (meta.imageUrl && !coverUrl) setCoverUrl(meta.imageUrl);
      if (meta.platform && !platform) setPlatform(meta.platform);
      if (meta.notes    && !notes)    setNotes(meta.notes);
      setFetchDone(true);
    } catch {
      setError("Could not fetch metadata. Fill in the fields manually.");
    } finally {
      setFetching(false);
    }
  }

  function addDraft(m: Omit<MomentDraft, "key">) {
    setMomentDrafts((prev) => [...prev, { ...m, key: nextKey }]);
    setNextKey((k) => k + 1);
    setShowMomentForm(false);
  }

  function removeDraft(key: number) {
    setMomentDrafts((prev) => prev.filter((m) => m.key !== key));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const set = await createSet({
        title:     title.trim(),
        artist:    artist.trim(),
        party:     party.trim(),
        setDate:   setDate || null,
        sourceUrl: url.trim() || null,
        platform:  platform || null,
        coverUrl:  coverUrl || null,
        notes:     notes.trim(),
      });

      if (momentDrafts.length > 0) {
        await Promise.all(
          momentDrafts.map((m) =>
            createTrack({
              title:           m.mode === "track" ? m.title : "Unknown track",
              artist:          m.artist,
              label:           "",
              recordType:      m.mode === "track" ? "track" : "id_needed",
              rating:          m.rating,
              sourcePlatform:  platform || "",
              sourceUrl:       url.trim() || "",
              imageUrl:        "",
              genre:           "",
              mood:            "",
              status:          m.mode === "id" ? "IDs Needed" : "",
              notes:           "",
              sourceTimestamp: parseManualTimestamp(m.tsInput),
              timestampEnd:    parseManualTimestamp(m.tsEndInput),
              videoAuthor:     "",
              trackIdHint:     "",
              setId:           set.id,
            })
          )
        );
      }

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

      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link href="/sets" className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--teal)" }}>
          <ArrowLeft />
          Sets
        </Link>
      </div>

      <div className="px-5 sm:px-8 pb-5">
        <h1 className="text-[24px] font-medium tracking-[-0.03em]" style={{ color: "var(--t1)" }}>
          New set
        </h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--t3)" }}>
          Save a mix or DJ set. Log the tracks you discover in it.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col">

        {/* ── Source URL ────────────────────────────────────────────── */}
        <Section label="Source URL" optional>
          <div className="px-5 sm:px-8 py-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setFetchDone(false); }}
                placeholder="YouTube, SoundCloud, Spotify…"
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

            {fetchDone && (
              <div className="flex items-center gap-3 rounded-[8px] p-3"
                style={{ background: "var(--bg3)", border: "0.5px solid rgba(61,158,135,0.2)" }}>
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="shrink-0 rounded-[4px] object-cover"
                    style={{ width: 36, height: 36, border: "0.5px solid var(--rule2)" }} />
                ) : (
                  <div className="shrink-0 w-9 h-9 rounded-[4px] flex items-center justify-center"
                    style={{ background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}>
                    <WaveIcon />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--t1)" }}>
                    {title || "—"}
                  </p>
                  {platform && (
                    <p className="text-[10px] mt-[2px]" style={{ color: "var(--teal)" }}>{platform}</p>
                  )}
                </div>
                <span className="text-[10px] shrink-0" style={{ color: "var(--teal)" }}>✓</span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Set info ──────────────────────────────────────────────── */}
        <Section label="Set info">
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fabric Live 94, Panorama Bar…"
              required
              autoFocus={!url}
              className="field-input"
            />
          </Field>
          <Field label="Artist / DJ">
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Surgeon, Job Jobse…"
              className="field-input"
            />
          </Field>
          <Field label="Party / event">
            <input
              type="text"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder="Fabric, De School…"
              className="field-input"
            />
          </Field>
          <Field label="Date" last>
            <input
              type="date"
              value={setDate}
              onChange={(e) => setSetDate(e.target.value)}
              className="field-input"
              style={{ colorScheme: "dark" }}
            />
          </Field>
        </Section>

        {/* ── Notes ─────────────────────────────────────────────────── */}
        <Section label="Notes" optional>
          <div className="px-5 sm:px-8 py-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, vibe, anything you want to remember…"
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
        </Section>

        {/* ── Moments ───────────────────────────────────────────────── */}
        <Section label="Moments" optional>
          {momentDrafts.length > 0 && (
            <div style={{ borderBottom: "0.5px solid var(--rule)" }}>
              {momentDrafts.map((m) => (
                <MomentDraftRow key={m.key} moment={m} onDelete={() => removeDraft(m.key)} />
              ))}
            </div>
          )}

          {showMomentForm ? (
            <MomentDraftForm onAdd={addDraft} onCancel={() => setShowMomentForm(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowMomentForm(true)}
              className="w-full px-5 sm:px-8 py-3 text-left text-[13px] transition-opacity active:opacity-70"
              style={{ color: "var(--teal)" }}
            >
              + Add a moment
            </button>
          )}
        </Section>

        {error && (
          <p className="px-5 sm:px-8 py-3 text-[13px] text-red-400">{error}</p>
        )}

        {/* ── Save ──────────────────────────────────────────────────── */}
        <div className="px-5 sm:px-8 py-4 mt-auto">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            {saving ? "Saving…" : `Save set${momentDrafts.length > 0 ? ` + ${momentDrafts.length} moment${momentDrafts.length > 1 ? "s" : ""}` : ""} →`}
          </button>
        </div>
      </form>

      <BottomNav />

      <style>{`
        .field-input {
          width: 100%;
          background: transparent;
          color: var(--t1);
          font-size: 14px;
          outline: none;
          border: none;
          text-align: right;
          caret-color: var(--teal);
        }
        .field-input::placeholder { color: var(--t4); }
        input[type="date"].field-input::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
    </main>
  );
}

/* ─── Moment draft row ───────────────────────────────────────────────────── */

function MomentDraftRow({ moment, onDelete }: { moment: MomentDraft; onDelete: () => void }) {
  const isId = moment.mode === "id";
  const ts   = parseManualTimestamp(moment.tsInput);
  return (
    <div className="flex items-center gap-3 px-5 sm:px-8 py-[11px]"
      style={{ borderBottom: "0.5px solid var(--rule)" }}>
      <div className="shrink-0 w-[52px]">
        {ts !== null ? (
          <span className="text-[11px] font-medium"
            style={{ color: isId ? "var(--amber)" : "var(--teal)", fontFamily: "var(--font-jb-mono, monospace)" }}>
            {formatTimestamp(ts)}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: "var(--t4)" }}>—</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {isId ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-1.5 py-[2px] rounded shrink-0"
              style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "0.5px solid var(--amber-rule)" }}>
              ID
            </span>
            {moment.artist && (
              <p className="text-[12px] truncate" style={{ color: "rgba(201,162,74,0.75)" }}>{moment.artist}</p>
            )}
          </div>
        ) : (
          <p className="text-[13px] font-medium truncate" style={{ color: "var(--t1)" }}>
            {[moment.artist, moment.title].filter(Boolean).join(" — ") || "Untitled"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-opacity active:opacity-70"
        style={{ color: "var(--t4)" }}
        aria-label="Remove moment"
      >
        <XIcon />
      </button>
    </div>
  );
}

/* ─── Moment draft form ──────────────────────────────────────────────────── */

function MomentDraftForm({
  onAdd,
  onCancel,
}: {
  onAdd:    (m: Omit<MomentDraft, "key">) => void;
  onCancel: () => void;
}) {
  const [mode,       setMode]       = useState<"track" | "id">("track");
  const [mTitle,     setMTitle]     = useState("");
  const [mArtist,    setMArtist]    = useState("");
  const [mTs,        setMTs]        = useState("");
  const [mTsEnd,     setMTsEnd]     = useState("");
  const [mRating,    setMRating]    = useState<number | null>(null);

  const ts    = parseManualTimestamp(mTs);
  const tsEnd = parseManualTimestamp(mTsEnd);

  const canAdd = ts !== null || (mode === "track" ? (mTitle.trim() || mArtist.trim()) !== "" : mArtist.trim() !== "");

  return (
    <div className="px-5 sm:px-8 py-4" style={{ borderTop: "0.5px solid var(--rule)" }}>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        {(["track", "id"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors"
            style={{
              background: mode === m ? "var(--bg4)" : "transparent",
              border:     "0.5px solid var(--rule2)",
              color:      mode === m ? (m === "id" ? "var(--amber)" : "var(--t1)") : "var(--t3)",
            }}
          >
            {m === "track" ? "I know it" : "Unknown"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {/* Timestamp */}
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
            Start timestamp
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1:23:45"
            value={mTs}
            onChange={(e) => setMTs(e.target.value)}
            autoFocus
            className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
            style={{
              background:  "var(--bg3)",
              border:      "0.5px solid var(--rule2)",
              color:       "var(--t1)",
              fontFamily:  "var(--font-jb-mono, monospace)",
              caretColor:  mode === "id" ? "var(--amber)" : "var(--teal)",
            }}
          />
          {ts !== null && (
            <p className="text-[11px] mt-1" style={{ color: mode === "id" ? "var(--amber)" : "var(--teal)" }}>
              ⏱ {formatTimestamp(ts)}
            </p>
          )}
        </div>

        {/* End timestamp */}
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
            End timestamp
            <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1:27:00"
            value={mTsEnd}
            onChange={(e) => setMTsEnd(e.target.value)}
            className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
            style={{
              background:  "var(--bg3)",
              border:      "0.5px solid var(--rule2)",
              color:       "var(--t1)",
              fontFamily:  "var(--font-jb-mono, monospace)",
            }}
          />
          {tsEnd !== null && ts !== null && (
            <p className="text-[11px] mt-1" style={{ color: "var(--t4)" }}>
              → {formatTimestamp(tsEnd)}
            </p>
          )}
        </div>

        {/* Artist */}
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
            Artist
            {mode === "id" && (
              <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
            )}
          </p>
          <input
            type="text"
            placeholder="Artist name"
            value={mArtist}
            onChange={(e) => setMArtist(e.target.value)}
            className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
            style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: mode === "id" ? "var(--amber)" : "var(--teal)" }}
          />
        </div>

        {/* Title (track mode) */}
        {mode === "track" && (
          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>Title</p>
            <input
              type="text"
              placeholder="Track title"
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: "var(--teal)" }}
            />
          </div>
        )}

        {/* Rating */}
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--t4)" }}>
            Rating
            <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
          </p>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = mRating !== null && star <= mRating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setMRating(mRating === star ? null : star)}
                  className="p-1.5 transition-transform active:scale-90"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24"
                    fill={filled ? "var(--amber)" : "none"}
                    stroke={filled ? "var(--amber)" : "var(--rule3)"}
                    strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              );
            })}
            {mRating !== null && (
              <span className="ml-1 text-[11px]" style={{ color: "var(--amber)" }}>{mRating}/5</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onAdd({ mode, title: mTitle.trim(), artist: mArtist.trim(), tsInput: mTs, tsEndInput: mTsEnd, rating: mRating })}
            disabled={!canAdd}
            className="flex-1 h-10 rounded-[8px] text-[13px] font-medium transition-opacity disabled:opacity-40"
            style={{
              background: mode === "id" ? "var(--amber-soft)" : "var(--bg3)",
              border:     mode === "id" ? "0.5px solid var(--amber-rule)" : "0.5px solid var(--rule2)",
              color:      mode === "id" ? "var(--amber)" : "var(--t1)",
            }}
          >
            Add moment →
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-[8px] text-[13px]"
            style={{ background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Form helpers ───────────────────────────────────────────────────────── */

function Section({ label, optional, children }: {
  label:    string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "0.5px solid var(--rule)" }}>
      <p className="px-5 sm:px-8 pt-[14px] pb-[6px] text-[10px] tracking-[0.12em] uppercase"
        style={{ color: "var(--t4)" }}>
        {label}
        {optional && (
          <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
        )}
      </p>
      {children}
    </div>
  );
}

function Field({ label, required, last, children }: {
  label:    string;
  required?: boolean;
  last?:    boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]"
      style={{ borderBottom: last ? undefined : "0.5px solid var(--rule)" }}
    >
      <span className="text-[13px] shrink-0 w-[90px]" style={{ color: "var(--t3)" }}>
        {label}
        {required && <span style={{ color: "var(--amber)" }}> *</span>}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
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

function WaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} style={{ color: "var(--t4)" }}>
      <rect x="3"  y="14" width="2.5" height="6"  rx="1.25" />
      <rect x="8"  y="9"  width="2.5" height="11" rx="1.25" />
      <rect x="13" y="5"  width="2.5" height="15" rx="1.25" />
      <rect x="18" y="11" width="2.5" height="8"  rx="1.25" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}
