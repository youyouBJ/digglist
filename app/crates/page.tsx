"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCrates, deleteCrate, type CrateWithCount } from "@/lib/supabase-crates";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function CratesPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [crates, setCrates]       = useState<CrateWithCount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    if (!user) return;
    getCrates()
      .then(setCrates)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteCrate(id);
      setCrates((prev) => prev.filter((c) => c.id !== id));
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return <PageLoader />;

  const topLevel   = crates.filter((c) => !c.parentId);
  const subCrates  = crates.filter((c) => c.parentId);
  const subMap: Record<string, CrateWithCount[]> = {};
  subCrates.forEach((c) => {
    if (!subMap[c.parentId!]) subMap[c.parentId!] = [];
    subMap[c.parentId!].push(c);
  });

  return (
    <main
      className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <Header />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pt-5 pb-5 sm:pt-8">
        <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
          style={{ color: "var(--t3)" }}>
          Your library
        </p>
        <div className="flex items-start justify-between">
          <h1 className="text-[30px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: "var(--t1)" }}>
            Crates
          </h1>
          <Link
            href="/crates/new"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors mt-1"
            style={{ background: "var(--bg3)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
            New crate
          </Link>
        </div>
        {!loading && (
          <p className="text-[12px] mt-2" style={{ color: "var(--t3)" }}>
            {topLevel.length === 0
              ? "No crates yet"
              : `${topLevel.length} ${topLevel.length === 1 ? "crate" : "crates"}`}
          </p>
        )}
      </div>

      {error && (
        <p className="px-5 sm:px-8 mb-4 text-[13px] text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: "var(--t3)" }}>Loading…</span>
        </div>
      ) : (
        <div style={{ borderTop: "0.5px solid var(--rule)" }}>

          {/* ── IDs Needed — pinned virtual crate ───────────────── */}
          <Link
            href="/library?ids=1"
            className="flex items-center gap-4 px-5 sm:px-8 py-4"
            style={{ borderBottom: "0.5px solid var(--rule)", background: "var(--amber-soft)" }}
          >
            <div
              className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: "rgba(201,162,74,0.14)",
                border: "0.5px solid var(--amber-rule)",
              }}
            >
              <BookmarkFillIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium mb-[2px]" style={{ color: "var(--amber)" }}>
                IDs Needed
              </p>
              <p className="text-[11px]" style={{ color: "rgba(201,162,74,0.55)" }}>
                Tracks waiting to be identified
              </p>
            </div>
            <ChevronRight style={{ color: "var(--amber)" }} />
          </Link>

          {/* ── Crates grid ─────────────────────────────────────── */}
          {topLevel.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="px-5 sm:px-8 py-5 grid grid-cols-2 gap-3">
              {topLevel.map((crate) => (
                <CrateCard
                  key={crate.id}
                  crate={crate}
                  subCrates={subMap[crate.id] ?? []}
                  confirming={confirmId === crate.id}
                  deleting={deleting}
                  onNavigate={() => router.push(`/crates/${crate.id}`)}
                  onEdit={(e) => { e.stopPropagation(); router.push(`/crates/${crate.id}/edit`); }}
                  onAskDelete={(e) => { e.stopPropagation(); setConfirmId(crate.id); }}
                  onCancelDelete={(e) => { e.stopPropagation(); setConfirmId(null); }}
                  onConfirmDelete={(e) => { e.stopPropagation(); handleDelete(crate.id); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}

/* ─── Crate card ─────────────────────────────────────────────────────────── */

function CrateCard({
  crate, subCrates, confirming, deleting,
  onNavigate, onEdit, onAskDelete, onCancelDelete, onConfirmDelete,
}: {
  crate: CrateWithCount;
  subCrates: CrateWithCount[];
  confirming: boolean;
  deleting: boolean;
  onNavigate: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onAskDelete: (e: React.MouseEvent) => void;
  onCancelDelete: (e: React.MouseEvent) => void;
  onConfirmDelete: (e: React.MouseEvent) => void;
}) {
  const rgb = hexToRgb(crate.color);

  return (
    <div
      onClick={onNavigate}
      className="flex flex-col rounded-[14px] overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
      style={{
        background: `rgba(${rgb},0.06)`,
        border:     `0.5px solid rgba(${rgb},0.22)`,
      }}
    >
      {/* Color accent strip */}
      <div style={{ height: 3, background: crate.color, opacity: 0.75 }} />

      {/* Main content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Track count */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[30px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: crate.color, fontFeatureSettings: '"tnum"' }}
          >
            {crate.trackCount}
          </span>
          <span className="text-[11px]" style={{ color: "var(--t4)" }}>
            {crate.trackCount === 1 ? "track" : "tracks"}
          </span>
        </div>

        {/* Name + description */}
        <div className="mt-auto">
          <p className="text-[13px] font-medium leading-[1.2] truncate"
            style={{ color: "var(--t1)" }}>
            {crate.name}
          </p>
          {crate.description && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--t3)" }}>
              {crate.description}
            </p>
          )}
          {subCrates.length > 0 && (
            <p className="text-[10px] mt-1" style={{ color: "var(--t4)" }}>
              {subCrates.length} sub-{subCrates.length === 1 ? "crate" : "crates"}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderTop: `0.5px solid rgba(${rgb},0.14)` }}
      >
        {confirming ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={deleting}
              className="text-[11px] text-red-400 font-medium disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="text-[11px]"
              style={{ color: "var(--t4)" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onAskDelete}
              className="text-[11px] transition-colors"
              style={{ color: "var(--t4)" }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="text-[11px] font-medium transition-colors"
              style={{ color: `rgba(${rgb},0.8)` }}
            >
              Edit →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 px-8 text-center">
      <div style={{ color: "var(--t4)", fontSize: 36 }}>▤</div>
      <p className="text-[14px]" style={{ color: "var(--t3)" }}>No crates yet.</p>
      <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: "var(--t4)" }}>
        Create a crate to organise your digs — Jazz, Club tools, Sets…
      </p>
      <Link
        href="/crates/new"
        className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
        style={{ background: "var(--t1)", color: "var(--bg)" }}
      >
        + Create your first crate
      </Link>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function BookmarkFillIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
      style={{ color: "var(--amber)" }}>
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function ChevronRight({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}
