import { describe, it, expect } from "vitest";
import { computeMileageSeries, summarizeMileage, type FuelEntryForMileage } from "./fuelEconomy";

const V = "veh-1";

describe("computeMileageSeries", () => {
  it("computes km/L between two consecutive fills using tank-to-tank method", () => {
    const entries: FuelEntryForMileage[] = [
      { vehicle_id: V, expense_date: "2026-01-05", litres: 5,  odometer_reading: 1000 },
      { vehicle_id: V, expense_date: "2026-01-20", litres: 4,  odometer_reading: 1200 }, // (1200-1000)/4 = 50
    ];
    const result = computeMileageSeries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].km_per_litre).toBe(50);
    expect(result[0].distance_km).toBe(200);
  });

  it("drops pairs where odometer went backwards (reset or typo)", () => {
    const entries: FuelEntryForMileage[] = [
      { vehicle_id: V, expense_date: "2026-01-05", litres: 5,  odometer_reading: 1200 },
      { vehicle_id: V, expense_date: "2026-01-20", litres: 4,  odometer_reading: 1000 },
    ];
    expect(computeMileageSeries(entries)).toHaveLength(0);
  });

  it("drops pairs with missing odometer on either end", () => {
    const entries: FuelEntryForMileage[] = [
      { vehicle_id: V, expense_date: "2026-01-05", litres: 5,  odometer_reading: 1000 },
      { vehicle_id: V, expense_date: "2026-01-20", litres: 4,  odometer_reading: null },
      { vehicle_id: V, expense_date: "2026-01-30", litres: 5,  odometer_reading: 1250 },
    ];
    const result = computeMileageSeries(entries);
    // Only the (1000 -> 1250) pair survives — the middle entry breaks the chain.
    // But we require the SECOND entry of the pair to have a valid odometer,
    // which the 01-30 entry does — paired with 01-05 directly? No, pairing is
    // consecutive-only. The middle gap means neither (01-05, 01-20) nor
    // (01-20, 01-30) is usable; (01-05, 01-30) is skipped entirely.
    expect(result).toHaveLength(0);
  });

  it("rejects nonsense km/L (over 200 — probably a missed fill)", () => {
    const entries: FuelEntryForMileage[] = [
      { vehicle_id: V, expense_date: "2026-01-05", litres: 5,  odometer_reading: 1000 },
      { vehicle_id: V, expense_date: "2026-01-20", litres: 2,  odometer_reading: 2000 }, // 500 km/L — not real
    ];
    expect(computeMileageSeries(entries)).toHaveLength(0);
  });

  it("sorts entries by date before pairing", () => {
    const entries: FuelEntryForMileage[] = [
      { vehicle_id: V, expense_date: "2026-01-20", litres: 4,  odometer_reading: 1200 },
      { vehicle_id: V, expense_date: "2026-01-05", litres: 5,  odometer_reading: 1000 },
    ];
    const result = computeMileageSeries(entries);
    expect(result[0].km_per_litre).toBe(50); // (1200-1000)/4, correctly ordered
  });

  it("keeps each vehicle's series independent", () => {
    const entries: FuelEntryForMileage[] = [
      { vehicle_id: "a", expense_date: "2026-01-05", litres: 5, odometer_reading: 1000 },
      { vehicle_id: "b", expense_date: "2026-01-10", litres: 3, odometer_reading: 5000 },
      { vehicle_id: "a", expense_date: "2026-01-20", litres: 4, odometer_reading: 1200 },
      { vehicle_id: "b", expense_date: "2026-01-30", litres: 3, odometer_reading: 5120 }, // 40 km/L
    ];
    const result = computeMileageSeries(entries);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.vehicle_id === "a")!.km_per_litre).toBe(50);
    expect(result.find((p) => p.vehicle_id === "b")!.km_per_litre).toBeCloseTo(40, 5);
  });
});

describe("summarizeMileage", () => {
  it("weights the average by litres (not by trip)", () => {
    // Vehicle averaged 50 km/L on a 10L fill and 40 km/L on a 2L fill.
    // A simple arithmetic mean would be 45. The litres-weighted mean is
    // (10*50 + 2*40) / (10+2) = 580/12 ≈ 48.33 — correctly emphasizing the
    // larger fill (where more fuel actually gave 50 km/L).
    const points = computeMileageSeries([
      { vehicle_id: V, expense_date: "2026-01-01", litres: 1,  odometer_reading: 0 },
      { vehicle_id: V, expense_date: "2026-02-01", litres: 10, odometer_reading: 500 },  // 50 km/L
      { vehicle_id: V, expense_date: "2026-03-01", litres: 2,  odometer_reading: 580 },  // 40 km/L
    ]);
    const summary = summarizeMileage(points)[0];
    expect(summary.average_kmpl).toBeCloseTo(580 / 12, 5);
    expect(summary.best_kmpl).toBe(50);
    expect(summary.worst_kmpl).toBe(40);
    expect(summary.latest_kmpl).toBe(40);
    expect(summary.sample_count).toBe(2);
  });
});
