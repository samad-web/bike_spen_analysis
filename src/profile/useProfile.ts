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

  // Focus-based refetch
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Realtime subscription so a server-side change (SQL promotion, admin
  // console toggle) refreshes the local state within ~1s.
  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase
      .channel("user_profile_" + session.user.id)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_profiles",
        filter: `user_id=eq.${session.user.id}`,
      }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user.id, refresh]);

  const isSuperadmin = profile?.role === "superadmin";

  return { profile, loading, error, isSuperadmin, refresh, lastFetchAt };
}
