"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSetById, updateSet } from "@/lib/supabase-sets";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { PageLoader, PageError } from "@/app/components/ui";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import type { MixSet } from "@/lib/types";

export default function EditSetPage() {
  const user   = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [set, setSet]       = useState<MixSet | null | undefined>(undefined);
  const [title, setTitle]   = useState("");
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getSetById(id).then((s) => {
      setSet(s);
      if (s) { setTitle(s.title); setNotes(s.notes); }
    }).catch((e: Error) => { setError(e.message); setSet(null); });
  }, [id, user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateSet(id, { title: title.trim(), notes: notes.trim() });
      router.push(`/sets/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
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
        <h1 className="text-[24px] font-medium tracking-[-0.03em]"
          style={{ color: "var(--t1)" }}>
          Edit set
        </h1>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col gap-0">
        <div className="flex flex-col gap-5 px-5 sm:px-8">

          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>Title</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: "var(--teal)" }}
            />
          </div>

          <div>
            <p className="text-[10px] tracking-[0.12em] uppercase mb-2"
              style={{ color: "var(--t4)" }}>
              Notes
              <span className="ml-1 normal-case tracking-normal"
                style={{ color: "var(--t4)", opacity: 0.6 }}>— optional</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-[8px] px-3 py-2.5 text-[14px] focus:outline-none resize-none"
              style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)", color: "var(--t1)", caretColor: "var(--teal)" }}
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full h-11 rounded-[10px] text-[14px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            {saving ? "Saving…" : "Save changes →"}
          </button>
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
