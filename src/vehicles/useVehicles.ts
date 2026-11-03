import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Vehicle {
  id: string;
  name: string;
  active_tag_token: string | null;
  created_at: string;
  photo_url: string | null;
  thumbnail_url: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  registration_number: string | null;
  fuel_type: "petrol" | "diesel" | "electric" | "cng" | "hybrid" | null;
  tank_capacity: number | null;
}

const SELECT = "id, name, active_tag_token, created_at, photo_url, thumbnail_url, make, model, year, registration_number, fuel_type, tank_capacity";

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (!error) setVehicles((data ?? []) as Vehicle[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const createVehicle = useCallback(async (fields: {
    name: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    registration_number?: string | null;
    fuel_type?: Vehicle["fuel_type"];
    tank_capacity?: number | null;
  }) => {
    // The vehicles table has `user_id` as NOT NULL and the RLS insert policy
    // requires `user_id = auth.uid()`. Supabase doesn't auto-fill it, so we
    // read the caller's id from the client session and include it explicitly.
    const { data: userRes, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userRes.user) {
      return { error: authErr?.message ?? "Not signed in" };
    }
    const { error } = await supabase.from("vehicles").insert({
      ...fields,
      user_id: userRes.user.id,
    });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [refresh]);

  const updateVehicle = useCallback(async (id: string, patch: Partial<Vehicle>) => {
    const { error } = await supabase.from("vehicles").update(patch).eq("id", id);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [refresh]);

  const deleteVehicle = useCallback(async (id: string) => {
    const { error } = await supabase.from("vehicles").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [refresh]);

  return { vehicles, loading, refresh, createVehicle, updateVehicle, deleteVehicle };
}
