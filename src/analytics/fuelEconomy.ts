/**
 * Fuel-economy calculation from fuel entries that have BOTH an odometer
 * reading and a litres figure. Uses the standard tank-to-tank method:
 *
 *   km/L between fill N and fill N+1  =  (odo_{N+1} - odo_N) / litres_{N+1}
 *
 * This measures the economy of the LITRES PUT IN at fill N+1 — i.e. the fuel
 * that was used to cover the distance just driven. (The classic "full-to-full"
 * convention, assuming each entry represents a full tank. For partial fills
 * the figure is still approximately correct over several entries.)
 *
 * Entries missing an odometer are gaps — the series restarts after one.
 * Odometer going backwards is treated as a reset: the pair is dropped.
 *
 * All functions here are pure and under test in fuelEconomy.test.ts.
 */

export interface FuelEntryForMileage {
  vehicle_id: string;
  expense_date: string;       // YYYY-MM-DD, sorted ascending by caller
  litres: number | null;      // "quantity" — litres, kWh or kg depending on vehicle (see fuel_unit column)
  odometer_reading: number | null;
}

export interface MileagePoint {
  vehicle_id: string;
  period_end: string;
  distance_km: number;
  litres: number;
  km_per_litre: number;
}

export function computeMileageSeries(entries: FuelEntryForMileage[]): MileagePoint[] {
  // Group by vehicle, keep each vehicle's entries sorted.
  const byVehicle = new Map<string, FuelEntryForMileage[]>();
  for (const e of entries) {
    if (!byVehicle.has(e.vehicle_id)) byVehicle.set(e.vehicle_id, []);
    byVehicle.get(e.vehicle_id)!.push(e);
  }

  const points: MileagePoint[] = [];
  for (const [vid, rows] of byVehicle) {
    const sorted = [...rows].sort((a, b) => a.expense_date.localeCompare(b.expense_date));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (prev.odometer_reading == null || cur.odometer_reading == null) continue;
      if (cur.litres == null || cur.litres <= 0) continue;
      const distance = cur.odometer_reading - prev.odometer_reading;
      if (distance <= 0) continue; // odometer reset / typo
      const km_per_litre = distance / cur.litres;
      // Reject physically unlikely values — more than 300 km/unit probably
      // means a missed fill between the two readings (the "distance" is really
      // 2+ tanks of fuel, divided by one tank). 300 is high enough to also
      // allow EVs on efficient urban cycles (an electric moped could do
      // 100+ km/kWh in-city) without flagging legitimate values.
      if (km_per_litre > 300 || km_per_litre < 1) continue;
      points.push({
        vehicle_id: vid,
        period_end: cur.expense_date,
        distance_km: distance,
        litres: cur.litres,
        km_per_litre,
      });
    }
  }
  return points.sort((a, b) => a.period_end.localeCompare(b.period_end));
}

export interface MileageSummary {
  vehicle_id: string;
  average_kmpl: number;
  best_kmpl: number;
  worst_kmpl: number;
  latest_kmpl: number;
  sample_count: number;
}

export function summarizeMileage(points: MileagePoint[]): MileageSummary[] {
  const byV = new Map<string, MileagePoint[]>();
  for (const p of points) {
    if (!byV.has(p.vehicle_id)) byV.set(p.vehicle_id, []);
    byV.get(p.vehicle_id)!.push(p);
  }
  const out: MileageSummary[] = [];
  for (const [vid, rows] of byV) {
    const sorted = [...rows].sort((a, b) => a.period_end.localeCompare(b.period_end));
    const kmpls = sorted.map((r) => r.km_per_litre);
    const weightedKm = sorted.reduce((s, r) => s + r.distance_km, 0);
    const weightedL = sorted.reduce((s, r) => s + r.litres, 0);
    out.push({
      vehicle_id: vid,
      // Weight by litres so a 2L tank doesn't pull the average the same as a 10L one.
      average_kmpl: weightedL > 0 ? weightedKm / weightedL : 0,
      best_kmpl: Math.max(...kmpls),
      worst_kmpl: Math.min(...kmpls),
      latest_kmpl: sorted[sorted.length - 1].km_per_litre,
      sample_count: sorted.length,
    });
  }
  return out;
}
