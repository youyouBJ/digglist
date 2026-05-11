"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Field, inputClass } from "@/app/components/ui";
import Header from "@/app/components/Header";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/library");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data     = new FormData(e.currentTarget);
    const email    = (data.get("email") as string).trim();
    const password = data.get("password") as string;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setConfirmed(true);
    }
  }

  if (confirmed) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
        <Header />
        <section className="flex flex-col items-center justify-center flex-1 px-4 text-center gap-5">
          <p className="text-4xl">📬</p>
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-white/40 text-sm max-w-xs leading-relaxed">
            We sent you a confirmation link. Click it to activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="mt-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Go to Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <Header />

      <section className="flex flex-col items-center justify-center flex-1 px-4">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight mb-8">Create account</h2>

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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Password
                </label>
                <span className="text-xs text-white/25">min. 6 characters</span>
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:text-white/70 transition-colors underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
