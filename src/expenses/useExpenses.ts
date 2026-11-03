import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { queueSaveExpense, type SaveExpensePayload } from "@/lib/offline-queue";

export interface Expense {
  id: string;
  vehicle_id: string;
  category: "fuel" | "maintenance";
  total_amount: number;
  litres: number | null;
  price_per_litre: number | null;
  odometer_reading: number | null;
  expense_date: string;
  notes: string | null;
}

export function useExpenses(vehicleId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id, vehicle_id, category, total_amount, litres, price_per_litre, odometer_reading, expense_date, notes")
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false });
    if (!error) setExpenses(data ?? []);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Create or edit (same id = upsert via save_expense RPC). Works offline:
   * queued locally first, synced when connectivity returns. */
  const saveExpense = useCallback(
    async (payload: SaveExpensePayload) => {
      await queueSaveExpense(payload);
      rememberLastAmount(payload.p_vehicle_id, payload.p_category, payload.p_total_amount);
      await refresh();
    },
    [refresh]
  );

  /** Soft delete — never used for "Undo", which instead re-saves the prior
   * state (see QuickLogForm). This is the explicit delete action. */
  const deleteExpense = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [refresh]
  );

  return { expenses, loading, refresh, saveExpense, deleteExpense };
}

function rememberLastAmount(vehicleId: string, category: string, amount: number) {
  try {
    localStorage.setItem(`motopulse:lastAmount:${vehicleId}:${category}`, String(amount));
  } catch {
    // localStorage can throw (private mode, quota) — prefill is a convenience, never required.
  }
}

export function getLastAmount(vehicleId: string, category: string): number | null {
  try {
    const v = localStorage.getItem(`motopulse:lastAmount:${vehicleId}:${category}`);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
