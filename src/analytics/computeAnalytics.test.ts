import { describe, it, expect } from "vitest";
import {
  spendByMonth,
  fleetShare,
  fuelPriceTrend,
  litresAndFillUpStats,
  rideDaySpend,
  costPerKm,
  type ExpenseRow,
  type RideLogRow,
} from "./computeAnalytics";

const V1 = "veh-1";
const V2 = "veh-2";

const expenses: ExpenseRow[] = [
  { vehicle_id: V1, category: "fuel", total_amount: 200, litres: 2, odometer_reading: 1000, expense_date: "2026-01-05" },
  { vehicle_id: V1, category: "fuel", total_amount: 300, litres: 2.5, odometer_reading: 1150, expense_date: "2026-01-20" },
  { vehicle_id: V1, category: "maintenance", total_amount: 500, litres: null, odometer_reading: null, expense_date: "2026-01-20" },
  { vehicle_id: V2, category: "fuel", total_amount: 100, litres: 0, odometer_reading: null, expense_date: "2026-02-01" }, // litres=0: excluded from price trend
];

const rides: RideLogRow[] = [
  { vehicle_id: V1, ride_date: "2026-01-05" },
  { vehicle_id: V1, ride_date: "2026-01-20" },
  { vehicle_id: V2, ride_date: "2026-02-01" },
];

describe("spendByMonth", () => {
  it("buckets totals by month, vehicle, and category", () => {
    const result = spendByMonth(expenses);
    const jan = result.find((r) => r.month === "2026-01")!;
    expect(jan.total).toBe(1000);
    expect(jan.totalByVehicle[V1]).toBe(1000);
    expect(jan.totalByCategory.fuel).toBe(500);
    expect(jan.totalByCategory.maintenance).toBe(500);
  });
});

describe("fleetShare", () => {
  it("computes each vehicle's share of total spend", () => {
    const share = fleetShare(expenses);
    expect(share[V1]).toBeCloseTo(1000 / 1100, 5);
    expect(share[V2]).toBeCloseTo(100 / 1100, 5);
  });
});

describe("fuelPriceTrend", () => {
  it("computes amount/litres per month and omits months with no valid litres data", () => {
    const trend = fuelPriceTrend(expenses);
    const jan = trend.find((t) => t.month === "2026-01")!;
    expect(jan.avgPricePerLitre).toBeCloseTo(500 / 4.5, 5);
    // Feb's only fuel entry has litres=0, so the month has no litres data at
    // all — omitted entirely rather than plotted as a misleading null point.
    expect(trend.find((t) => t.month === "2026-02")).toBeUndefined();
  });
});

describe("litresAndFillUpStats", () => {
  it("sums litres and averages spend per fill-up", () => {
    const stats = litresAndFillUpStats(expenses);
    const jan = stats.find((s) => s.month === "2026-01")!;
    expect(jan.litres).toBe(4.5);
    expect(jan.averageSpendPerFillUp).toBe(250); // (200+300)/2
  });
});

describe("rideDaySpend", () => {
  it("divides monthly spend by distinct ride days", () => {
    const result = rideDaySpend(expenses, rides);
    const jan = result.find((r) => r.month === "2026-01")!;
    expect(jan.rideDays).toBe(2);
    expect(jan.spendPerRideDay).toBe(500); // 1000 / 2
  });

  it("returns null spendPerRideDay when there are no ride days", () => {
    const result = rideDaySpend(expenses, []);
    const jan = result.find((r) => r.month === "2026-01")!;
    expect(jan.spendPerRideDay).toBeNull();
  });
});

describe("costPerKm", () => {
  it("computes spend-over-distance between consecutive odometer readings", () => {
    const result = costPerKm(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].vehicleId).toBe(V1);
    // distance = 1150 - 1000 = 150; spend strictly after 01-05 up to and
    // including 01-20 = 300 (fuel) + 500 (maintenance) = 800
    expect(result[0].costPerKm).toBeCloseTo(800 / 150, 5);
  });

  it("skips vehicles with no odometer data at all", () => {
    const result = costPerKm([expenses[3]]); // V2 entry has odometer_reading: null
    expect(result).toHaveLength(0);
  });
});
