import { supabase } from "@/lib/supabase";

export type NfcTagEventType =
  | "scanned"
  | "written"
  | "erased"
  | "formatted"
  | "replaced"
  | "locked"
  | "password_set"
  | "password_removed"
  | "write_failed";

/** Writes one row to nfc_tag_events (build-docs/features/nfc-tools.md data
 * model). Every NFC Tools screen calls this after each action so
 * TagHistoryScreen has a complete audit trail. Logging failures are
 * swallowed (non-fatal) — an NFC action that succeeded on the physical tag
 * must not be reported as failed just because the audit write failed. */
export async function logTagEvent(event: {
  tagToken?: string | null;
  vehicleId?: string | null;
  eventType: NfcTagEventType;
  tagUid?: string | null;
  tagTechnology?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;

  const { error } = await supabase.from("nfc_tag_events").insert({
    tag_token: event.tagToken ?? null,
    vehicle_id: event.vehicleId ?? null,
    user_id: userRes.user.id,
    event_type: event.eventType,
    tag_uid: event.tagUid ?? null,
    tag_technology: event.tagTechnology ?? null,
    detail: event.detail ?? {},
  });
  if (error) console.warn("Failed to log NFC tag event (non-fatal):", error.message);
}

export interface TagEventRow {
  id: string;
  tag_token: string | null;
  event_type: NfcTagEventType;
  tag_uid: string | null;
  created_at: string;
  detail: Record<string, unknown>;
}

/** TagHistoryScreen's data source — every event for one vehicle, newest first. */
export async function fetchTagEvents(vehicleId: string): Promise<TagEventRow[]> {
  const { data, error } = await supabase
    .from("nfc_tag_events")
    .select("id, tag_token, event_type, tag_uid, created_at, detail")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
