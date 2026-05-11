import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client — used in API routes for token validation.
// Does not store session state; use supabase.auth.getUser(token) to validate JWTs.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
