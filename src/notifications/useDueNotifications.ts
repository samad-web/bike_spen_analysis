import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { fireDueNotifications, pickDueItems } from "./dueNotifications";

/**
 * Mount once at the app shell level. Checks for overdue maintenance and
 * expiring documents whenever the user is signed in and the tab regains
 * focus, firing a local notification per newly-due item (de-duped by the
 * notification_ledger table so the same cycle doesn't re-fire).
 */
export function useDueNotifications() {
  const { session } = useAuth();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!session?.user.id) return;

    const check = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const [reminders, documents, vehicles] = await Promise.all([
          supabase.from("maintenance_reminders")
            .select("id, vehicle_id, label, schedule_type, interval_km, interval_days, last_done_date, last_done_odometer, notes")
            .is("deleted_at", null),
          supabase.from("vehicle_documents")
            .select("id, vehicle_id, doc_type, label, storage_path, mime_type, file_size_bytes, expires_on, issued_on, created_at")
            .is("deleted_at", null),
          supabase.from("vehicles")
            .select("id, name")
            .is("deleted_at", null),
        ]);

        if (!reminders.data && !documents.data) return;

        // Compute each vehicle's latest known odometer from the latest expense
        // that carried one. Cheap for small accounts.
        const latestOdo: Record<string, number | null> = {};
        const { data: odoRows } = await supabase.from("expenses")
          .select("vehicle_id, odometer_reading, expense_date")
          .not("odometer_reading", "is", null)
          .is("deleted_at", null)
          .order("expense_date", { ascending: false });
        for (const row of odoRows ?? []) {
          if (!(row.vehicle_id in latestOdo)) latestOdo[row.vehicle_id] = row.odometer_reading;
        }

        const vehicleNames: Record<string, string> = {};
        for (const v of vehicles.data ?? []) vehicleNames[v.id] = v.name;

        const items = pickDueItems({
          reminders: (reminders.data ?? []).map((r) => ({ ...r, vehicle_name: vehicleNames[r.vehicle_id] })),
          documents: (documents.data ?? []).map((d) => ({ ...d, vehicle_name: vehicleNames[d.vehicle_id] })),
          currentOdometerByVehicle: latestOdo,
        });

        await fireDueNotifications(session.user.id, items);
      } finally {
        inFlight.current = false;
      }
    };

    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session?.user.id]);
}
