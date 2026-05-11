import Header from "@/app/components/Header";

export function PageLoader() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />
      <div className="flex items-center justify-center flex-1">
        <p className="text-white/30 text-sm">Loading…</p>
      </div>
    </main>
  );
}
