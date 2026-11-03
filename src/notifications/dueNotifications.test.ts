import { describe, it, expect } from "vitest";
import { pickDueItems } from "./dueNotifications";
import type { MaintenanceReminder } from "@/maintenance/useMaintenanceReminders";
import type { VehicleDocument } from "@/documents/useVehicleDocuments";

const base: MaintenanceReminder = {
  id: "r1", vehicle_id: "v1", label: "Oil change",
  schedule_type: "odometer", interval_km: 3000, interval_days: null,
  last_done_date: null, last_done_odometer: 10000, notes: null,
};

const doc: VehicleDocument = {
  id: "d1", vehicle_id: "v1", doc_type: "insurance",
  label: null, storage_path: "u/v/x.pdf", mime_type: null, file_size_bytes: null,
  expires_on: null, issued_on: null, created_at: "",
};

const TODAY = new Date("2026-11-15T12:00:00Z");

describe("pickDueItems", () => {
  it("flags an overdue maintenance reminder", () => {
    const items = pickDueItems({
      reminders: [base],
      documents: [],
      currentOdometerByVehicle: { v1: 13500 }, // 3500 km since last 10000, interval 3000 → overdue
      today: TODAY,
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toMatch(/overdue/i);
    expect(items[0].cycleKey).toContain("rem-r1");
  });

  it("flags a due-soon reminder (>=80% but <100%)", () => {
    const items = pickDueItems({
      reminders: [base],
      documents: [],
      currentOdometerByVehicle: { v1: 12500 }, // 2500/3000 = 83%
      today: TODAY,
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toMatch(/due soon/i);
  });

  it("ignores reminders that are on track", () => {
    const items = pickDueItems({
      reminders: [base],
      documents: [],
      currentOdometerByVehicle: { v1: 11000 }, // 33% used
      today: TODAY,
    });
    expect(items).toHaveLength(0);
  });

  it("flags a document that already expired", () => {
    const items = pickDueItems({
      reminders: [],
      documents: [{ ...doc, expires_on: "2026-10-15" }], // 31d ago
      currentOdometerByVehicle: {},
      today: TODAY,
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toMatch(/expired/i);
  });

  it("flags a document expiring within 30 days", () => {
    const items = pickDueItems({
      reminders: [],
      documents: [{ ...doc, expires_on: "2026-12-01" }], // 16d out
      currentOdometerByVehicle: {},
      today: TODAY,
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toMatch(/expiring/i);
  });

  it("ignores documents expiring far in the future", () => {
    const items = pickDueItems({
      reminders: [],
      documents: [{ ...doc, expires_on: "2027-06-01" }], // 200+ days out
      currentOdometerByVehicle: {},
      today: TODAY,
    });
    expect(items).toHaveLength(0);
  });

  it("uses a stable cycleKey keyed by month for reminders, so two notifies the same month dedupe", () => {
    const items = pickDueItems({
      reminders: [base],
      documents: [],
      currentOdometerByVehicle: { v1: 13500 },
      today: TODAY,
    });
    const items2 = pickDueItems({
      reminders: [base],
      documents: [],
      currentOdometerByVehicle: { v1: 14000 }, // further overdue, same month
      today: TODAY,
    });
    expect(items[0].cycleKey).toBe(items2[0].cycleKey);
  });

  it("uses the expiry date in the cycleKey for documents, so renewal creates a new cycle", () => {
    const items = pickDueItems({
      reminders: [],
      documents: [{ ...doc, expires_on: "2026-12-01" }],
      currentOdometerByVehicle: {},
      today: TODAY,
    });
    const items2 = pickDueItems({
      reminders: [],
      documents: [{ ...doc, expires_on: "2027-12-01" }], // renewed - new expiry
      currentOdometerByVehicle: {},
      today: TODAY,
    });
    expect(items[0].cycleKey).not.toBe(items2[0]?.cycleKey ?? "x");
  });
});
