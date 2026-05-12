"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const path       = usePathname();
  const router     = useRouter();
  const onLibrary  = path.startsWith("/library") || path.startsWith("/track");
  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    /* Desktop only — mobile uses BottomNav */
    <header className="hidden sm:flex items-center justify-between px-8 py-5 border-b shrink-0"
      style={{ borderColor: "var(--rule)", background: "var(--bg2)" }}>

      <Link
        href={user ? "/library" : "/"}
        className="font-serif text-2xl tracking-tight hover:opacity-70 transition-opacity"
        style={{ color: "var(--t1)", fontFamily: "var(--font-serif, serif)" }}
      >
        Digglist<span style={{ color: "var(--amber)" }}>.</span>
      </Link>

      {!isAuthPage && (
        <nav className="flex items-center gap-6">
          <Link
            href="/library"
            className="text-sm transition-colors"
            style={{ color: onLibrary ? "var(--t1)" : "var(--t3)" }}
          >
            Library
          </Link>
          <Link
            href="/crates"
            className="text-sm transition-colors"
            style={{ color: path === "/crates" ? "var(--t1)" : "var(--t3)" }}
          >
            Crates
          </Link>
          <Link
            href="/quick-add"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--t1)", color: "var(--bg)" }}
          >
            + Add
          </Link>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm transition-colors"
              style={{ color: "var(--t3)" }}
            >
              Sign out
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
