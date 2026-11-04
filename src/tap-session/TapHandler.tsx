import { useCallback, useEffect, useState } from "react";
import { CapacitorNfc, type NfcEvent } from "@capgo/capacitor-nfc";
import { useAuth } from "@/auth/AuthContext";
import { useVehicles } from "@/vehicles/useVehicles";
import { QuickLogForm } from "@/expenses/QuickLogForm";
import { notifyRideStarted } from "@/settings/useNotificationPermission";
import { decodeUriRecord } from "@/nfc/nfcPlugin";
import { Button, Sheet } from "@/app/ui";
import {
  decideTapOutcome,
  getActiveSession,
  resolveTokenToTag,
  shouldDebounceTap,
  startSession,
  type TapOutcome,
} from "./activeSession";
import { extractToken, stashPendingTap, takePendingTap, useAppLinkListener } from "./useAppLinkListener";

declare global {
  interface Window {
    __motopulseNfcBusy?: boolean;
  }
}

/**
 * The glue that turns a tap URL into UI (build-docs/features/tap-session.md).
 * Mounted once at the app shell level.
 *
 * Implements MotoPulse Gap Analysis Item #1:
 * - First tap of the day on a bike: marks it active, records ride for today,
 *   syncs with calendar/widgets, and notifies rider. Does NOT open fuel log form.
 * - Subsequent tap on the SAME bike on the SAME day: opens QuickLogForm to enter fuel.
 * - Tap on a DIFFERENT bike: prompts "Switch to X?".
 * - 2-second debounce prevents repeat reads.
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
        // First tap today: record bike ride & active session, notify rider, do NOT open fuel sheet
        await startSession(decision.vehicleId, token);
        const v = vehicles.find((x) => x.id === decision.vehicleId);
        if (v) void notifyRideStarted(v.name);
      } else if (decision.kind === "switch-request") {
        const v = vehicles.find((x) => x.id === decision.toVehicleId);
        setSwitchVehicleName(v?.name ?? "that vehicle");
      }

      setOutcome(decision);
    },
    [session, vehicles]
  );

  // App Link listener (Android cold-start + background resume)
  useAppLinkListener(handleToken);

  // In-app passive foreground NFC scanning
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;

    CapacitorNfc.isSupported()
      .then(async ({ supported }) => {
        if (!supported || cancelled) return;
        handle = await CapacitorNfc.addListener("nfcEvent", (event: NfcEvent) => {
          if (window.__motopulseNfcBusy) return;
          if (!event.tag.ndefMessage || event.tag.ndefMessage.length === 0) return;
          const url = decodeUriRecord(event.tag.ndefMessage[0]);
          const token = extractToken(url);
          if (token) void handleToken(token);
        });
        await CapacitorNfc.startScanning().catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      void handle?.remove().catch(() => {});
    };
  }, [handleToken]);

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

  // Replay any logged-out tap once the user signs in
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

    case "no-active": {
      // First tap of the day on this bike: confirmation banner only!
      const v = vehicles.find((x) => x.id === outcome.vehicleId);
      return (
        <RideStartedBanner
          vehicleName={v?.name ?? "Bike"}
          onClose={close}
        />
      );
    }

    case "same-vehicle": {
      // Second tap on the same vehicle: open QuickLogForm for fuel entry!
      const v = vehicles.find((x) => x.id === outcome.vehicleId);
      if (!v) return <Toast onClose={close}>Vehicle not found.</Toast>;
      return (
        <Sheet onClose={close}>
          <QuickLogForm vehicleId={v.id} vehicleName={v.name} onDone={close} />
        </Sheet>
      );
    }

    case "switch-request": {
      const fromV = vehicles.find((x) => x.id === outcome.fromVehicleId);
      const toV = vehicles.find((x) => x.id === outcome.toVehicleId);
      return (
        <Sheet onClose={close} title="Switch vehicle?">
          <div className="u-col u-gap-4" style={{ padding: "8px 0" }}>
            <p className="u-text-sm u-ink-muted" style={{ margin: 0 }}>
              You're currently riding <strong>{fromV?.name ?? "another bike"}</strong> today.
              Switch today's ride to <strong>{toV?.name ?? switchVehicleName}</strong>?
            </p>
            <div className="u-row u-gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  await startSession(outcome.toVehicleId);
                  if (toV) void notifyRideStarted(toV.name);
                  setOutcome({ kind: "no-active", vehicleId: outcome.toVehicleId });
                }}
              >
                Switch to {toV?.name ?? "this vehicle"}
              </Button>
              <Button variant="ghost" onClick={close}>
                Keep {fromV?.name ?? "current"}
              </Button>
            </div>
          </div>
        </Sheet>
      );
    }
  }
}

/**
 * Toast notification for status messages.
 */
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

/**
 * Prominent banner shown when a bike is selected for today on the initial tap.
 */
function RideStartedBanner({ vehicleName, onClose }: { vehicleName: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: "calc(var(--nav-height, 64px) + 20px)",
        left: 16,
        right: 16,
        maxWidth: 440,
        margin: "0 auto",
        zIndex: 1000,
        background: "#1c1c21",
        border: "1.5px solid #38bdf8",
        borderRadius: "var(--r-lg)",
        padding: "16px 18px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div className="u-row u-row-between" style={{ alignItems: "center" }}>
        <div className="u-row u-gap-3" style={{ alignItems: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#38bdf8",
              color: "#000000",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f5f5f7" }}>
              Riding {vehicleName} today!
            </div>
            <div className="u-text-xs u-ink-muted" style={{ marginTop: 2 }}>
              Recorded for today. Tap again at the pump to enter fuel.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: 0,
            color: "var(--ink-muted)",
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}


