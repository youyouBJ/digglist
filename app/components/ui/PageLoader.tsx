import Header from "@/app/components/Header";

export function PageLoader() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="flex items-center justify-center flex-1">
        <span className="text-sm" style={{ color: "var(--t3)" }}>Loading…</span>
      </div>
    </main>
  );
}
