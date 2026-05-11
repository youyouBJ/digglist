import Link from "next/link";
import Header from "./components/Header";

export default function Home() {
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
        <Link
          href="/add-track"
          className="mt-4 px-8 py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors"
        >
          + Add Track
        </Link>
      </section>

      <footer className="px-8 py-4 text-center text-white/20 text-xs">
        Digglist — beta
      </footer>
    </main>
  );
}
