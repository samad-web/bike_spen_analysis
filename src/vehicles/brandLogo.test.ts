import { describe, it, expect } from "vitest";
import { brandMarkForMake, brandMarkToDataUrl, logoUrlForMake, normalizeMake } from "./brandLogo";

describe("normalizeMake", () => {
  it("trims and lowercases", () => {
    expect(normalizeMake("  Royal Enfield ")).toBe("royal enfield");
    expect(normalizeMake("HONDA")).toBe("honda");
  });
  it("collapses internal whitespace", () => {
    expect(normalizeMake("Royal   Enfield")).toBe("royal enfield");
  });
  it("handles null and undefined", () => {
    expect(normalizeMake(null)).toBe("");
    expect(normalizeMake(undefined)).toBe("");
  });
});

describe("brandMarkForMake", () => {
  it("returns a mark for a known brand", () => {
    const m = brandMarkForMake("Royal Enfield")!;
    expect(m).not.toBeNull();
    expect(m.initials).toBe("RE");
    expect(m.fullName).toBe("Royal Enfield");
    expect(m.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
  it("is case- and space-insensitive", () => {
    expect(brandMarkForMake("TRIUMPH")).toEqual(brandMarkForMake("Triumph"));
    expect(brandMarkForMake("mg motor")).toEqual(brandMarkForMake("MG"));
  });
  it("returns null for unknown brands", () => {
    expect(brandMarkForMake("Not A Real Brand")).toBeNull();
    expect(brandMarkForMake("")).toBeNull();
    expect(brandMarkForMake(null)).toBeNull();
  });
});

describe("brandMarkToDataUrl", () => {
  it("produces an inline SVG data URL that includes the initials", () => {
    const mark = brandMarkForMake("Triumph")!;
    const url = brandMarkToDataUrl(mark);
    expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    const decoded = decodeURIComponent(url.slice("data:image/svg+xml;utf8,".length));
    expect(decoded).toContain(mark.initials);
    expect(decoded).toContain(mark.color);
  });
});

describe("logoUrlForMake (legacy)", () => {
  it("returns null now that logos are inline", () => {
    // The old Clearbit URL path is deprecated — brandMarkForMake replaces it.
    expect(logoUrlForMake("Royal Enfield")).toBeNull();
  });
});
