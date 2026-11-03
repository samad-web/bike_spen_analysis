import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DonationConfig {
  upi_id: string;
  display_name: string;
  note: string;
}

/**
 * Reads the public donation config from app_settings. Everyone can read it
 * (RLS allows `is_public` rows). Only superadmins can write — see
 * `AdminScreen.tsx` for the admin update UI.
 */
export function useDonationConfig() {
  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("value").eq("key", "donation").maybeSingle();
    setConfig((data?.value ?? null) as DonationConfig | null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const update = useCallback(async (next: DonationConfig) => {
    const { error } = await supabase.from("app_settings").upsert({
      key: "donation",
      value: next,
      is_public: true,
      updated_at: new Date().toISOString(),
    });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [refresh]);

  return { config, loading, update, refresh };
}

/** Builds a `upi://` deep-link URL suitable for QR encoding.
 *  Spec: NPCI UPI-URI reference, same scheme used by GPay/PhonePe/Paytm.
 *
 *  pa = payee address (UPI id)
 *  pn = payee name (percent-encoded)
 *  cu = currency (INR)
 *  tn = transaction note
 *  am = amount (optional; omitted so the sender picks)
 */
export function buildUpiUrl(opts: { upi: string; name: string; note?: string; amount?: number }): string {
  const params = new URLSearchParams();
  params.set("pa", opts.upi);
  if (opts.name) params.set("pn", opts.name);
  params.set("cu", "INR");
  if (opts.note) params.set("tn", opts.note);
  if (opts.amount && opts.amount > 0) params.set("am", opts.amount.toFixed(2));
  return `upi://pay?${params.toString()}`;
}
