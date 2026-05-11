"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "./components/Header";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/library");
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center justify-center flex-1 text-center px-4 gap-6">
        <p className="text-6xl">🎵</p>
        <h2 className="text-4xl font-bold tracking-tight text-white">
          Your music discoveries,<br />
          <span className="text-white/40">all in one place.</span>
        </h2>
        <p className="text-white/50 text-lg max-w-md">
          Save tracks from YouTube, SoundCloud, Discogs, TikTok and Instagram in seconds.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <Link
            href="/login"
            className="px-8 py-3 rounded-full border border-white/20 text-white font-semibold text-base hover:bg-white/10 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors"
          >
            Create account
          </Link>
        </div>
      </section>

      <footer className="px-8 py-4 text-center text-white/20 text-xs">
        Digglist — beta
      </footer>
    </main>
  );
}
