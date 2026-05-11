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
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/10 shrink-0">
      <Link
        href={user ? "/library" : "/"}
        className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-white hover:text-white/80 transition-colors"
      >
        Digglist
      </Link>

      {!isAuthPage && (
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/library"
            className={`hidden sm:block text-sm transition-colors ${
              onLibrary ? "text-white font-medium" : "text-white/50 hover:text-white"
            }`}
          >
            Library
          </Link>
          <Link
            href="/add-track"
            className="px-4 sm:px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            + Add Track
          </Link>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-white/40 hover:text-white transition-colors"
            >
              Logout
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
