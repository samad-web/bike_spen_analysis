import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { computeReminderStatus, type MaintenanceReminder } from "@/maintenance/useMaintenanceReminders";
import { daysUntilExpiry, type VehicleDocument } from "@/documents/useVehicleDocuments";

/**
 * Due-notification scheduler.
 *
 * Fires a local notification (Android via Capacitor LocalNotifications; web
 * via the browser Notification API) when a maintenance reminder goes overdue
 * OR when a vehicle document is within 30 days of expiry.
 *
 * A notification is only sent once per "cycle" — the notification_ledger
 * table in Supabase dedupes across devices and app restarts. The cycle_key is
 * built from the reminder/document id and the period (overdue month OR expiry
 * date), so renewing a reminder past its interval produces a new cycle_key
 * and a new eligible notification.
 *
 * No server-side scheduler required: this runs on app start and after each
 * log that changes odometer. For a future "fire at 9 AM even when the app is
 * closed" we would need a native Android AlarmManager wrapper — out of scope
 * for now.
 */

export interface DueItem {
  cycleKey: string;
  title: string;
  body: string;
  reminderId?: string;
  documentId?: string;
}

/** Pure: given reminders + documents + current odometer, decide what needs
 * notifying. Returns stable `cycleKey`s so the ledger can dedupe. */
export function pickDueItems(opts: {
  reminders: (MaintenanceReminder & { vehicle_name?: string })[];
  documents: (VehicleDocument & { vehicle_name?: string })[];
  currentOdometerByVehicle: Record<string, number | null>;
  today?: Date;
}): DueItem[] {
  const today = opts.today ?? new Date();
  const out: DueItem[] = [];

  for (const r of opts.reminders) {
    const odo = opts.currentOdometerByVehicle[r.vehicle_id] ?? null;
    const s = computeReminderStatus(r, odo, today);
    if (s.status !== "overdue" && s.status !== "due_soon") continue;
    const cycleKey = `rem-${r.id}-${monthKey(today)}`;
    out.push({
      cycleKey,
      title: s.status === "overdue" ? "Service overdue" : "Service due soon",
      body: `${r.label} ${s.dueText}${r.vehicle_name ? ` · ${r.vehicle_name}` : ""}`,
      reminderId: r.id,
    });
  }

  for (const d of opts.documents) {
    const days = daysUntilExpiry(d.expires_on, today);
    if (days == null || days > 30) continue;
    const cycleKey = `doc-${d.id}-${d.expires_on}`;
    out.push({
      cycleKey,
      title: days < 0 ? "Document expired" : "Document expiring",
      body: `${labelFor(d.doc_type)} ${days < 0 ? `expired ${-days} days ago` : `expires in ${days} days`}${d.vehicle_name ? ` · ${d.vehicle_name}` : ""}`,
      documentId: d.id,
    });
  }

  return out;
}

function labelFor(t: string): string {
  switch (t) {
    case "insurance": return "Insurance";
    case "puc": return "PUC";
    case "rc": return "Registration";
    case "service_invoice": return "Service invoice";
    case "warranty": return "Warranty";
    default: return "Document";
  }
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Reads which cycle_keys have already been fired for this user, so we don't
 * re-notify the same cycle on every app open. */
async function fetchFiredCycles(userId: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const { data } = await supabase
    .from("notification_ledger")
    .select("cycle_key")
    .eq("user_id", userId)
    .in("cycle_key", keys);
  return new Set((data ?? []).map((r) => r.cycle_key as string));
}

async function recordFired(userId: string, items: { cycleKey: string; reminderId?: string; documentId?: string }[]) {
  if (items.length === 0) return;
  await supabase.from("notification_ledger").insert(
    items.map((i) => ({
      user_id: userId,
      cycle_key: i.cycleKey,
      reminder_id: i.reminderId ?? null,
      document_id: i.documentId ?? null,
    }))
  );
}

/** Fire the notifications. Uses Capacitor on Android, falls back to the
 * browser Notification API on web. Requests permission on demand. */
export async function fireDueNotifications(userId: string, items: DueItem[]): Promise<{ fired: number }> {
  if (items.length === 0) return { fired: 0 };

  const already = await fetchFiredCycles(userId, items.map((i) => i.cycleKey));
  const toFire = items.filter((i) => !already.has(i.cycleKey));
  if (toFire.length === 0) return { fired: 0 };

  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return { fired: 0 };
    }
    await LocalNotifications.schedule({
      notifications: toFire.map((item, idx) => ({
        id: Date.now() % 2147483647 + idx,
        title: item.title,
        body: item.body,
        schedule: { at: new Date(Date.now() + 2000) }, // 2s delay so native scheduler accepts
      })),
    });
  } else if (typeof Notification !== "undefined") {
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission === "granted") {
      for (const item of toFire) {
        try { new Notification(item.title, { body: item.body, tag: item.cycleKey }); } catch { /* best effort */ }
      }
    }
  }

  await recordFired(userId, toFire);
  return { fired: toFire.length };
}
