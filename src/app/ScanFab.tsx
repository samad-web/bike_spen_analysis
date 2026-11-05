import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "./ui";
import { QrScannerSheet } from "@/nfc/QrScannerSheet";

/**
 * Floating Scan button — the fastest path to "I'm at the pump, log this fuel."
 * Mounted on the Dashboard. Clicking opens the QR scanner sheet; a successful
 * scan navigates to the vehicle's App Link URL which fires the usual
 * tap-session flow and opens the quick-log sheet.
 *
 * Hidden on other routes (Settings, Analytics, Calendar, Garage) to prevent
 * covering page actions like Sign out, charts, and buttons.
 */
export function ScanFab() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Only show Scan FAB on Dashboard / Home
  if (location.pathname !== "/" && location.pathname !== "/dashboard") {
    return null;
  }

  return (
    <>
      <button type="button" className="scan-fab" onClick={() => setOpen(true)} aria-label="Scan a QR or NFC tag">
        <Icon name="search" size="lg"/>
        <span>Scan</span>
      </button>
      {open && <QrScannerSheet onClose={() => setOpen(false)}
        onToken={(token) => {
          window.dispatchEvent(new CustomEvent("motopulse:tapToken", { detail: token }));
        }}/>}
    </>
  );
}
