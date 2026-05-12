"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

/* ─── SVG icons ─────────────────────────────────────────────────────────── */

function VinylIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function StackIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function DiscIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function BottomNav() {
  const path   = usePathname();
  const router = useRouter();

  const [user, setUser]             = useState<User | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  /* Lock body scroll when a sheet is open */
  const prevOverflow = useRef("");
  useEffect(() => {
    if (showAdd || showProfile) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }
    return () => { document.body.style.overflow = prevOverflow.current; };
  }, [showAdd, showProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowProfile(false);
    router.push("/login");
  }

  const onLibrary = path === "/library" || path.startsWith("/track/");
  const onIds     = path === "/ids";
  const onCrates  = path === "/crates" || path.startsWith("/crates/");

  const navBg     = "rgba(20,20,22,0.97)";
  const activeTxt = "var(--t1)";
  const dimTxt    = "var(--t3)";
  const amberTxt  = "var(--amber)";

  return (
    <>
      {/* ── Add Sheet ──────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(3px)" }}
            onClick={() => setShowAdd(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 rounded-t-[22px] animate-sheet-up"
            style={{
              background: "var(--bg2)",
              borderTop: "0.5px solid var(--rule2)",
              boxShadow: "0 -20px 50px -10px rgba(0,0,0,0.6)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Drag handle */}
            <div className="mx-auto mt-3 mb-4 w-9 h-1 rounded-full"
              style={{ background: "var(--rule3)" }} />

            <p className="px-5 mb-3 text-[10px] tracking-[0.12em] uppercase"
              style={{ color: "var(--t3)" }}>
              What did you find?
            </p>

            <div className="px-4 pb-6 flex flex-col gap-2">
              {/* Add a track */}
              <Link
                href="/quick-add"
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-3 rounded-xl p-3.5"
                style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--bg4)", color: "var(--t2)" }}>
                  <DiscIcon />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: "var(--t1)" }}>Add a track</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>Artist, title, tags, source</div>
                </div>
                <span style={{ color: "var(--t4)" }}><ChevronRight /></span>
              </Link>

              {/* Log an ID needed */}
              <Link
                href="/quick-add?status=IDs+Needed"
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-3 rounded-xl p-3.5"
                style={{
                  background: "var(--amber-soft)",
                  border: "0.5px solid var(--amber-rule)",
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(201,162,74,0.12)", color: "var(--amber)" }}>
                  <BookmarkIcon active={false} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: "var(--amber)" }}>Log an ID needed</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "rgba(201,162,74,0.55)" }}>Unknown track, where you heard it</div>
                </div>
                <span style={{ color: "var(--amber)" }}><ChevronRight /></span>
              </Link>

              {/* Log from a set */}
              <Link
                href="/quick-add"
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-3 rounded-xl p-3.5"
                style={{ background: "var(--bg3)", border: "0.5px solid var(--rule2)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--bg4)", color: "var(--t2)" }}>
                  <PlayIcon />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: "var(--t1)" }}>Log from a set</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>Timestamp + source URL</div>
                </div>
                <span style={{ color: "var(--t4)" }}><ChevronRight /></span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Sheet ───────────────────────────────────────────────── */}
      {showProfile && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(3px)" }}
            onClick={() => setShowProfile(false)}
          />
          <div
            className="absolute left-0 right-0 bottom-0 rounded-t-[22px] animate-sheet-up"
            style={{
              background: "var(--bg2)",
              borderTop: "0.5px solid var(--rule2)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto mt-3 mb-5 w-9 h-1 rounded-full"
              style={{ background: "var(--rule3)" }} />
            <div className="px-6 pb-6">
              <p className="text-[11px] mb-1" style={{ color: "var(--t3)" }}>Signed in as</p>
              <p className="text-[14px] font-medium mb-8 truncate"
                style={{ color: "var(--t1)" }}>{user?.email ?? "—"}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 rounded-xl text-sm transition-colors"
                style={{
                  background: "var(--bg3)",
                  border: "0.5px solid var(--rule2)",
                  color: "var(--t2)",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav bar ──────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
        style={{
          background: navBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "0.5px solid var(--rule)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-start justify-around h-[60px] pt-2">

          {/* Library */}
          <Link
            href="/library"
            className="flex flex-col items-center gap-[3px] px-3 py-1"
            style={{ color: onLibrary ? activeTxt : dimTxt }}
          >
            <VinylIcon active={onLibrary} />
            <span className="text-[10px]">Library</span>
          </Link>

          {/* IDs */}
          <Link
            href="/ids"
            className="flex flex-col items-center gap-[3px] px-3 py-1"
            style={{ color: amberTxt }}
          >
            <BookmarkIcon active={onIds} />
            <span className="text-[10px]">IDs</span>
          </Link>

          {/* Add — lifted above nav */}
          <div className="flex flex-col items-center" style={{ marginTop: "-18px" }}>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              aria-label="Add"
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{
                background: "var(--t1)",
                color: "var(--bg)",
                border: "3px solid var(--bg2)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              <PlusIcon />
            </button>
            <span className="text-[10px] mt-[3px]" style={{ color: "var(--t1)" }}>Add</span>
          </div>

          {/* Crates */}
          <Link
            href="/crates"
            className="flex flex-col items-center gap-[3px] px-3 py-1"
            style={{ color: onCrates ? activeTxt : dimTxt }}
          >
            <StackIcon active={onCrates} />
            <span className="text-[10px]">Crates</span>
          </Link>

          {/* Profile */}
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-[3px] px-3 py-1"
            style={{ color: dimTxt }}
          >
            <UserIcon active={false} />
            <span className="text-[10px]">You</span>
          </button>

        </div>
      </nav>
    </>
  );
}
