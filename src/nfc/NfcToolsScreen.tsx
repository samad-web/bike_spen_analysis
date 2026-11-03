import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useVehicles } from "@/vehicles/useVehicles";
import { TagInfoScreen } from "./TagInfoScreen";
import { WriteTagScreen } from "./WriteTagScreen";
import { EraseFormatScreen } from "./EraseFormatScreen";
import { ReplaceTagScreen } from "./ReplaceTagScreen";
import { TagHistoryScreen } from "./TagHistoryScreen";
import { AdvancedScreen } from "./AdvancedScreen";
import { QrCodeCard } from "./QrCodeCard";
import { QrScannerSheet } from "./QrScannerSheet";
import { getNfcHardwareStatus, type NfcHardwareStatus } from "./nfcPlugin";
import { Button, Card, Icon } from "@/app/ui";

type Mode = "nfc" | "qr";
type Tab = "scan" | "write" | "erase" | "replace" | "history" | "advanced";

/**
 * Unified NFC/QR tools surface. The top segmented control picks the mode
 * (NFC chip vs. printed QR); each tab adapts to it:
 *   - Scan     — Tag info (NFC) OR open camera scanner (QR)
 *   - Write    — write an NDEF URL to the chip, OR generate+print a QR
 *   - Erase    — NFC-only (QR has nothing to erase; you'd just print a new one)
 *   - Replace  — NFC-only
 *   - History  — same event log for both modes
 *   - Advanced — NFC-only (permanent lock)
 */
export function NfcToolsScreen() {
  const [params, setParams] = useSearchParams();
  const { vehicles } = useVehicles();
  const [mode, setMode] = useState<Mode>("nfc");
  const [tab, setTab] = useState<Tab>("scan");
  const [status, setStatus] = useState<NfcHardwareStatus>("unknown");
  const [scannerOpen, setScannerOpen] = useState(false);

  const vehicleId = params.get("vehicle") ?? vehicles[0]?.id ?? null;
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  useEffect(() => {
    void getNfcHardwareStatus().then((s) => {
      setStatus(s);
      // Auto-pick QR mode if there's no NFC hardware so the user is never
      // stuck on an unusable tab.
      if (s === "no_hardware") setMode("qr");
    });
  }, []);

  const needsVehicle: Tab[] = ["write", "replace", "history"];

  // Which tabs are available in each mode. QR gets scan/write/history only.
  const tabsForMode: Record<Mode, Tab[]> = {
    nfc: ["scan", "write", "erase", "replace", "history", "advanced"],
    qr:  ["scan", "write", "history"],
  };
  const availableTabs = tabsForMode[mode];
  const activeTab = availableTabs.includes(tab) ? tab : "scan";

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <h1>Tag & QR</h1>
          <p className="u-ink-muted u-text-sm">
            One token per vehicle — works on an NFC sticker and a printed QR.
          </p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" size="sm" onClick={() => setScannerOpen(true)}>
            <Icon name="search" size="sm"/> Scan QR
          </Button>
        </div>
      </header>

      {/* Mode toggle — the single segmented control that reshapes the surface. */}
      <Card>
        <div className="u-row u-row-between">
          <h3 style={{ marginBottom: 4 }}>Mode</h3>
          <div className="u-row u-gap-2">
            <button type="button"
              onClick={() => setMode("nfc")}
              className={"pill-btn " + (mode === "nfc" ? "is-active" : "")}
              disabled={status === "no_hardware"}>
              <Icon name="nfc" size="sm"/> NFC chip
            </button>
            <button type="button"
              onClick={() => setMode("qr")}
              className={"pill-btn " + (mode === "qr" ? "is-active" : "")}>
              <Icon name="search" size="sm"/> QR code
            </button>
          </div>
        </div>
        <p className="u-text-sm u-ink-muted">
          {mode === "nfc"
            ? "Scan, write, or lock an NTAG21x sticker you mount on your bike. Taps open the quick log."
            : "Generate a printable QR for your fuel cap. Any phone camera opens the quick log — no tag required."}
        </p>
      </Card>

      {status === "no_hardware" && mode === "nfc" && (
        <Card>
          <p role="alert" className="u-text-sm">
            This device has no NFC hardware — switched to QR mode automatically. QR works on every phone.
          </p>
        </Card>
      )}
      {status === "disabled" && mode === "nfc" && (
        <Card>
          <p role="alert" className="u-text-sm">NFC is turned off. Enable it in Android Settings and come back.</p>
        </Card>
      )}

      {vehicles.length > 1 && (
        <Card>
          <label htmlFor="vsel">Vehicle</label>
          <select id="vsel" value={vehicleId ?? ""}
            onChange={(e) => setParams({ vehicle: e.target.value })}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Card>
      )}

      <nav className="u-row u-gap-2 u-row-wrap" role="tablist" aria-label={`${mode === "nfc" ? "NFC" : "QR"} tools`}>
        {availableTabs.map((t) => (
          <button key={t}
            role="tab"
            aria-selected={activeTab === t}
            onClick={() => setTab(t)}
            disabled={needsVehicle.includes(t) && !vehicle}
            className={"pill-btn " + (activeTab === t ? "is-active" : "")}>
            {labelFor(t, mode)}
          </button>
        ))}
      </nav>

      <section>
        {/* Scan: NFC = Tag info diagnostic; QR = camera scanner CTA */}
        {activeTab === "scan" && mode === "nfc" && <TagInfoScreen/>}
        {activeTab === "scan" && mode === "qr" && (
          <Card>
            <div className="u-col u-gap-3" style={{ textAlign: "center", padding: "var(--s-5) 0" }}>
              <h4>Point your camera at a MotoPulse QR</h4>
              <p className="u-ink-muted u-text-sm">
                The in-app scanner is helpful for verifying a sticker before you print it. For normal use, your phone's camera does the same thing.
              </p>
              <Button variant="primary" onClick={() => setScannerOpen(true)}>
                <Icon name="search" size="sm"/> Open scanner
              </Button>
            </div>
          </Card>
        )}

        {/* Write: NFC = write to chip; QR = generate+print */}
        {activeTab === "write" && vehicle && mode === "nfc" && (
          <WriteTagScreen vehicleId={vehicle.id} vehicleName={vehicle.name}/>
        )}
        {activeTab === "write" && vehicle && mode === "qr" && (
          <QrCodeCard vehicleId={vehicle.id} vehicleName={vehicle.name} activeToken={vehicle.active_tag_token}/>
        )}

        {/* NFC-only tabs */}
        {activeTab === "erase"    && mode === "nfc" && <EraseFormatScreen/>}
        {activeTab === "replace"  && vehicle && mode === "nfc" && <ReplaceTagScreen vehicleId={vehicle.id} vehicleName={vehicle.name}/>}
        {activeTab === "advanced" && mode === "nfc" && <AdvancedScreen/>}

        {/* History: shared */}
        {activeTab === "history"  && vehicle && <TagHistoryScreen vehicleId={vehicle.id} vehicleName={vehicle.name}/>}
      </section>

      {scannerOpen && <QrScannerSheet onClose={() => setScannerOpen(false)}
        onToken={(token) => { window.location.href = `/v/${token}`; }}/>}
    </div>
  );
}

function labelFor(t: Tab, mode: Mode): string {
  switch (t) {
    case "scan":     return mode === "nfc" ? "Tag info" : "Scan";
    case "write":    return mode === "nfc" ? "Write tag" : "Generate QR";
    case "erase":    return "Erase";
    case "replace":  return "Replace";
    case "history":  return "History";
    case "advanced": return "Advanced";
  }
}
