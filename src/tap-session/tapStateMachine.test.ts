import { describe, it, expect } from "vitest";
// Imports from tapStateMachine (not activeSession) because the latter pulls
// in the Supabase client at module load, which refuses to initialize without
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY — those aren't present in unit tests.
import { decideTapOutcome, shouldDebounceTap } from "./tapStateMachine";

describe("decideTapOutcome", () => {
  it("returns unknown-token when the tag isn't registered", () => {
    expect(decideTapOutcome(null, null)).toEqual({ kind: "unknown-token" });
  });

  it("returns replaced/erased for retired tokens, even if they match an old vehicle", () => {
    expect(decideTapOutcome({ vehicle_id: "v1", status: "replaced" }, null).kind).toBe("replaced");
    expect(decideTapOutcome({ vehicle_id: "v1", status: "erased" }, null).kind).toBe("erased");
  });

  it("starts a session when there is no active vehicle", () => {
    expect(decideTapOutcome({ vehicle_id: "v1", status: "active" }, null)).toEqual({
      kind: "no-active",
      vehicleId: "v1",
    });
  });

  it("opens quick log when the tapped tag matches the active vehicle", () => {
    expect(decideTapOutcome({ vehicle_id: "v1", status: "active" }, "v1")).toEqual({
      kind: "same-vehicle",
      vehicleId: "v1",
    });
  });

  it("prompts switch when the tapped tag belongs to a different vehicle", () => {
    expect(decideTapOutcome({ vehicle_id: "v2", status: "active" }, "v1")).toEqual({
      kind: "switch-request",
      fromVehicleId: "v1",
      toVehicleId: "v2",
    });
  });
});

describe("shouldDebounceTap", () => {
  it("debounces the same token within 2s and lets it through again after", async () => {
    const token = `t-${Math.random()}`;
    expect(shouldDebounceTap(token)).toBe(false);
    expect(shouldDebounceTap(token)).toBe(true); // immediate second read is suppressed
    // Different token is never suppressed.
    expect(shouldDebounceTap(`${token}-other`)).toBe(false);
  });
});
