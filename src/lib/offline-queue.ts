import { Capacitor } from "@capacitor/core";
import { errorMessage } from "./errors";
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
 * True iff we're running on a Capacitor native shell (Android build), as
 * opposed to a browser. SQLite via @capacitor-community/sqlite requires
 * either a native shell OR a <jeep-sqlite> web component mounted in the
 * DOM. We don't mount jeep-sqlite on the web — the offline queue is an
 * Android-first feature per the gap analysis — so on web we skip SQLite
 * entirely and push straight to Supabase.
 */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Lazy SQLite import — only loaded on native. Browser bundle doesn't pay
 * the cost or hit the jeep-sqlite-missing crash. */
async function withDb<T>(fn: (db: Awaited<ReturnType<typeof import("./sqlite").getDb>>) => Promise<T>): Promise<T | null> {
  if (!isNative()) return null;
  const { getDb } = await import("./sqlite");
  const db = await getDb();
  return fn(db);
}

/**
 * Queues an expense save. On native (Android), it goes to a local SQLite
 * outbox first, then flushes to Supabase — survives offline. On web, it
 * attempts the direct Supabase call immediately; if the call fails, the
 * error propagates to the caller and the save is lost (web is online-only
 * by product decision).
 */
export async function queueSaveExpense(payload: SaveExpensePayload): Promise<void> {
  if (isNative()) {
    await withDb(async (db) => {
      await db.run(
        `insert or replace into outbox (id, kind, payload, created_at, attempts) values (?, 'save_expense', ?, ?, 0)`,
        [payload.p_id, JSON.stringify(payload), new Date().toISOString()]
      );
    });
    await flushQueue();
  } else {
    const { error } = await supabase.rpc("save_expense", payload);
    if (error) throw error;
  }
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (!isNative()) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  await withDb(async (db) => {
    const result = await db.query(`select id, kind, payload, attempts from outbox order by created_at asc`);
    const rows = result.values ?? [];

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
  });

  return { synced, failed };
}

export async function pendingCount(): Promise<number> {
  if (!isNative()) return 0;
  const result = await withDb(async (db) => db.query(`select count(*) as n from outbox`));
  return Number(result?.values?.[0]?.n ?? 0);
}
