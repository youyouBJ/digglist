"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCrates, deleteCrate, type CrateWithCount } from "@/lib/supabase-crates";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

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

  const topLevel  = crates.filter((c) => !c.parentId);
  const subCrates = crates.filter((c) =>  c.parentId);
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
      <div className="px-5 sm:px-8 pt-5 pb-4 sm:pt-8 flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
            style={{ color: "var(--t3)" }}>Your library</p>
          <h1 className="text-[30px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: "var(--t1)" }}>Crates</h1>
          {!loading && (
            <p className="text-[12px] mt-2" style={{ color: "var(--t3)" }}>
              {topLevel.length === 0 ? "No crates yet" : `${topLevel.length} ${topLevel.length === 1 ? "crate" : "crates"}`}
            </p>
          )}
        </div>
        <Link
          href="/crates/new"
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-medium mt-2"
          style={{ background: "var(--bg3)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>
          New crate
        </Link>
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

          {/* ── IDs Needed — pinned virtual crate ────────────────── */}
          <Link
            href="/ids"
            className="flex items-center gap-4 px-5 sm:px-8 py-[14px] transition-opacity active:opacity-70"
            style={{ borderBottom: "0.5px solid var(--rule)", background: "var(--amber-soft)" }}
          >
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: "rgba(201,162,74,0.18)", border: "0.5px solid var(--amber-rule)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"
                style={{ color: "var(--amber)" }}>
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium" style={{ color: "var(--amber)" }}>
                IDs Needed
              </p>
              <p className="text-[11px] mt-[2px]" style={{ color: "rgba(201,162,74,0.55)" }}>
                Tracks waiting to be identified
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--amber)", opacity: 0.6 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>

          {/* ── Crates grid ──────────────────────────────────────── */}
          {topLevel.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="px-4 sm:px-8 pt-4 pb-4 grid grid-cols-2 gap-3">
              {topLevel.map((crate) => (
                <CrateCard
                  key={crate.id}
                  crate={crate}
                  subCrates={subMap[crate.id] ?? []}
                  confirming={confirmId === crate.id}
                  deleting={deleting && confirmId === crate.id}
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
  return (
    <div
      onClick={onNavigate}
      className="flex flex-col cursor-pointer rounded-[12px] overflow-hidden transition-opacity active:opacity-70"
      style={{
        background:  "var(--bg2)",
        border:      "0.5px solid var(--rule2)",
        borderLeft:  `3px solid ${crate.color}`,
        minHeight:   148,
      }}
    >
      <div className="flex-1 flex flex-col p-4 gap-1">
        {/* Color dot + name */}
        <p className="text-[14px] font-medium leading-[1.25] break-words"
          style={{ color: "var(--t1)" }}>
          {crate.name}
        </p>

        {/* Description */}
        {crate.description && (
          <p className="text-[11px] leading-[1.4] line-clamp-2 mt-[1px]"
            style={{ color: "var(--t3)" }}>
            {crate.description}
          </p>
        )}

        {/* Sub-crate indicator */}
        {subCrates.length > 0 && (
          <p className="text-[10px] mt-1" style={{ color: "var(--t4)" }}>
            {subCrates.length} sub-{subCrates.length === 1 ? "crate" : "crates"}
          </p>
        )}

        {/* Spacer + count */}
        <div className="mt-auto pt-3 flex items-baseline gap-1">
          <span
            className="text-[26px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: crate.color, fontFeatureSettings: '"tnum"' }}
          >
            {crate.trackCount}
          </span>
          <span className="text-[11px]" style={{ color: "var(--t4)" }}>
            {crate.trackCount === 1 ? "track" : "tracks"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderTop: "0.5px solid var(--rule)" }}
      >
        {confirming ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={onConfirmDelete} disabled={deleting}
              className="text-[11px] text-red-400 font-medium disabled:opacity-50">
              {deleting ? "…" : "Delete"}
            </button>
            <button type="button" onClick={onCancelDelete}
              className="text-[11px]" style={{ color: "var(--t4)" }}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button type="button" onClick={onAskDelete}
              className="text-[11px]" style={{ color: "var(--t4)" }}>
              Delete
            </button>
            <button type="button" onClick={onEdit}
              className="text-[11px] font-medium"
              style={{ color: crate.color }}>
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
      <div className="text-[40px]" style={{ color: "var(--t4)" }}>▤</div>
      <p className="text-[14px]" style={{ color: "var(--t3)" }}>No crates yet.</p>
      <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: "var(--t4)" }}>
        Create a crate to organise your digs — Jazz, Club tools, Sets…
      </p>
      <Link
        href="/crates/new"
        className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-medium"
        style={{ background: "var(--t1)", color: "var(--bg)" }}
      >
        + Create your first crate
      </Link>
    </div>
  );
}
