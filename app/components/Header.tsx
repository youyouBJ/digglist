"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const path = usePathname();
  const onLibrary = path.startsWith("/library") || path.startsWith("/track");

  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-white/10 shrink-0">
      <Link
        href="/"
        className="text-2xl font-bold tracking-widest uppercase text-white hover:text-white/80 transition-colors"
      >
        Digglist
      </Link>
      <nav className="flex items-center gap-6">
        <Link
          href="/library"
          className={`text-sm transition-colors ${
            onLibrary ? "text-white font-medium" : "text-white/50 hover:text-white"
          }`}
        >
          Library
        </Link>
        <Link
          href="/add-track"
          className="px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          + Add Track
        </Link>
      </nav>
    </header>
  );
}
