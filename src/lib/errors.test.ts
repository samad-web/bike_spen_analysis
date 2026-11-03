import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns strings unchanged", () => {
    expect(errorMessage("boom")).toBe("boom");
  });
  it("reads Error.message", () => {
    expect(errorMessage(new Error("fail"))).toBe("fail");
  });
  it("reads Supabase-style { message, details, hint, code } without printing [object Object]", () => {
    const err = { message: "duplicate key", details: "token exists", hint: "regenerate", code: "23505" };
    const out = errorMessage(err);
    expect(out).toContain("duplicate key");
    expect(out).toContain("token exists");
    expect(out).toContain("regenerate");
    expect(out).not.toContain("[object Object]");
  });
  it("drills into nested { error: ... } wrappers", () => {
    expect(errorMessage({ error: new Error("inner") })).toBe("inner");
    expect(errorMessage({ error: { message: "nested" } })).toBe("nested");
  });
  it("falls back to JSON for plain objects without message", () => {
    expect(errorMessage({ foo: 1 })).toBe(`{"foo":1}`);
  });
  it("returns a sentinel for null/undefined", () => {
    expect(errorMessage(null)).toBe("Unknown error");
    expect(errorMessage(undefined)).toBe("Unknown error");
  });
});
