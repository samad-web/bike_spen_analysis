/**
 * Pure aggregation functions implementing build-docs/features/analytics.md.
 * Kept separate from data-fetching (useAnalytics.ts) so each definition can
 * be unit-tested against seed data without a live Supabase project.
 */

export interface ExpenseRow {
  vehicle_id: string;
  category: "fuel" | "maintenance";
  total_amount: number;
  litres: number | null;
  odometer_reading: number | null;
  expense_date: string; // YYYY-MM-DD
}

export interface RideLogRow {
  vehicle_id: string;
  ride_date: string;
}

const monthKey = (isoDate: string) => isoDate.slice(0, 7); // YYYY-MM

export interface MonthlySpend {
  month: string;
  totalByVehicle: Record<string, number>;
  totalByCategory: Record<"fuel" | "maintenance", number>;
  total: number;
}

/** Spend: total per month, per vehicle, per category. */
export function spendByMonth(expenses: ExpenseRow[]): MonthlySpend[] {
  const byMonth = new Map<string, MonthlySpend>();
  for (const e of expenses) {
    const month = monthKey(e.expense_date);
    if (!byMonth.has(month)) {
      byMonth.set(month, { month, totalByVehicle: {}, totalByCategory: { fuel: 0, maintenance: 0 }, total: 0 });
    }
    const bucket = byMonth.get(month)!;
    bucket.totalByVehicle[e.vehicle_id] = (bucket.totalByVehicle[e.vehicle_id] ?? 0) + e.total_amount;
    bucket.totalByCategory[e.category] += e.total_amount;
    bucket.total += e.total_amount;
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Each vehicle's share of the total fleet spend across the given expenses. */
export function fleetShare(expenses: ExpenseRow[]): Record<string, number> {
  const totals: Record<string, number> = {};
  let grandTotal = 0;
  for (const e of expenses) {
    totals[e.vehicle_id] = (totals[e.vehicle_id] ?? 0) + e.total_amount;
    grandTotal += e.total_amount;
  }
  const share: Record<string, number> = {};
  for (const [vehicleId, amount] of Object.entries(totals)) {
    share[vehicleId] = grandTotal > 0 ? amount / grandTotal : 0;
  }
  return share;
}

export interface FuelPriceTrendPoint {
  month: string;
  avgPricePerLitre: number;
}

/** Average ₹/litre per month = sum(amount) / sum(litres) for fuel entries
 * that have litres logged. Entries with litres = 0/null are excluded from
 * both sums; a month with no valid litres data at all is omitted from the
 * result rather than plotted as a misleading zero/null point. */
export function fuelPriceTrend(expenses: ExpenseRow[]): FuelPriceTrendPoint[] {
  const sums = new Map<string, { amount: number; litres: number }>();
  for (const e of expenses) {
    if (e.category !== "fuel" || !e.litres || e.litres <= 0) continue;
    const month = monthKey(e.expense_date);
    const cur = sums.get(month) ?? { amount: 0, litres: 0 };
    cur.amount += e.total_amount;
    cur.litres += e.litres;
    sums.set(month, cur);
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { amount, litres }]) => ({ month, avgPricePerLitre: amount / litres }));
}

/** Litres per month and average spend per fill-up. */
export function litresAndFillUpStats(expenses: ExpenseRow[]) {
  const fuelByMonth = new Map<string, { litres: number; amount: number; fillUps: number }>();
  for (const e of expenses) {
    if (e.category !== "fuel") continue;
    const month = monthKey(e.expense_date);
    const cur = fuelByMonth.get(month) ?? { litres: 0, amount: 0, fillUps: 0 };
    cur.litres += e.litres ?? 0;
    cur.amount += e.total_amount;
    cur.fillUps += 1;
    fuelByMonth.set(month, cur);
  }
  return [...fuelByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { litres, amount, fillUps }]) => ({
      month,
      litres,
      averageSpendPerFillUp: fillUps > 0 ? amount / fillUps : 0,
    }));
}

/** Ride days per month and spend per ride day (monthly spend / days ridden). */
export function rideDaySpend(expenses: ExpenseRow[], rides: RideLogRow[]) {
  const spendByM = new Map<string, number>();
  for (const e of expenses) {
    const month = monthKey(e.expense_date);
    spendByM.set(month, (spendByM.get(month) ?? 0) + e.total_amount);
  }
  const rideDaysByM = new Map<string, Set<string>>();
  for (const r of rides) {
    const month = monthKey(r.ride_date);
    if (!rideDaysByM.has(month)) rideDaysByM.set(month, new Set());
    rideDaysByM.get(month)!.add(r.ride_date);
  }
  const months = new Set([...spendByM.keys(), ...rideDaysByM.keys()]);
  return [...months]
    .sort()
    .map((month) => {
      const rideDays = rideDaysByM.get(month)?.size ?? 0;
      const spend = spendByM.get(month) ?? 0;
      return { month, rideDays, spendPerRideDay: rideDays > 0 ? spend / rideDays : null };
    });
}

/** Optional: cost per km between two consecutive odometer readings (only
 * when both are logged — gap analysis "optional" field). Returns one entry
 * per gap between consecutive readings on the same vehicle. */
export function costPerKm(expenses: ExpenseRow[]) {
  // Odometer readings define the period boundaries (dates), but ALL spend in
  // that date range counts toward the numerator — a maintenance line logged
  // the same day as a fill-up has no odometer reading of its own, but it
  // still happened within the period and must count (bug caught by
  // computeAnalytics.test.ts: an earlier version only summed rows that
  // themselves had an odometer reading, undercounting the spend).
  const odoByVehicle = new Map<string, ExpenseRow[]>();
  for (const e of expenses) {
    if (e.odometer_reading == null) continue;
    if (!odoByVehicle.has(e.vehicle_id)) odoByVehicle.set(e.vehicle_id, []);
    odoByVehicle.get(e.vehicle_id)!.push(e);
  }

  const results: { vehicleId: string; from: string; to: string; costPerKm: number }[] = [];
  for (const [vehicleId, odoRows] of odoByVehicle) {
    const sorted = [...odoRows].sort((a, b) => a.expense_date.localeCompare(b.expense_date));
    const allForVehicle = expenses.filter((e) => e.vehicle_id === vehicleId);
    for (let i = 1; i < sorted.length; i++) {
      const distance = sorted[i].odometer_reading! - sorted[i - 1].odometer_reading!;
      if (distance <= 0) continue; // odometer rollback/typo — skip rather than report a negative cost/km
      const spendInPeriod = allForVehicle
        .filter((e) => e.expense_date > sorted[i - 1].expense_date && e.expense_date <= sorted[i].expense_date)
        .reduce((sum, e) => sum + e.total_amount, 0);
      results.push({
        vehicleId,
        from: sorted[i - 1].expense_date,
        to: sorted[i].expense_date,
        costPerKm: spendInPeriod / distance,
      });
    }
  }
  return results;
}
