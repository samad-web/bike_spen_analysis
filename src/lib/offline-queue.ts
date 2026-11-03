import { getDb } from "./sqlite";
import { errorMessage } from "@/lib/errors";
import { supabase } from "./supabase";

export type PaymentMethod = "cash" | "card" | "upi" | "wallet" | "net_banking" | "other";

/** Fuel-quantity unit — the field we historically called "litres" is now a
 * generic quantity. The unit tells the UI what it means:
 *   L   = litres (petrol, diesel)
 *   kWh = kilowatt-hours (electric)
 *   kg  = kilograms (CNG, LPG)
 * See supabase/migrations/0005_ev_support_and_qr.sql. */
export type FuelUnit = "L" | "kWh" | "kg";

export interface SaveExpensePayload {
  p_id: string;
  p_vehicle_id: string;
  p_category: "fuel" | "maintenance";
  p_total_amount: number;
  p_litres: number | null;   // reused: holds the quantity in whatever `p_fuel_unit` is
  p_odometer_reading: number | null;
  p_expense_date: string;
  p_notes: string | null;
  p_items: { label: string; amount: number }[] | null;
  p_payment_method: PaymentMethod;
  p_fuel_unit?: FuelUnit;    // optional; defaults to 'L' server-side for petrol/diesel
}

/**
 * Queues an expense save locally first (SQLite), then attempts an immediate
 * flush. If offline, it stays queued and a later flush() call (e.g. on
 * reconnect) picks it up. The id is client-generated so a retry after a
 * timeout never creates a duplicate row (gap analysis #7).
 */
export async function queueSaveExpense(payload: SaveExpensePayload): Promise<void> {
  const db = await getDb();
  await db.run(
    `insert or replace into outbox (id, kind, payload, created_at, attempts) values (?, 'save_expense', ?, ?, 0)`,
    [payload.p_id, JSON.stringify(payload), new Date().toISOString()]
  );
  await flushQueue();
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const db = await getDb();
  const result = await db.query(`select id, kind, payload, attempts from outbox order by created_at asc`);
  const rows = result.values ?? [];

  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload);
      if (row.kind === "save_expense") {
        const { error } = await supabase.rpc("save_expense", payload);
        if (error) throw error;
      }
      await db.run(`delete from outbox where id = ?`, [row.id]);
      synced++;
    } catch (err) {
      failed++;
      await db.run(`update outbox set attempts = attempts + 1, last_error = ? where id = ?`, [
        errorMessage(err),
        row.id,
      ]);
    }
  }

  return { synced, failed };
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const result = await db.query(`select count(*) as n from outbox`);
  return Number(result.values?.[0]?.n ?? 0);
}
