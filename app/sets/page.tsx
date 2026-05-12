"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSets, deleteSet, type MixSetWithCount } from "@/lib/supabase-sets";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";

export default function SetsPage() {
  const user   = useRequireAuth();
  const router = useRouter();

  const [sets, setSets]       = useState<MixSetWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    if (!user) return;
    getSets()
      .then(setSets)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteSet(id);
      setSets((prev) => prev.filter((s) => s.id !== id));
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return <PageLoader />;

  return (
    <main
      className="min-h-screen flex flex-col pb-24 sm:pb-6"
      style={{ background: "var(--bg)", color: "var(--t1)" }}
    >
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pt-5 pb-4 sm:pt-8 flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.10em] uppercase mb-1"
            style={{ color: "var(--t3)" }}>Your mixes</p>
          <h1 className="text-[30px] font-medium tracking-[-0.04em] leading-none"
            style={{ color: "var(--t1)" }}>Sets</h1>
          {!loading && (
            <p className="text-[12px] mt-2" style={{ color: "var(--t3)" }}>
              {sets.length === 0
                ? "No sets yet"
                : `${sets.length} ${sets.length === 1 ? "set" : "sets"}`}
            </p>
          )}
        </div>
        <Link
          href="/sets/new"
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-medium mt-2"
          style={{ background: "var(--bg3)", color: "var(--t2)", border: "0.5px solid var(--rule2)" }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>
          New set
        </Link>
      </div>

      {error && (
        <p className="px-5 sm:px-8 mb-4 text-[13px] text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: "var(--t3)" }}>Loading…</span>
        </div>
      ) : sets.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ borderTop: "0.5px solid var(--rule)" }}>
          {sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              confirming={confirmId === set.id}
              deleting={deleting && confirmId === set.id}
              onNavigate={() => router.push(`/sets/${set.id}`)}
              onEdit={(e) => { e.stopPropagation(); router.push(`/sets/${set.id}/edit`); }}
              onAskDelete={(e) => { e.stopPropagation(); setConfirmId(set.id); }}
              onCancelDelete={(e) => { e.stopPropagation(); setConfirmId(null); }}
              onConfirmDelete={(e) => { e.stopPropagation(); handleDelete(set.id); }}
            />
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  );
}

/* ─── Set row ────────────────────────────────────────────────────────────── */

function SetRow({
  set, confirming, deleting,
  onNavigate, onEdit, onAskDelete, onCancelDelete, onConfirmDelete,
}: {
  set: MixSetWithCount;
  confirming: boolean;
  deleting: boolean;
  onNavigate: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onAskDelete: (e: React.MouseEvent) => void;
  onCancelDelete: (e: React.MouseEvent) => void;
  onConfirmDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div style={{ borderBottom: "0.5px solid var(--rule)" }}>
      <div
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 sm:px-8 py-[14px] cursor-pointer transition-opacity active:opacity-70"
      >
        {/* Cover or placeholder */}
        {set.coverUrl ? (
          <img
            src={set.coverUrl}
            alt={set.title}
            className="shrink-0 object-cover rounded-[6px]"
            style={{ width: 44, height: 44, border: "0.5px solid var(--rule2)" }}
          />
        ) : (
          <div
            className="shrink-0 flex items-center justify-center rounded-[6px]"
            style={{ width: 44, height: 44, background: "var(--bg4)", border: "0.5px solid var(--rule2)" }}
          >
            <WaveIcon />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium leading-[1.2] truncate" style={{ color: "var(--t1)" }}>
            {set.title || "Untitled set"}
          </p>
          <p className="text-[11px] mt-[3px]" style={{ color: "var(--t3)" }}>
            {[set.platform, formatDate(set.createdAt)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <span
          className="text-[15px] font-medium shrink-0"
          style={{ color: "var(--t3)", fontFeatureSettings: '"tnum"' }}
        >
          {set.momentCount > 0 ? set.momentCount : ""}
        </span>
        <ChevronIcon />
      </div>

      {/* Actions */}
      <div className="px-5 sm:px-8 pb-[10px] flex items-center gap-3" style={{ marginTop: -4 }}>
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
              className="text-[11px] font-medium" style={{ color: "var(--teal)" }}>
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
      <div className="text-[40px]" style={{ color: "var(--t4)" }}>◎</div>
      <p className="text-[14px]" style={{ color: "var(--t3)" }}>No sets yet.</p>
      <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: "var(--t4)" }}>
        Save a mix or set to log the tracks and IDs you discover while listening.
      </p>
      <Link
        href="/sets/new"
        className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-medium"
        style={{ background: "var(--t1)", color: "var(--bg)" }}
      >
        + Add your first set
      </Link>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function WaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} style={{ color: "var(--t4)" }}>
      <rect x="3"  y="14" width="2.5" height="6" rx="1.25" />
      <rect x="8"  y="9"  width="2.5" height="11" rx="1.25" />
      <rect x="13" y="5"  width="2.5" height="15" rx="1.25" />
      <rect x="18" y="11" width="2.5" height="8" rx="1.25" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}
      style={{ color: "var(--t4)", flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}
