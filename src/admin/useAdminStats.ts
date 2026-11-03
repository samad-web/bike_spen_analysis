import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AdminUserRow {
  user_id: string;
  email: string;
  role: "user" | "superadmin";
  display_name: string | null;
  referral_code: string | null;
  referred_by_code: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  vehicle_count: number;
  expense_count: number;
  lifetime_spend: number;
  last_activity_at: string | null;
}

export function useAdminStats(enabled: boolean) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("admin_user_stats")
      .select("*")
      .order("signed_up_at", { ascending: false });
    if (err) setError(err.message);
    else setRows((data ?? []) as AdminUserRow[]);
    setLoading(false);
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh]);

  const totals = useMemo(rows);

  const toggleRole = useCallback(async (userId: string, nextRole: "user" | "superadmin") => {
    const { error: err } = await supabase.from("user_profiles")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (!err) await refresh();
    return { error: err?.message ?? null };
  }, [refresh]);

  return { rows, totals, loading, error, refresh, toggleRole };
}

function useMemo(rows: AdminUserRow[]) {
  const now = Date.now();
  const DAY = 86400000;
  const total = rows.length;
  const activeLast30 = rows.filter((r) => r.last_activity_at && now - Date.parse(r.last_activity_at) < 30 * DAY).length;
  const signupsLast7 = rows.filter((r) => now - Date.parse(r.signed_up_at) < 7 * DAY).length;
  const lifetimeSpend = rows.reduce((s, r) => s + Number(r.lifetime_spend ?? 0), 0);
  const vehicles = rows.reduce((s, r) => s + r.vehicle_count, 0);
  const expenses = rows.reduce((s, r) => s + r.expense_count, 0);
  return { total, activeLast30, signupsLast7, lifetimeSpend, vehicles, expenses };
}
