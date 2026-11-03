import { describe, it, expect } from "vitest";
import { extractToken } from "./useAppLinkListener";
import { PUBLIC_URL } from "@/lib/publicUrl";

// Tests build the test URLs from the same PUBLIC_URL constant the production
// code reads, so VITE_PUBLIC_URL being set (CF deploy) or unset (local test)
// doesn't break the assertions. In the test environment, PUBLIC_URL falls
// back to window.location.origin — jsdom gives us "http://localhost:3000"
// but that's fine because both the code and the tests resolve to the same
// string.
const TOKEN_URL = (token: string) => `${PUBLIC_URL}/v/${token}`;

describe("extractToken", () => {
  it("extracts a well-formed token from the App Link URL", () => {
    expect(extractToken(TOKEN_URL("abc12345XYZ_test-tok"))).toBe("abc12345XYZ_test-tok");
  });

  it("rejects non-motopulse URLs", () => {
    expect(extractToken("https://evil.example/v/abc123")).toBeNull();
  });

  it("rejects path-traversal / malformed suffixes", () => {
    expect(extractToken(`${PUBLIC_URL}/v/../other`)).toBeNull();
    expect(extractToken(`${PUBLIC_URL}/v/!`)).toBeNull();
    expect(extractToken(`${PUBLIC_URL}/v/short`)).toBeNull();
  });

  it("strips query strings and fragments", () => {
    expect(extractToken(`${PUBLIC_URL}/v/validTokenHere?ref=x#y`)).toBe("validTokenHere");
  });

  it("returns null for null/undefined input", () => {
    expect(extractToken(null)).toBeNull();
    expect(extractToken(undefined)).toBeNull();
  });
});
