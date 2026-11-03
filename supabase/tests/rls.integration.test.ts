/**
 * RLS + save_expense RPC integration tests.
 *
 * These run against a REAL Supabase project (no mocking RLS makes sense any
 * other way). They are intentionally skipped until SUPABASE_URL /
 * SUPABASE_ANON_KEY env vars are set — see build-docs/MEMORY.md
 * ("Supabase project: provide later").
 *
 * Run with: npx vitest run supabase/tests/rls.integration.test.ts
 *
 * Maps to acceptance criteria in build-docs/features/foundation-schema.md.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll } from "vitest";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const hasCreds = Boolean(url && anonKey);

const d = hasCreds ? describe : describe.skip;

d("RLS: cross-user isolation", () => {
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let vehicleAId: string;

  beforeAll(async () => {
    userA = createClient(url!, anonKey!);
    userB = createClient(url!, anonKey!);
    // NOTE: test users/sign-in must be seeded before running — see
    // build-docs/TESTING.md for the seed script once credentials exist.
    const { data } = await userA
      .from("vehicles")
      .insert({ name: "Test Bike A" })
      .select("id")
      .single();
    vehicleAId = data!.id;
  });

  it("user B cannot read user A's vehicle", async () => {
    const { data, error } = await userB.from("vehicles").select("*").eq("id", vehicleAId);
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS hides the row rather than erroring
  });

  it("user B cannot attach an expense to user A's vehicle via save_expense", async () => {
    const { error } = await userB.rpc("save_expense", {
      p_id: crypto.randomUUID(),
      p_vehicle_id: vehicleAId,
      p_category: "fuel",
      p_total_amount: 100,
      p_litres: 1,
      p_odometer_reading: null,
      p_expense_date: "2026-01-01",
      p_notes: null,
      p_items: null,
    });
    expect(error).not.toBeNull();
  });

  it("save_expense is idempotent on retry with the same client-generated id", async () => {
    const id = crypto.randomUUID();
    const payload = {
      p_id: id,
      p_vehicle_id: vehicleAId,
      p_category: "fuel" as const,
      p_total_amount: 250,
      p_litres: 2,
      p_odometer_reading: null,
      p_expense_date: "2026-01-02",
      p_notes: "first attempt",
      p_items: null,
    };
    await userA.rpc("save_expense", payload);
    await userA.rpc("save_expense", { ...payload, p_notes: "retry after timeout" });

    const { data } = await userA.from("expenses").select("*").eq("id", id);
    expect(data).toHaveLength(1);
    expect(data![0].notes).toBe("retry after timeout");
  });

  it("maintenance total_amount must equal sum of items", async () => {
    const { error } = await userA.rpc("save_expense", {
      p_id: crypto.randomUUID(),
      p_vehicle_id: vehicleAId,
      p_category: "maintenance",
      p_total_amount: 500,
      p_litres: null,
      p_odometer_reading: null,
      p_expense_date: "2026-01-03",
      p_notes: null,
      p_items: [{ label: "Oil", amount: 200 }, { label: "Filter", amount: 150 }],
    });
    expect(error).not.toBeNull(); // 500 !== 350
  });
});
