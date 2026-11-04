import { supabase } from "@/lib/supabase";
import { findTagByToken } from "@/nfc/tagRegistry";

export { decideTapOutcome, shouldDebounceTap, type TapOutcome } from "./tapStateMachine";

export interface ActiveSession {
  user_id: string;
  vehicle_id: string;
  started_at: string;
  expires_at: string;
}

/** Returns the current active session for the user, or null. active_sessions
 * is primary-keyed on user_id (one active vehicle per user at a time), so a
 * cross-vehicle "switch" is simply an upsert on that key. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data } = await supabase.from("active_sessions").select("*").eq("user_id", userRes.user.id).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    // Expired (midnight passed) — clean up lazily.
    await supabase.from("active_sessions").delete().eq("user_id", userRes.user.id);
    return null;
  }
  return data as ActiveSession;
}

function nextMidnightIso(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

/**
 * Starts or switches the active ride session for today.
 * Records the ride in:
 * 1. active_sessions (for current state & midnight expiry)
 * 2. ride_logs (for permanent historical logging & calendar)
 * 3. planned_rides (to keep calendar & dashboard widgets synced)
 * 4. nfc_tag_events (for NFC audit trails)
 * Broadcasts 'motopulse:sessionChanged' for real-time UI updates.
 */
export async function startSession(vehicleId: string, token?: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error("Must be signed in to start a session");
  const userId = userRes.user.id;
  const todayIso = new Date().toISOString().slice(0, 10);

  const activePromise = supabase.from("active_sessions").upsert({
    user_id: userId,
    vehicle_id: vehicleId,
    started_at: new Date().toISOString(),
    expires_at: nextMidnightIso(),
  });

  const rideLogPromise = (async () => {
    // Check if a ride_log already exists for today & this vehicle
    const { data: existing } = await supabase
      .from("ride_logs")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("ride_date", todayIso)
      .maybeSingle();

    if (!existing) {
      await supabase.from("ride_logs").insert({
        user_id: userId,
        vehicle_id: vehicleId,
        ride_date: todayIso,
      });
    }
  })();

  const plannedPromise = supabase.from("planned_rides").upsert(
    {
      user_id: userId,
      vehicle_id: vehicleId,
      plan_date: todayIso,
      notes: "Selected via NFC tap",
    },
    { onConflict: "user_id,plan_date" }
  );

  const tagEventPromise = token
    ? supabase.from("nfc_tag_events").insert({
        user_id: userId,
        vehicle_id: vehicleId,
        tag_token: token,
        event_type: "tap_ride_start",
      })
    : Promise.resolve();

  // Run all asynchronously and handle any errors defensively
  const results = await Promise.allSettled([activePromise, rideLogPromise, plannedPromise, tagEventPromise]);
  for (const res of results) {
    if (res.status === "rejected") {
      console.warn("startSession partial failure:", res.reason);
    }
  }

  // Notify active listeners (Calendar, Dashboard, etc.)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("motopulse:sessionChanged", { detail: { vehicleId } }));
  }
}

export async function endSession(): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;
  await supabase.from("active_sessions").delete().eq("user_id", userRes.user.id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("motopulse:sessionChanged", { detail: { vehicleId: null } }));
  }
}

export async function resolveTokenToTag(token: string) {
  return findTagByToken(token);
}
