/**
 * Pure, side-effect-free pieces of the tap-session state machine (build-docs/
 * features/tap-session.md). Kept in their own file (no supabase import) so
 * they're unit-testable without Supabase credentials — the Supabase-aware
 * wrappers live in activeSession.ts.
 */

export type TapOutcome =
  | { kind: "unknown-token" }
  | { kind: "replaced"; token: string }
  | { kind: "erased"; token: string }
  | { kind: "same-vehicle"; vehicleId: string }
  | { kind: "no-active"; vehicleId: string }
  | { kind: "switch-request"; fromVehicleId: string; toVehicleId: string };

/** The state machine from the gap analysis (#1). Pure function of
 * (tagRow, activeVehicleId); the caller is responsible for the side effect
 * (startSession / open quick log / prompt switch). */
export function decideTapOutcome(
  tagRow: { vehicle_id: string; status: "active" | "replaced" | "erased" } | null,
  activeVehicleId: string | null
): TapOutcome {
  if (!tagRow) return { kind: "unknown-token" };
  if (tagRow.status === "replaced") return { kind: "replaced", token: "" };
  if (tagRow.status === "erased") return { kind: "erased", token: "" };
  if (!activeVehicleId) return { kind: "no-active", vehicleId: tagRow.vehicle_id };
  if (activeVehicleId === tagRow.vehicle_id) return { kind: "same-vehicle", vehicleId: tagRow.vehicle_id };
  return { kind: "switch-request", fromVehicleId: activeVehicleId, toVehicleId: tagRow.vehicle_id };
}

/** 2-second debounce for repeat Android NFC reads (gap analysis #1). Module-level
 * state is fine here: the whole app has one active tap stream at a time. */
const DEBOUNCE_MS = 2000;
let lastTapAt = 0;
let lastTapToken: string | null = null;
export function shouldDebounceTap(token: string): boolean {
  const now = Date.now();
  if (token === lastTapToken && now - lastTapAt < DEBOUNCE_MS) return true;
  lastTapToken = token;
  lastTapAt = now;
  return false;
}
