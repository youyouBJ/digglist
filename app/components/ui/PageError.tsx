import Link from "next/link";
import Header from "@/app/components/Header";

export function PageError({
  message = "Something went wrong.",
  backHref,
  backLabel = "Go back",
}: {
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
        <p className="text-sm" style={{ color: "var(--t3)" }}>{message}</p>
        {backHref && (
          <Link
            href={backHref}
            className="text-sm underline underline-offset-2 transition-colors"
            style={{ color: "var(--t2)" }}
          >
            {backLabel}
          </Link>
        )}
      </div>
    </main>
  );
}
