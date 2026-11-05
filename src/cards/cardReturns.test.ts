import { describe, expect, it } from "vitest";
import {
  calculateCardReturns,
  formatMaskedCardNumber,
  CARD_PRESETS,
  type PaymentCard,
} from "./cardReturns";

describe("cardReturns", () => {
  const bpclOctane: PaymentCard = {
    id: "card-1",
    card_name: "BPCL SBI Octane",
    last_four: "4589",
    bank_name: "SBI",
    network: "rupay",
    card_color: "amber",
    fuel_cashback_percent: 6.25,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "bpcl",
    other_cashback_percent: 1.0,
    is_default: true,
  };

  const amazonPay: PaymentCard = {
    id: "card-2",
    card_name: "Amazon Pay ICICI",
    last_four: "1122",
    bank_name: "ICICI",
    network: "visa",
    card_color: "gold",
    fuel_cashback_percent: 0.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "all",
    other_cashback_percent: 1.0,
    is_default: false,
  };

  const sbiCashback: PaymentCard = {
    id: "card-3",
    card_name: "Cashback SBI Card",
    last_four: "9988",
    bank_name: "SBI",
    network: "visa",
    card_color: "cyan",
    fuel_cashback_percent: 0.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 500,
    surcharge_max_amount: 3000,
    partner_fuel_brand: "all",
    other_cashback_percent: 5.0,
    is_default: false,
  };

  it("calculates surcharge waiver and 6.25% fuel cashback for BPCL Octane within limit", () => {
    const res = calculateCardReturns(bpclOctane, 1000, "fuel", "bpcl");
    expect(res.surchargeWaiver).toBe(10.0);
    expect(res.cashbackAmount).toBe(62.5);
    expect(res.totalSavings).toBe(72.5);
    expect(res.effectiveRatePercent).toBe(7.25);
    expect(res.breakdownText).toContain("10.00 surcharge waived");
    expect(res.breakdownText).toContain("62.50 fuel cashback");
  });

  it("omits surcharge waiver if fuel spend is below min threshold (₹400)", () => {
    const res = calculateCardReturns(bpclOctane, 350, "fuel", "bpcl");
    expect(res.surchargeWaiver).toBe(0);
    // Cashback still applies
    expect(res.cashbackAmount).toBe(21.88); // 350 * 0.0625 = 21.875 -> 21.88
    expect(res.totalSavings).toBe(21.88);
  });

  it("omits surcharge waiver if fuel spend exceeds max threshold (₹4000)", () => {
    const res = calculateCardReturns(bpclOctane, 4500, "fuel", "bpcl");
    expect(res.surchargeWaiver).toBe(0);
    expect(res.cashbackAmount).toBe(281.25);
    expect(res.totalSavings).toBe(281.25);
  });

  it("applies general maintenance cashback on service spending", () => {
    const res = calculateCardReturns(sbiCashback, 2000, "maintenance");
    expect(res.surchargeWaiver).toBe(0);
    expect(res.cashbackAmount).toBe(100.0); // 5% of 2000
    expect(res.totalSavings).toBe(100.0);
    expect(res.effectiveRatePercent).toBe(5.0);
  });

  it("handles card with surcharge waiver only and zero fuel cashback", () => {
    const res = calculateCardReturns(amazonPay, 1000, "fuel");
    expect(res.surchargeWaiver).toBe(10.0);
    expect(res.cashbackAmount).toBe(0);
    expect(res.totalSavings).toBe(10.0);
    expect(res.effectiveRatePercent).toBe(1.0);
  });

  it("returns zero if invalid amount or null card", () => {
    expect(calculateCardReturns(null, 1000, "fuel").totalSavings).toBe(0);
    expect(calculateCardReturns(bpclOctane, 0, "fuel").totalSavings).toBe(0);
    expect(calculateCardReturns(bpclOctane, -50, "fuel").totalSavings).toBe(0);
  });

  it("masks card number showing only last 4 digits", () => {
    expect(formatMaskedCardNumber("4589")).toBe("•••• •••• •••• 4589");
    expect(formatMaskedCardNumber("12")).toBe("•••• •••• •••• ••12");
  });

  it("has valid preset cards configured", () => {
    expect(CARD_PRESETS.length).toBeGreaterThanOrEqual(6);
    const octane = CARD_PRESETS.find((p) => p.id === "bpcl_sbi_octane");
    expect(octane).toBeDefined();
    expect(octane?.fuel_cashback_percent).toBe(6.25);
    expect(octane?.partner_fuel_brand).toBe("bpcl");
  });
});

