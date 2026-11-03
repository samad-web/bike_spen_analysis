import { describe, it, expect } from "vitest";
import { formatIndianReg, isValidIndianReg, normalizeIndianReg } from "./indianRegistration";

describe("normalizeIndianReg", () => {
  it("strips spaces and hyphens, uppercases", () => {
    expect(normalizeIndianReg("ka-01-ab 1234")).toBe("KA01AB1234");
    expect(normalizeIndianReg("KA 01 AB 1234")).toBe("KA01AB1234");
    expect(normalizeIndianReg("ka01ab1234")).toBe("KA01AB1234");
  });
});

describe("isValidIndianReg — standard format", () => {
  it.each([
    "KA01AB1234", "MH12DE3456", "DL8CAF5055", "UP16AB1234", "TN22BL1234",
    "KA 01 AB 1234", "ka-01-ab-1234",
  ])("accepts %s", (reg) => expect(isValidIndianReg(reg)).toBe(true));

  it.each([
    "",            // empty
    "KAABCD1234",  // no digits in district slot
    "K01AB1234",   // state code must be 2 letters
    "KA01A12345",  // vehicle number > 4 digits
    "123456",      // all digits
    "KA01ABCD",    // trailing letters only
    "KA01AB",      // missing vehicle number
  ])("rejects %s", (reg) => expect(isValidIndianReg(reg)).toBe(false));

  // Edge case: 1-digit district IS valid under the standard (CMVR rule 51(c)
  // allows series to open with "01" written as "1" historically for older
  // plates; recent re-plating normalizes to 2 digits). We accept both.
  it("accepts 1-digit district code", () => {
    expect(isValidIndianReg("KA1AB1234")).toBe(true);
  });
});

describe("isValidIndianReg — Bharat (BH) series", () => {
  it("accepts the BH format", () => {
    expect(isValidIndianReg("22BH1234AB")).toBe(true);
    expect(isValidIndianReg("22-BH-1234-A")).toBe(true);
    expect(isValidIndianReg("22BH1234A")).toBe(true);
  });
  it("rejects malformed BH", () => {
    expect(isValidIndianReg("2BH1234AB")).toBe(false);  // year must be 2 digits
    expect(isValidIndianReg("22BH12A")).toBe(false);    // seq must be 4 digits
  });
});

describe("formatIndianReg", () => {
  it("inserts hyphens in standard positions", () => {
    expect(formatIndianReg("KA01AB1234")).toBe("KA-01-AB-1234");
    expect(formatIndianReg("ka 01 ab 1234")).toBe("KA-01-AB-1234");
  });
  it("formats BH series", () => {
    expect(formatIndianReg("22BH1234AB")).toBe("22-BH-1234-AB");
  });
  it("returns normalized form when input doesn't match any known format", () => {
    expect(formatIndianReg("gibberish")).toBe("GIBBERISH");
  });
});
