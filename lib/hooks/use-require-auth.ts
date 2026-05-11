"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Checks that the current user is authenticated.
 * Returns the User object when confirmed, undefined while checking.
 * Automatically redirects to /login if no active session.
 *
 * Relies solely on onAuthStateChange which fires an INITIAL_SESSION event
 * immediately on subscription — no need for a redundant getSession() call.
 */
export function useRequireAuth(): User | undefined {
  const router = useRouter();
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return user;
}
