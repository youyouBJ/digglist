"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCrate, getCrates, type Crate } from "@/lib/supabase-crates";
import { CRATE_COLORS, CRATE_PATTERNS, getPatternStyle } from "@/lib/constants";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

export default function NewCratePage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [name, setName]               = useState("");
  const [description, setDesc]        = useState("");
  const [color, setColor]             = useState<string>(CRATE_COLORS[0]);
  const [pattern, setPattern]         = useState<string>("");
  const [parentId, setParentId]       = useState<string>("");
  const [parentCrates, setParentCrates] = useState<Crate[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getCrates().then((c) => setParentCrates(c.filter((x) => !x.parentId))).catch(() => {});
  }, [user]);

  if (!user) return <PageLoader />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCrate({
        name:        name.trim(),
        description: description.trim(),
        color,
        pattern,
        parentId:    parentId || null,
      });
      router.push("/crates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create crate.");
      setSaving(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <Header />

      {/* ── Back bar ─────────────────────────────────────────────── */}
      <div className="flex items-center px-5 sm:px-8 pt-4 pb-3 sm:pt-6">
        <Link
          href="/crates"
          className="flex items-center gap-2 text-[13px] transition-colors"
          style={{ color: "var(--teal)" }}
        >
          <ArrowLeft />
          Crates
        </Link>
      </div>

      <div className="px-5 sm:px-8 pb-5">
        <h2 className="text-[22px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--t1)" }}>
          New crate
        </h2>
      </div>

      {error && (
        <p className="px-5 sm:px-8 mb-4 text-[13px] text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">

        {/* ── Color picker ─────────────────────────────────────── */}
        <div style={{ borderTop: "0.5px solid var(--rule)" }}>
          <p className="px-5 sm:px-8 pt-[14px] pb-[10px] text-[10px] tracking-[0.12em] uppercase"
            style={{ color: "var(--t4)" }}>
            Color
          </p>
          <div className="px-5 sm:px-8 pb-5 flex flex-wrap gap-3">
            {CRATE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full transition-transform active:scale-90"
                style={{
                  background: c,
                  boxShadow: color === c
                    ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}`
                    : "none",
                  transform: color === c ? "scale(1.1)" : "scale(1)",
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {/* ── Pattern ──────────────────────────────────────────── */}
        <div style={{ borderTop: "0.5px solid var(--rule)" }}>
          <p className="px-5 sm:px-8 pt-[14px] pb-[10px] text-[10px] tracking-[0.12em] uppercase"
            style={{ color: "var(--t4)" }}>
            Pattern
          </p>
          <div className="px-5 sm:px-8 pb-5 flex items-center gap-2 flex-wrap">
            {CRATE_PATTERNS.map((p) => {
              const selected = pattern === p.id;
              const patStyle = getPatternStyle(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPattern(p.id)}
                  className="rounded-[5px] transition-all active:scale-90"
                  style={{
                    width:           44,
                    height:          28,
                    backgroundColor: color,
                    ...patStyle,
                    boxShadow:  selected ? `0 0 0 2px var(--bg), 0 0 0 3.5px ${color}` : "none",
                    transform:  selected ? "scale(1.08)" : "scale(1)",
                    opacity:    selected ? 1 : 0.50,
                  }}
                  aria-label={p.label}
                  title={p.label}
                />
              );
            })}
          </div>
        </div>

        {/* ── Name ─────────────────────────────────────────────── */}
        <div style={{ borderTop: "0.5px solid var(--rule)" }}>
          <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]"
            style={{ borderBottom: "0.5px solid var(--rule)" }}>
            <span className="text-[13px] shrink-0 w-[100px]" style={{ color: "var(--t3)" }}>
              Name <span style={{ color: "var(--amber)" }}>*</span>
            </span>
            <input
              type="text"
              placeholder="Jazz, Club tools, Favourites…"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="flex-1 text-right bg-transparent text-[14px] outline-none"
              style={{ color: "var(--t1)" }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]"
            style={{ borderBottom: "0.5px solid var(--rule)" }}>
            <span className="text-[13px] shrink-0 w-[100px]" style={{ color: "var(--t3)" }}>
              Description
            </span>
            <input
              type="text"
              placeholder="Optional note…"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              className="flex-1 text-right bg-transparent text-[14px] outline-none"
              style={{ color: "var(--t1)" }}
            />
          </div>

          {/* Parent crate (sub-crate) */}
          {parentCrates.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-[14px]">
              <span className="text-[13px] shrink-0 w-[100px]" style={{ color: "var(--t3)" }}>
                Sub-crate of
              </span>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="bg-transparent text-[13px] outline-none text-right"
                style={{
                  color: parentId ? "var(--t1)" : "var(--t4)",
                  appearance: "none",
                }}
              >
                <option value="">None</option>
                {parentCrates.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Action bar ───────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 sm:px-8 pt-3 pb-4 mt-auto"
          style={{ borderTop: "0.5px solid var(--rule)" }}
        >
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 h-11 rounded-[10px] text-[13px] font-medium transition-colors disabled:opacity-40"
            style={{ backgroundColor: color, ...getPatternStyle(pattern), color: "#fff" }}
          >
            {saving ? "Creating…" : "Create crate"}
          </button>
          <Link
            href="/crates"
            className="h-11 px-5 flex items-center rounded-[10px] text-[13px] transition-colors"
            style={{ background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--rule2)" }}
          >
            Cancel
          </Link>
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
