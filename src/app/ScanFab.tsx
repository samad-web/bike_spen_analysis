import { useState } from "react";
import { Icon } from "./ui";
import { QrScannerSheet } from "@/nfc/QrScannerSheet";

/**
 * Floating Scan button — the fastest path to "I'm at the pump, log this fuel."
 * Mounted on the Dashboard. Clicking opens the QR scanner sheet; a successful
 * scan navigates to the vehicle's App Link URL which fires the usual
 * tap-session flow and opens the quick-log sheet.
 *
 * On Android (Capacitor native), this will also wire into the home-screen
 * widget via `pendingTap:` deep link once the native widget plugin lands —
 * see build-docs for the follow-up.
 */
export function ScanFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="scan-fab" onClick={() => setOpen(true)} aria-label="Scan a QR or NFC tag">
        <Icon name="search" size="lg"/>
        <span>Scan</span>
      </button>
      {open && <QrScannerSheet onClose={() => setOpen(false)}
        onToken={(token) => { window.location.href = `/v/${token}`; }}/>}
    </>
  );
}
