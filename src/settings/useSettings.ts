import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Currency = "INR" | "USD";

export function useSettings() {
  const [currency, setCurrency] = useState<Currency>("INR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_settings")
        .select("currency")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (data) setCurrency(data.currency as Currency);
      else await supabase.from("user_settings").insert({ user_id: userRes.user.id });
      setLoading(false);
    })();
  }, []);

  const updateCurrency = async (next: Currency) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    await supabase
      .from("user_settings")
      .upsert({ user_id: userRes.user.id, currency: next, updated_at: new Date().toISOString() });
    setCurrency(next);
  };

  return { currency, loading, updateCurrency };
}
