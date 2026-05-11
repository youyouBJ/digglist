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
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
        <p className="text-white/40">{message}</p>
        {backHref && (
          <Link
            href={backHref}
            className="text-sm text-white hover:text-white/70 transition-colors underline underline-offset-2"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </main>
  );
}
