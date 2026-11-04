import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useVehicles } from "@/vehicles/useVehicles";
import { QuickLogForm } from "@/expenses/QuickLogForm";
import { notifyRideStarted } from "@/settings/useNotificationPermission";
import {
  decideTapOutcome,
  getActiveSession,
  resolveTokenToTag,
  shouldDebounceTap,
  startSession,
  type TapOutcome,
} from "./activeSession";
import { stashPendingTap, takePendingTap, useAppLinkListener } from "./useAppLinkListener";

/**
 * The glue that turns a tap URL into UI (build-docs/features/tap-session.md).
 * Mounted once at the app shell level. Owns the quick-log sheet and switch
 * confirmation. Listens for appUrlOpen AND for a stashed token left over
 * from a logged-out tap (replayed after sign-in).
 */
export function TapHandler() {
  const { session } = useAuth();
  const { vehicles } = useVehicles();
  const [outcome, setOutcome] = useState<TapOutcome | null>(null);
  const [switchVehicleName, setSwitchVehicleName] = useState<string>("");

  const handleToken = useCallback(
    async (token: string) => {
      if (shouldDebounceTap(token)) return;
      if (!session) {
        stashPendingTap(token);
        return;
      }
      const tagRow = await resolveTokenToTag(token);
      const active = await getActiveSession();
      const decision = decideTapOutcome(tagRow, active?.vehicle_id ?? null);
      if (decision.kind === "no-active") {
        await startSession(decision.vehicleId);
        const v = vehicles.find((x) => x.id === decision.vehicleId);
        if (v) void notifyRideStarted(v.name);
      }
      if (decision.kind === "switch-request") {
        const v = vehicles.find((x) => x.id === decision.toVehicleId);
        setSwitchVehicleName(v?.name ?? "that vehicle");
      }
      setOutcome(decision);
    },
    [session, vehicles]
  );

  useAppLinkListener(handleToken);

  // Listen for in-app / QR scan tapToken events dispatched from router or scanner
  useEffect(() => {
    const onCustom = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) void handleToken(custom.detail);
    };
    window.addEventListener("motopulse:tapToken", onCustom);
    return () => window.removeEventListener("motopulse:tapToken", onCustom);
  }, [handleToken]);

  // Initial load on /v/:token in browser
  useEffect(() => {
    const match = window.location.pathname.match(/^\/v\/([A-Za-z0-9_-]+)/);
    if (match) {
      void handleToken(match[1]);
    }
  }, [handleToken]);

  // Replay any logged-out tap once the user signs in (gap analysis "should
  // fix": tap-while-logged-out resumes after login).
  useEffect(() => {
    if (!session) return;
    const pending = takePendingTap();
    if (pending) void handleToken(pending);
  }, [session, handleToken]);

  if (!outcome) return null;

  const close = () => setOutcome(null);

  switch (outcome.kind) {
    case "unknown-token":
      return <Toast onClose={close}>That tag isn't registered. Try adding it in NFC Tools.</Toast>;
    case "replaced":
      return <Toast onClose={close}>That tag was replaced. Use the new one for this vehicle.</Toast>;
    case "erased":
      return <Toast onClose={close}>That tag was erased and no longer logs taps.</Toast>;
    case "no-active":
    case "same-vehicle": {
      const v = vehicles.find((x) => x.id === outcome.vehicleId);
      if (!v) return <Toast onClose={close}>Vehicle not found.</Toast>;
      return (
        <SheetModal onClose={close}>
          <QuickLogForm vehicleId={v.id} vehicleName={v.name} onDone={close} />
        </SheetModal>
      );
    }
    case "switch-request":
      return (
        <SheetModal onClose={close}>
          <p>Switch to {switchVehicleName}?</p>
          <button
            type="button"
            onClick={async () => {
              await startSession(outcome.toVehicleId);
              const v = vehicles.find((x) => x.id === outcome.toVehicleId);
              setOutcome({ kind: "same-vehicle", vehicleId: outcome.toVehicleId });
              if (v) void notifyRideStarted(v.name);
            }}
          >
            Yes, switch
          </button>
          <button type="button" onClick={close}>
            Cancel
          </button>
        </SheetModal>
      );
  }
}

function Toast({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div role="status" className="toast">
      {children}
    </div>
  );
}

function SheetModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="sheet-modal" role="dialog" aria-modal="true">
      <button type="button" className="sheet-modal-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      {children}
    </div>
  );
}
