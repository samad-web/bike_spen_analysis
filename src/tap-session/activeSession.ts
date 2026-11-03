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

export async function startSession(vehicleId: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error("Must be signed in to start a session");
  await supabase.from("active_sessions").upsert({
    user_id: userRes.user.id,
    vehicle_id: vehicleId,
    started_at: new Date().toISOString(),
    expires_at: nextMidnightIso(),
  });
}

export async function endSession(): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;
  await supabase.from("active_sessions").delete().eq("user_id", userRes.user.id);
}

export async function resolveTokenToTag(token: string) {
  return findTagByToken(token);
}
