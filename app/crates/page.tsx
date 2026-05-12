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
  const subMap: Record<string, CrateWithCount[]> = {};
  crates.filter((c) => c.parentId).forEach((c) => {
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

          {/* ── Crates list ──────────────────────────────────────── */}
          {topLevel.length === 0 ? (
            <EmptyState />
          ) : (
            topLevel.map((crate) => {
              const subs = subMap[crate.id] ?? [];
              return (
                <div key={crate.id}>
                  {/* Parent row */}
                  <CrateRow
                    crate={crate}
                    hasSubs={subs.length > 0}
                    confirming={confirmId === crate.id}
                    deleting={deleting && confirmId === crate.id}
                    onNavigate={() => router.push(`/crates/${crate.id}`)}
                    onEdit={(e) => { e.stopPropagation(); router.push(`/crates/${crate.id}/edit`); }}
                    onAskDelete={(e) => { e.stopPropagation(); setConfirmId(crate.id); }}
                    onCancelDelete={(e) => { e.stopPropagation(); setConfirmId(null); }}
                    onConfirmDelete={(e) => { e.stopPropagation(); handleDelete(crate.id); }}
                  />
                  {/* Sub-crate rows */}
                  {subs.map((sub, i) => (
                    <SubCrateRow
                      key={sub.id}
                      crate={sub}
                      isLast={i === subs.length - 1}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}

/* ─── Crate row (parent) ─────────────────────────────────────────────────── */

function CrateRow({
  crate, hasSubs, confirming, deleting,
  onNavigate, onEdit, onAskDelete, onCancelDelete, onConfirmDelete,
}: {
  crate: CrateWithCount;
  hasSubs: boolean;
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
      className="group"
      style={{ borderBottom: hasSubs ? "none" : "0.5px solid var(--rule)" }}
    >
      <div
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 sm:px-8 py-[14px] cursor-pointer transition-opacity active:opacity-70"
        style={{ borderLeft: `3px solid ${crate.color}` }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium leading-[1.2]" style={{ color: "var(--t1)" }}>
            {crate.name}
          </p>
          {crate.description && (
            <p className="text-[11px] mt-[2px] line-clamp-1" style={{ color: "var(--t3)" }}>
              {crate.description}
            </p>
          )}
        </div>
        <span
          className="text-[15px] font-medium shrink-0"
          style={{ color: crate.color, fontFeatureSettings: '"tnum"' }}
        >
          {crate.trackCount}
        </span>
        <ChevronIcon />
      </div>

      {/* Actions */}
      <div
        className="px-5 sm:px-8 pb-[10px] flex items-center gap-3"
        style={{ borderLeft: `3px solid ${crate.color}`, borderBottom: "0.5px solid var(--rule)", marginTop: -4 }}
      >
        {confirming ? (
          <div className="flex items-center gap-2">
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

/* ─── Sub-crate row ──────────────────────────────────────────────────────── */

function SubCrateRow({ crate, isLast }: { crate: CrateWithCount; isLast: boolean }) {
  return (
    <Link
      href={`/crates/${crate.id}`}
      className="flex items-center gap-2.5 pr-5 sm:pr-8 py-[11px] transition-opacity active:opacity-70"
      style={{
        paddingLeft:    "20px",
        borderBottom:  "0.5px solid var(--rule)",
        borderLeft:    "3px solid transparent",
        background:    "var(--bg)",
      }}
    >
      {/* L-connector */}
      <div className="relative shrink-0 self-stretch" style={{ width: 20 }}>
        {/* Vertical segment — full height for non-last, top-to-middle for last */}
        <div
          className="absolute w-px"
          style={{
            left:       9,
            top:        0,
            bottom:     isLast ? "50%" : 0,
            background: "var(--rule2)",
          }}
        />
        {/* Horizontal arm */}
        <div
          className="absolute h-px"
          style={{
            left:       9,
            right:      0,
            top:        "50%",
            background: "var(--rule2)",
          }}
        />
      </div>

      {/* Crate color dot */}
      <span className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: crate.color }} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px]" style={{ color: "var(--t2)" }}>
          {crate.name}
        </p>
      </div>

      <span
        className="text-[12px] shrink-0"
        style={{ color: "var(--t3)", fontFeatureSettings: '"tnum"' }}
      >
        {crate.trackCount}
      </span>
      <ChevronIcon small />
    </Link>
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

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function ChevronIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 14;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}
      style={{ color: "var(--t4)", flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}
