import { supabase } from "@/lib/supabase";

/** Opaque random token per gap analysis #4 — not derived from the tag UID
 * (the UID is captured separately, for audit only, in nfc_tag_events). */
export function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export interface NfcTagRow {
  token: string;
  vehicle_id: string;
  status: "active" | "replaced" | "erased";
}

/** Looks up an already-registered MotoPulse token, if any. Used before a
 * write to warn "this tag is already registered to {vehicle}" (nfc-tools.md
 * edge case) rather than silently reassigning it. */
export async function findTagByToken(token: string): Promise<NfcTagRow | null> {
  const { data, error } = await supabase.from("nfc_tags").select("token, vehicle_id, status").eq("token", token).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Registers a freshly-written token to a vehicle. Called only AFTER the
 * on-device NFC write has already succeeded (nfc-tools.md acceptance
 * criterion: no orphan DB row if the app is killed mid-write). Retries once
 * on the astronomically unlikely token collision. */
export async function registerToken(vehicleId: string, tokenHint?: string): Promise<string> {
  // nfc_tags.user_id is NOT NULL and the RLS insert policy requires
  // user_id = auth.uid(). Supabase client doesn't auto-fill either — we
  // read the caller's id and include it explicitly.
  const { data: userRes, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userRes.user) throw new Error(authErr?.message ?? "Not signed in");
  const userId = userRes.user.id;

  const attempt = async (token: string) => {
    const { error } = await supabase.from("nfc_tags").insert({
      token, vehicle_id: vehicleId, user_id: userId,
    });
    return error;
  };

  const first = tokenHint ?? generateToken();
  const firstError = await attempt(first);
  if (!firstError) {
    await supabase.from("vehicles").update({ active_tag_token: first }).eq("id", vehicleId);
    return first;
  }
  if (firstError.code !== "23505") throw firstError; // not a unique-violation — don't mask it with a blind retry

  const second = generateToken();
  const secondError = await attempt(second);
  if (secondError) throw secondError;
  await supabase.from("vehicles").update({ active_tag_token: second }).eq("id", vehicleId);
  return second;
}

export async function markTagReplaced(token: string): Promise<void> {
  const { error } = await supabase.from("nfc_tags").update({ status: "replaced" }).eq("token", token);
  if (error) throw error;
}

export async function markTagErased(token: string): Promise<void> {
  const { error } = await supabase.from("nfc_tags").update({ status: "erased" }).eq("token", token);
  if (error) throw error;
}
