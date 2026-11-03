import { describe, it, expect } from "vitest";
import { extractToken } from "./useAppLinkListener";

describe("extractToken", () => {
  it("extracts a well-formed token from the App Link URL", () => {
    expect(extractToken("https://motopulse.app/v/abc12345XYZ_test-tok")).toBe("abc12345XYZ_test-tok");
  });

  it("rejects non-motopulse URLs", () => {
    expect(extractToken("https://evil.example/v/abc123")).toBeNull();
  });

  it("rejects path-traversal / malformed suffixes", () => {
    expect(extractToken("https://motopulse.app/v/../other")).toBeNull();
    expect(extractToken("https://motopulse.app/v/!")).toBeNull();
    expect(extractToken("https://motopulse.app/v/short")).toBeNull();
  });

  it("strips query strings and fragments", () => {
    expect(extractToken("https://motopulse.app/v/validTokenHere?ref=x#y")).toBe("validTokenHere");
  });

  it("returns null for null/undefined input", () => {
    expect(extractToken(null)).toBeNull();
    expect(extractToken(undefined)).toBeNull();
  });
});
