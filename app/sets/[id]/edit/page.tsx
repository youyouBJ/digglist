"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSetById, updateSet } from "@/lib/supabase-sets";
import { getSetTracks } from "@/lib/supabase-sets";
import { createTrack, updateTrack, deleteTrack, type Track } from "@/lib/supabase-tracks";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import { parseManualTimestamp, formatTimestamp } from "@/lib/timestamp";
import type { MixSet } from "@/lib/types";

export default function EditSetPage() {
  const user   = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  /* Set data */
  const [set, setSet]         = useState<MixSet | null | undefined>(undefined);
  const [moments, setMoments] = useState<Track[]>([]);
  const [error, setError]     = useState<string | null>(null);

  /* Set info form */
  const [title, setTitle]   = useState("");
  const [artist, setArtist] = useState("");
  const [party, setParty]   = useState("");
  const [setDate, setSetDate] = useState("");
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);

  /* Moment sheet (add / edit) */
  const [sheetOpen, setSheetOpen]       = useState<"add" | "edit" | null>(null);
  const [editingMoment, setEditingMoment] = useState<Track | null>(null);
  const [sheetMode, setSheetMode]       = useState<"track" | "id">("track");
  const [sheetTitle, setSheetTitle]     = useState("");
  const [sheetArtist, setSheetArtist]   = useState("");
  const [sheetTs, setSheetTs]           = useState("");
  const [sheetTsEnd, setSheetTsEnd]     = useState("");
  const [sheetRating, setSheetRating]   = useState<number | null>(null);
  const [sheetSaving, setSheetSaving]   = useState(false);
  const [sheetError, setSheetError]     = useState<string | null>(null);

  /* Delete moment confirm */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const prevOverflow = useRef("");

  useEffect(() => {
    if (!user) return;
    Promise.all([getSetById(id), getSetTracks(id)])
      .then(([s, m]) => {
        setSet(s);
        setMoments(m);
        if (s) {
          setTitle(s.title);
          setArtist(s.artist);
          setParty(s.party);
          setSetDate(s.setDate ?? "");
          setNotes(s.notes);
        }
      })
      .catch((e: Error) => { setError(e.message); setSet(null); });
  }, [id, user]);

  /* Scroll lock when sheet is open */
  useEffect(() => {
    if (sheetOpen) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => { document.body.style.overflow = prevOverflow.current; };
  }, [sheetOpen]);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateSet(id, {
        title:   title.trim(),
        artist:  artist.trim(),
        party:   party.trim(),
        setDate: setDate || null,
        notes:   notes.trim(),
      });
      router.push(`/sets/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  function openAddSheet() {
    setSheetMode("track");
    setSheetTitle(""); setSheetArtist(""); setSheetTs(""); setSheetTsEnd(""); setSheetRating(null);
    setSheetError(null);
    setEditingMoment(null);
    setSheetOpen("add");
  }

  function openEditSheet(m: Track) {
    setSheetMode(m.recordType === "id_needed" ? "id" : "track");
    setSheetTitle(m.title === "Unknown track" ? "" : m.title);
    setSheetArtist(m.artist);
    setSheetTs(m.sourceTimestamp !== null ? formatTimestamp(m.sourceTimestamp) : "");
    setSheetTsEnd(m.timestampEnd !== null ? formatTimestamp(m.timestampEnd) : "");
    setSheetRating(m.rating);
    setSheetError(null);
    setEditingMoment(m);
    setSheetOpen("edit");
  }

  async function handleSheetSave() {
    if (!set) return;
    const ts    = parseManualTimestamp(sheetTs);
    const tsEnd = parseManualTimestamp(sheetTsEnd);
    setSheetSaving(true);
    setSheetError(null);
    try {
      if (sheetOpen === "edit" && editingMoment) {
        const patch: Omit<Track, "id" | "createdAt"> = {
          ...editingMoment,
          title:           sheetMode === "track" ? sheetTitle.trim() : "Unknown track",
          artist:          sheetArtist.trim(),
          recordType:      sheetMode === "track" ? "track" : "id_needed",
          rating:          sheetRating,
          sourceTimestamp: ts,
          timestampEnd:    tsEnd,
        };
        await updateTrack(editingMoment.id, patch);
        setMoments((prev) =>
          prev.map((m) => m.id === editingMoment.id ? { ...m, ...patch } : m)
              .sort(sortByTs)
        );
      } else {
        const newTrack = await createTrack({
          title:           sheetMode === "track" ? sheetTitle.trim() : "Unknown track",
          artist:          sheetArtist.trim(),
          label:           "",
          recordType:      sheetMode === "track" ? "track" : "id_needed",
          rating:          sheetRating,
          sourcePlatform:  set.platform ?? "",
          sourceUrl:       set.sourceUrl ?? "",
          imageUrl:        "",
          genre:           "",
          mood:            "",
          status:          sheetMode === "id" ? "IDs Needed" : "",
          notes:           "",
          sourceTimestamp: ts,
          timestampEnd:    tsEnd,
          videoAuthor:     "",
          trackIdHint:     "",
          setId:           id,
        });
        setMoments((prev) => [...prev, newTrack].sort(sortByTs));
      }
      setSheetOpen(null);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSheetSaving(false);
    }
  }

  async function handleDeleteMoment(momentId: string) {
    try {
      await deleteTrack(momentId);
      setMoments((prev) => prev.filter((m) => m.id !== momentId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  if (!user || set === undefined) return <PageLoader />;
  if (set === null) {
    return (
      <PageError
        message={error ?? "Set not found."}
        backHref="/sets"
        backLabel="Back to Sets"
      />
    );
  }

  const sheetTs_parsed    = parseManualTimestamp(sheetTs);
  const sheetTsEnd_parsed = parseManualTimestamp(sheetTsEnd);

  return (
    <main className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}>
      <Header />

      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link href={`/sets/${id}`} className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--teal)" }}>
          <ArrowLeft />
          {set.title || "Set"}
        </Link>
      </div>

      <div className="px-5 sm:px-8 pb-5">
        <h1 className="text-[24px] font-medium tracking-[-0.03em]" style={{ color: "var(--t1)" }}>
          Edit set
        </h1>
      </div>

      {/* ── Set info form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSaveInfo} className="flex flex-col">

        <div style={{ borderTop: "0.5px solid var(--rule)" }}>
          <p className="px-5 sm:px-8 pt-[14px] pb-[6px] text-[10px] tracking-[0.12em] uppercase"
            style={{ color: "var(--t4)" }}>
            Set info
          </p>
        </div>

        <Field label="Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="field-input"
          />
        </Field>
        <Field label="Artist / DJ">
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="—"
            className="field-input"
          />
        </Field>
        <Field label="Party / event">
          <input
            type="text"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder="—"
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

        <div style={{ borderTop: "0.5px solid var(--rule)" }}>
          <p className="px-5 sm:px-8 pt-[14px] pb-[6px] text-[10px] tracking-[0.12em] uppercase"
            style={{ color: "var(--t4)" }}>
            Notes
            <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
          </p>
          <div className="px-5 sm:px-8 pb-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Context, vibe…"
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none resize-none"
              style={{
                background: "var(--bg3)",
                border:     "0.5px solid var(--rule2)",
                color:      "var(--t1)",
                caretColor: "var(--teal)",
              }}
            />
          </div>
        </div>

        {error && (
          <p className="px-5 sm:px-8 pb-3 text-[13px] text-red-400">{error}</p>
        )}

        <div className="px-5 sm:px-8 pb-5">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            {saving ? "Saving…" : "Save info →"}
          </button>
        </div>
      </form>

      {/* ── Moments section ───────────────────────────────────────────── */}
      <div style={{ borderTop: "0.5px solid var(--rule)" }}>
        <div className="flex items-center justify-between px-5 sm:px-8 pt-[14px] pb-[10px]">
          <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--t4)" }}>
            Moments
            {moments.length > 0 && (
              <span className="ml-1.5" style={{ color: "var(--t3)", fontFeatureSettings: '"tnum"' }}>
                {moments.length}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={openAddSheet}
            className="text-[12px] font-medium"
            style={{ color: "var(--teal)" }}
          >
            + Add
          </button>
        </div>

        {moments.length === 0 ? (
          <p className="px-5 sm:px-8 pb-4 text-[13px]" style={{ color: "var(--t4)" }}>
            No moments yet. Add the tracks you heard in this set.
          </p>
        ) : (
          <>
            {moments.map((m) => {
              const isId  = m.recordType === "id_needed";
              const hasTs = m.sourceTimestamp !== null;
              return (
                <div key={m.id} style={{ borderBottom: "0.5px solid var(--rule)" }}>
                  <div className="flex items-center gap-3 px-5 sm:px-8 pt-[12px] pb-[6px]">
                    {/* Timestamp */}
                    <div className="shrink-0 w-[52px]">
                      {hasTs ? (
                        <span
                          className="text-[12px] font-medium"
                          style={{
                            color:      isId ? "var(--amber)" : "var(--teal)",
                            fontFamily: "var(--font-jb-mono, monospace)",
                          }}
                        >
                          {formatTimestamp(m.sourceTimestamp!)}
                        </span>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--t4)" }}>—</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {isId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-1.5 py-[2px] rounded shrink-0"
                            style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "0.5px solid var(--amber-rule)" }}>
                            ID
                          </span>
                          {m.artist && (
                            <p className="text-[12px] truncate" style={{ color: "rgba(201,162,74,0.75)" }}>{m.artist}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-[13px] font-medium truncate" style={{ color: "var(--t1)" }}>
                            {m.title || "Untitled"}
                          </p>
                          {m.artist && (
                            <p className="text-[11px] truncate" style={{ color: "var(--t3)" }}>{m.artist}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="px-5 sm:px-8 pb-[10px] flex items-center gap-3" style={{ marginLeft: 52 + 12 }}>
                    {confirmDeleteId === m.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeleteMoment(m.id)}
                          className="text-[11px] text-red-400 font-medium"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px]"
                          style={{ color: "var(--t4)" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditSheet(m)}
                          className="text-[11px] font-medium"
                          style={{ color: "var(--teal)" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="text-[11px]"
                          style={{ color: "var(--t4)" }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <BottomNav />

      {/* ── Moment sheet (add / edit) ────────────────────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(3px)" }}
            onClick={() => setSheetOpen(null)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col rounded-t-[22px] animate-sheet-up overflow-y-auto"
            style={{
              background:    "var(--bg2)",
              borderTop:     "0.5px solid var(--rule2)",
              boxShadow:     "0 -20px 50px -10px rgba(0,0,0,0.6)",
              maxHeight:     "88vh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto mt-3 mb-4 w-9 h-1 rounded-full shrink-0"
              style={{ background: "var(--rule3)" }} />

            <div className="flex items-center justify-between px-5 mb-1 shrink-0">
              <p className="text-[15px] font-medium" style={{ color: "var(--t1)" }}>
                {sheetOpen === "add" ? "Add a moment" : "Edit moment"}
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(null)}
                className="text-[13px]"
                style={{ color: "var(--t3)" }}
              >
                Cancel
              </button>
            </div>
            <p className="px-5 mb-4 text-[11px]" style={{ color: "var(--t3)" }}>
              A track or ID at a specific timestamp.
            </p>

            {/* Mode toggle */}
            <div className="flex px-5 mb-4 gap-2 shrink-0">
              {(["track", "id"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSheetMode(m)}
                  className="flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: sheetMode === m ? "var(--bg4)" : "transparent",
                    border:     "0.5px solid var(--rule2)",
                    color:      sheetMode === m
                      ? (m === "id" ? "var(--amber)" : "var(--t1)")
                      : "var(--t3)",
                  }}
                >
                  {m === "track" ? "I know it" : "Unknown track"}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5 flex flex-col gap-4">
              {/* Timestamp start */}
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
                  Start timestamp
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1:23:45"
                  value={sheetTs}
                  onChange={(e) => setSheetTs(e.target.value)}
                  autoFocus
                  className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                  style={{
                    background:  "var(--bg3)",
                    border:      "0.5px solid var(--rule2)",
                    color:       "var(--t1)",
                    caretColor:  sheetMode === "id" ? "var(--amber)" : "var(--teal)",
                    fontFamily:  "var(--font-jb-mono, monospace)",
                  }}
                />
                {sheetTs_parsed !== null && (
                  <p className="text-[11px] mt-1" style={{ color: sheetMode === "id" ? "var(--amber)" : "var(--teal)" }}>
                    ⏱ {formatTimestamp(sheetTs_parsed)}
                  </p>
                )}
              </div>

              {/* Timestamp end */}
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
                  End timestamp
                  <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1:27:00"
                  value={sheetTsEnd}
                  onChange={(e) => setSheetTsEnd(e.target.value)}
                  className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                  style={{
                    background:  "var(--bg3)",
                    border:      "0.5px solid var(--rule2)",
                    color:       "var(--t1)",
                    fontFamily:  "var(--font-jb-mono, monospace)",
                  }}
                />
                {sheetTsEnd_parsed !== null && sheetTs_parsed !== null && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--t4)" }}>
                    → {formatTimestamp(sheetTsEnd_parsed)}
                  </p>
                )}
              </div>

              {/* Artist */}
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
                  Artist
                  {sheetMode === "id" && (
                    <span className="ml-1 normal-case tracking-normal" style={{ opacity: 0.5 }}>— optional</span>
                  )}
                </p>
                <input
                  type="text"
                  placeholder="Artist name"
                  value={sheetArtist}
                  onChange={(e) => setSheetArtist(e.target.value)}
                  className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
                  style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: sheetMode === "id" ? "var(--amber)" : "var(--teal)" }}
                />
              </div>

              {/* Title (track only) */}
              {sheetMode === "track" && (
                <div>
                  <p className="text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--t4)" }}>
                    Title
                  </p>
                  <input
                    type="text"
                    placeholder="Track title"
                    value={sheetTitle}
                    onChange={(e) => setSheetTitle(e.target.value)}
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
                    const filled = sheetRating !== null && star <= sheetRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSheetRating(sheetRating === star ? null : star)}
                        className="p-2 transition-transform active:scale-90"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24"
                          fill={filled ? "var(--amber)" : "none"}
                          stroke={filled ? "var(--amber)" : "var(--rule3)"}
                          strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    );
                  })}
                  {sheetRating !== null && (
                    <span className="ml-1 text-[12px]" style={{ color: "var(--amber)" }}>{sheetRating}/5</span>
                  )}
                </div>
              </div>

              {sheetError && (
                <p className="text-[13px] text-red-400">{sheetError}</p>
              )}

              {/* Save button */}
              <button
                type="button"
                onClick={handleSheetSave}
                disabled={sheetSaving}
                className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
                style={{
                  background: sheetMode === "id" ? "var(--amber-soft)" : "var(--t1)",
                  border:     sheetMode === "id" ? "0.5px solid var(--amber-rule)" : "none",
                  color:      sheetMode === "id" ? "var(--amber)" : "var(--bg)",
                }}
              >
                {sheetSaving ? "Saving…" : sheetOpen === "add" ? "Add moment →" : "Save changes →"}
              </button>
            </div>
          </div>
        </div>
      )}

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

/* ─── Sort helper ────────────────────────────────────────────────────────── */

function sortByTs(a: Track, b: Track): number {
  if (a.sourceTimestamp === null) return 1;
  if (b.sourceTimestamp === null) return -1;
  return a.sourceTimestamp - b.sourceTimestamp;
}

/* ─── Form helpers ───────────────────────────────────────────────────────── */

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
