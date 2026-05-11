"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Field, inputClass } from "@/app/components/ui";
import Header from "@/app/components/Header";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/library");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email:    (data.get("email") as string).trim(),
      password: data.get("password") as string,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/library");
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center justify-center flex-1 px-4">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight mb-8">Sign in</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <Field label="Email">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoFocus
                autoComplete="email"
                className={inputClass}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            No account?{" "}
            <Link href="/signup" className="text-white hover:text-white/70 transition-colors underline underline-offset-2">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
