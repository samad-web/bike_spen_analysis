import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ScheduleType = "odometer" | "date" | "both";

export interface MaintenanceReminder {
  id: string;
  vehicle_id: string;
  label: string;
  schedule_type: ScheduleType;
  interval_km: number | null;
  interval_days: number | null;
  last_done_date: string | null;
  last_done_odometer: number | null;
  notes: string | null;
}

export function useMaintenanceReminders(vehicleId: string | null) {
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!vehicleId) { setReminders([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("maintenance_reminders")
      .select("id, vehicle_id, label, schedule_type, interval_km, interval_days, last_done_date, last_done_odometer, notes")
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setReminders((data ?? []) as MaintenanceReminder[]);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = useCallback(async (r: Omit<MaintenanceReminder, "id" | "vehicle_id">) => {
    if (!vehicleId) return { error: "no vehicle" };
    // maintenance_reminders.user_id is NOT NULL and the RLS insert policy
    // requires user_id = auth.uid(); Supabase doesn't auto-fill it.
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return { error: "Not signed in" };
    const { error } = await supabase.from("maintenance_reminders").insert({
      ...r, vehicle_id: vehicleId, user_id: userRes.user.id,
    });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [vehicleId, refresh]);

  const markDone = useCallback(async (id: string, atOdometer: number | null) => {
    const { error } = await supabase.from("maintenance_reminders").update({
      last_done_date: new Date().toISOString().slice(0, 10),
      last_done_odometer: atOdometer,
    }).eq("id", id);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("maintenance_reminders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await refresh();
  }, [refresh]);

  return { reminders, loading, create, markDone, remove };
}

/** Pure: how overdue a reminder is given current odometer / today's date.
 * Returns {status, progress 0..1+, dueText} — used by the UI to pick a color
 * and label without rebuilding the computation per render. */
export function computeReminderStatus(
  r: MaintenanceReminder,
  currentOdometer: number | null,
  today = new Date()
): { status: "ok" | "due_soon" | "overdue" | "unscheduled"; progress: number; dueText: string } {
  const bits: { progress: number; text: string }[] = [];

  if ((r.schedule_type === "odometer" || r.schedule_type === "both") && r.interval_km && r.last_done_odometer != null && currentOdometer != null) {
    const used = currentOdometer - r.last_done_odometer;
    const progress = used / r.interval_km;
    const remaining = r.interval_km - used;
    bits.push({ progress, text: remaining > 0 ? `in ${Math.round(remaining)} km` : `${Math.abs(Math.round(remaining))} km over` });
  }

  if ((r.schedule_type === "date" || r.schedule_type === "both") && r.interval_days && r.last_done_date) {
    const last = new Date(r.last_done_date);
    const days = Math.floor((today.getTime() - last.getTime()) / 86400000);
    const progress = days / r.interval_days;
    const remaining = r.interval_days - days;
    bits.push({ progress, text: remaining > 0 ? `in ${remaining} days` : `${Math.abs(remaining)} days overdue` });
  }

  if (bits.length === 0) return { status: "unscheduled", progress: 0, dueText: "Set a last-done date to track" };

  const worst = bits.reduce((a, b) => (b.progress > a.progress ? b : a));
  const status: "ok" | "due_soon" | "overdue" =
    worst.progress >= 1 ? "overdue" : worst.progress >= 0.8 ? "due_soon" : "ok";

  return { status, progress: worst.progress, dueText: worst.text };
}
