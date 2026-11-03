import { describe, it, expect } from "vitest";
import { buildUpiUrl } from "./useDonationConfig";

describe("buildUpiUrl", () => {
  it("builds a NPCI-spec UPI deep link with payee address, name, and currency", () => {
    const url = buildUpiUrl({ upi: "test@upi", name: "MotoPulse" });
    expect(url).toContain("upi://pay?");
    expect(url).toContain("pa=test%40upi");
    expect(url).toContain("pn=MotoPulse");
    expect(url).toContain("cu=INR");
  });

  it("includes a transaction note when provided", () => {
    const url = buildUpiUrl({ upi: "x@upi", name: "X", note: "Support" });
    expect(url).toContain("tn=Support");
  });

  it("omits the amount so the sender picks it", () => {
    const url = buildUpiUrl({ upi: "x@upi", name: "X" });
    expect(url).not.toContain("am=");
  });

  it("includes a fixed amount when passed, formatted to 2 decimals", () => {
    const url = buildUpiUrl({ upi: "x@upi", name: "X", amount: 50 });
    expect(url).toContain("am=50.00");
  });

  it("percent-encodes payee names with spaces or symbols", () => {
    const url = buildUpiUrl({ upi: "x@upi", name: "Moto Pulse ₹" });
    // URLSearchParams encodes ' ' as '+' which Android UPI handlers accept
    expect(url).toContain("pn=Moto+Pulse+");
  });
});
