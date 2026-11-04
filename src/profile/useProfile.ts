import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { errorMessage } from "@/lib/errors";

export interface UserProfile {
  user_id: string;
  role: "user" | "superadmin";
  display_name: string | null;
  referral_code: string;
  referred_by_code: string | null;
  created_at: string;
}

/**
 * Current user's profile row.
 *
 * Three sources of truth for "has anything changed server-side":
 *   1. Window focus — covers the "I ran SQL in another tab" path
 *   2. Supabase Realtime subscription on user_profiles — covers out-of-band
 *      promotion (e.g. an admin ran SQL that promoted this user)
 *   3. Explicit refresh() the caller can trigger from a UI button
 *
 * All Supabase errors are surfaced via `error`, not silently swallowed, so
 * the next invisible RLS/network bug stops being invisible.
 */
export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user.id) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("user_profiles")
      .select("user_id, role, display_name, referral_code, referred_by_code, created_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (err) {
      const msg = errorMessage(err);
      console.error("useProfile:", msg, err);
      setError(msg);
    }
    setProfile((data ?? null) as UserProfile | null);
    setLoading(false);
    setLastFetchAt(Date.now());
  }, [session?.user.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Focus-based refetch. Covers:
  //   - User ran SQL in another tab (admin promotion), comes back
  //   - Admin toggled their role in the admin console
  //   - Any out-of-band change since the initial fetch
  //
  // A previous iteration also used a Supabase Realtime `postgres_changes`
  // subscription, but React StrictMode double-mounts the effect, and the
  // supabase-js `channel.on()` call throws "cannot add callbacks after
  // subscribe()" on the second mount because `removeChannel` is async
  // and doesn't complete before the re-mount. Focus-refetch is enough
  // for the actual use cases and doesn't have the StrictMode trap.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const isSuperadmin = profile?.role === "superadmin";

  return { profile, loading, error, isSuperadmin, refresh, lastFetchAt };
}
