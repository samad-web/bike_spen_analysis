import { describe, it, expect } from "vitest";
import { computeReminderStatus, type MaintenanceReminder } from "./useMaintenanceReminders";

const base: MaintenanceReminder = {
  id: "r", vehicle_id: "v", label: "Oil change",
  schedule_type: "odometer", interval_km: 3000, interval_days: null,
  last_done_date: null, last_done_odometer: 10000, notes: null,
};

describe("computeReminderStatus", () => {
  it("marks a reminder OK when under 80% of its interval used", () => {
    expect(computeReminderStatus(base, 11000).status).toBe("ok");
  });
  it("marks a reminder DUE_SOON between 80% and 100%", () => {
    expect(computeReminderStatus(base, 12500).status).toBe("due_soon");
  });
  it("marks a reminder OVERDUE at or past 100%", () => {
    expect(computeReminderStatus(base, 13000).status).toBe("overdue");
    expect(computeReminderStatus(base, 13500).status).toBe("overdue");
  });
  it("returns unscheduled when no last-done data is set", () => {
    expect(computeReminderStatus({ ...base, last_done_odometer: null }, 20000).status).toBe("unscheduled");
  });

  it("picks the worst axis when both km AND date thresholds apply", () => {
    const r: MaintenanceReminder = {
      ...base,
      schedule_type: "both",
      interval_km: 10000, interval_days: 30,
      last_done_odometer: 10000,
      last_done_date: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), // nearly due by date
    };
    // Odometer axis says "ok" (only 10% used); date axis says "due_soon" (29/30).
    // Overall status must take the worst axis.
    const s = computeReminderStatus(r, 11000);
    expect(s.status).toBe("due_soon");
  });
});
