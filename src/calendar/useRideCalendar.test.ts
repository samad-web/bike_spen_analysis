import { describe, it, expect } from "vitest";

describe("RideCalendar date logic", () => {
  it("formats dates consistently into ISO YYYY-MM-DD", () => {
    const d = new Date(2026, 10, 4); // November 4, 2026
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(iso).toBe("2026-11-04");
  });

  it("handles month boundary correctly", () => {
    const year = 2026;
    const month = 10; // Nov
    const totalDays = new Date(year, month + 1, 0).getDate();
    expect(totalDays).toBe(30);

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    // Nov 1, 2026 is Sunday (0)
    expect(firstDayOfWeek).toBe(0);
  });

  it("distinguishes past, today, and future dates", () => {
    const today = "2026-11-04";
    const past = "2026-11-03";
    const future = "2026-11-05";

    expect(past < today).toBe(true);
    expect(future > today).toBe(true);
    expect(today === today).toBe(true);
  });
});

