import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { startSession } from "@/tap-session/activeSession";

export interface PlannedRide {
  id: string;
  vehicle_id: string;
  plan_date: string;
  notes: string | null;
}

export interface CalendarDaySummary {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  plannedRide: PlannedRide | null;
  riddenVehicleIds: string[];
  totalSpend: number;
  expenseCount: number;
}

export function useRideCalendar(currentMonthDate: Date = new Date()) {
  const { session } = useAuth();
  const [plans, setPlans] = useState<PlannedRide[]>([]);
  const [rideLogs, setRideLogs] = useState<{ vehicle_id: string; ride_date: string }[]>([]);
  const [expenses, setExpenses] = useState<{ vehicle_id: string; total_amount: number; expense_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-based

  // ISO bounds for the month with a week padding on each side
  const startDate = new Date(year, month, 1);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(year, month + 1, 0);
  endDate.setDate(endDate.getDate() + 7);

  const startIso = startDate.toISOString().slice(0, 10);
  const endIso = endDate.toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      setPlans([]);
      setRideLogs([]);
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const [plansRes, ridesRes, expRes] = await Promise.all([
        supabase
          .from("planned_rides")
          .select("id, vehicle_id, plan_date, notes")
          .gte("plan_date", startIso)
          .lte("plan_date", endIso),
        supabase
          .from("ride_logs")
          .select("vehicle_id, ride_date")
          .gte("ride_date", startIso)
          .lte("ride_date", endIso),
        supabase
          .from("expenses")
          .select("vehicle_id, total_amount, expense_date")
          .gte("expense_date", startIso)
          .lte("expense_date", endIso)
          .is("deleted_at", null),
      ]);

      setPlans((plansRes.data ?? []) as PlannedRide[]);
      setRideLogs(ridesRes.data ?? []);
      setExpenses(expRes.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, startIso, endIso]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const planRide = useCallback(
    async (date: string, vehicleId: string, notes?: string) => {
      if (!session?.user.id) return { error: "Not authenticated" };

      const { error } = await supabase.from("planned_rides").upsert(
        {
          user_id: session.user.id,
          vehicle_id: vehicleId,
          plan_date: date,
          notes: notes?.trim() || null,
        },
        { onConflict: "user_id,plan_date" }
      );

      if (!error) {
        // If planned for today, automatically set today's active session!
        const todayIso = new Date().toISOString().slice(0, 10);
        if (date === todayIso) {
          try {
            await startSession(vehicleId);
          } catch {
            /* ignore */
          }
        }
        await refresh();
      }

      return { error: error?.message ?? null };
    },
    [session?.user.id, refresh]
  );

  const clearPlan = useCallback(
    async (date: string) => {
      if (!session?.user.id) return { error: "Not authenticated" };
      const { error } = await supabase
        .from("planned_rides")
        .delete()
        .eq("user_id", session.user.id)
        .eq("plan_date", date);

      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [session?.user.id, refresh]
  );

  // Group helpers for date lookups
  const plansByDate = new Map<string, PlannedRide>();
  for (const p of plans) plansByDate.set(p.plan_date, p);

  const ridesByDate = new Map<string, string[]>();
  for (const r of rideLogs) {
    const list = ridesByDate.get(r.ride_date) ?? [];
    if (!list.includes(r.vehicle_id)) list.push(r.vehicle_id);
    ridesByDate.set(r.ride_date, list);
  }

  const spendByDate = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cur = spendByDate.get(e.expense_date) ?? { total: 0, count: 0 };
    cur.total += e.total_amount;
    cur.count += 1;
    spendByDate.set(e.expense_date, cur);
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const getDaySummary = (dateIso: string): CalendarDaySummary => {
    const [, , d] = dateIso.split("-").map(Number);
    const isToday = dateIso === todayIso;
    const isPast = dateIso < todayIso;
    const isFuture = dateIso > todayIso;

    const planned = plansByDate.get(dateIso) ?? null;
    const ridden = ridesByDate.get(dateIso) ?? [];
    const spend = spendByDate.get(dateIso) ?? { total: 0, count: 0 };

    return {
      date: dateIso,
      dayNumber: d,
      isToday,
      isPast,
      isFuture,
      plannedRide: planned,
      riddenVehicleIds: ridden,
      totalSpend: spend.total,
      expenseCount: spend.count,
    };
  };

  const todayPlan = plansByDate.get(todayIso) ?? null;

  return {
    loading,
    refresh,
    planRide,
    clearPlan,
    getDaySummary,
    todayPlan,
  };
}
