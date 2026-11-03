import { describe, it, expect } from "vitest";
import { expensesToCsv, type ExportableExpense } from "./exportReports";

const sample: ExportableExpense[] = [
  { expense_date: "2026-01-05", vehicle_name: "Classic 350", category: "fuel",
    total_amount: 500, litres: 4.5, price_per_litre: 111.11, odometer_reading: 1000,
    payment_method: "upi", notes: null },
  { expense_date: "2026-01-20", vehicle_name: "Royal, Enfield", category: "maintenance",
    total_amount: 1200, litres: null, price_per_litre: null, odometer_reading: null,
    payment_method: "cash", notes: 'Oil change and "service"' },
];

describe("expensesToCsv", () => {
  it("emits a BOM header so Excel reads unicode correctly", () => {
    const csv = expensesToCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it("quotes fields with commas and escapes embedded double quotes", () => {
    const csv = expensesToCsv(sample);
    expect(csv).toContain('"Royal, Enfield"');
    expect(csv).toContain('"Oil change and ""service"""');
  });

  it("leaves plain values unquoted", () => {
    const csv = expensesToCsv(sample);
    expect(csv).toMatch(/,fuel,/);
    expect(csv).toMatch(/,upi,/);
  });

  it("formats amount to 2 decimals and preserves empty optional fields", () => {
    const csv = expensesToCsv(sample);
    expect(csv).toContain("500.00");
    // row 2 maintenance has no litres/price_per_litre/odometer — leading commas
    expect(csv).toMatch(/,1200\.00,,,,cash,/);
  });

  it("uses CRLF line endings per RFC-4180 so spreadsheet apps parse rows correctly", () => {
    const csv = expensesToCsv(sample);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3); // header + 2 rows
    expect(rows[0]).toContain("Date,Vehicle");
  });
});
