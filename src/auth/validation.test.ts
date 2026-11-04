import { describe, it, expect } from "vitest";
import { checkPassword, passwordsMatch, validateEmail } from "./validation";

describe("validateEmail", () => {
  it.each([
    "you@example.com", "a.b+c@example.co.in", "x@y.io",
  ])("accepts %s", (e) => expect(validateEmail(e)).toEqual([]));

  it.each([
    "", "no-at-sign", "x@", "@y.com", "x y@z.com", "a@b", "a@.b", "a@b.", "x".repeat(260) + "@y.com",
  ])("rejects %s", (e) => expect(validateEmail(e).length).toBeGreaterThan(0));

  it("trims whitespace before validating", () => {
    expect(validateEmail("  ok@example.com  ")).toEqual([]);
  });
});

describe("checkPassword", () => {
  it("rejects empty", () => {
    const r = checkPassword("");
    expect(r.ok).toBe(false);
    expect(r.label).toBe("empty");
  });

  it.each([
    ["Shr1A!", "too short (6)"],  // 6 chars, meets every rule EXCEPT length
    ["alllowercase1!", "no uppercase"],
    ["ALLUPPERCASE1!", "no lowercase"],
    ["NoDigitsHere!", "no number"],
    ["NoSymbolsHere1", "no symbol"],
    ["  Password1!  ", "leading/trailing spaces"],
  ])("rejects %s (%s)", (pw) => {
    const r = checkPassword(pw);
    expect(r.ok).toBe(false);
    expect(r.failures.length).toBeGreaterThan(0);
  });

  it("accepts a password meeting every rule", () => {
    const r = checkPassword("Correct1Horse!");
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
    expect(r.label).toMatch(/good|strong/);
  });

  it("labels ≥12 char passing passwords as 'strong'", () => {
    expect(checkPassword("Correct1Horse!").label).toBe("strong");
    expect(checkPassword("Short1!x").label).toBe("good"); // 8 chars, passes but not strong
  });

  it("flags passwords that contain the user's email handle", () => {
    const r = checkPassword("Abdul12345!", "abdul@example.com");
    expect(r.failures.some((f) => /email/i.test(f))).toBe(true);
  });

  it("doesn't flag email check for very short handles (noise reduction)", () => {
    const r = checkPassword("Abc12345!", "ab@example.com"); // handle 2 chars — skipped
    expect(r.failures.some((f) => /email/i.test(f))).toBe(false);
  });
});

describe("passwordsMatch", () => {
  it("true when equal and non-empty", () => {
    expect(passwordsMatch("abc", "abc")).toBe(true);
  });
  it("false when not equal", () => {
    expect(passwordsMatch("abc", "ABC")).toBe(false);
  });
  it("false when both empty (prevents 'ok ✓' on empty fields)", () => {
    expect(passwordsMatch("", "")).toBe(false);
  });
});
