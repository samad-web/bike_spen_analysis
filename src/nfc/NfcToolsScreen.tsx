import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
 * Unified NFC / QR tools surface.
 *
 * Mode toggle is ALWAYS enabled — a previous iteration disabled the NFC
 * button when hardware wasn't detected, which trapped web users on QR mode
 * with no way back. Now both buttons work; a banner explains the hardware
 * situation.
 *
 * Hardware status check is wrapped in try/catch — on the web the Capacitor
 * NFC plugin throws on plugin-not-available, which previously left `status`
 * stuck on "unknown" and mis-rendered the banners.
 */
export function NfcToolsScreen() {
  const [params, setParams] = useSearchParams();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const [mode, setMode] = useState<Mode>("nfc");
  const [tab, setTab] = useState<Tab>("scan");
  const [status, setStatus] = useState<NfcHardwareStatus>("unknown");
  const [scannerOpen, setScannerOpen] = useState(false);

  const vehicleId = params.get("vehicle") ?? vehicles[0]?.id ?? null;
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  useEffect(() => {
    void (async () => {
      try {
        const s = await getNfcHardwareStatus();
        setStatus(s);
        if (s === "no_hardware") setMode("qr");
      } catch {
        // Web build: the Capacitor NFC plugin isn't registered. Pretend
        // hardware is absent and auto-pick QR — the user can still flip
        // the toggle to see what NFC tabs look like.
        setStatus("no_hardware");
        setMode("qr");
      }
    })();
  }, []);

  const needsVehicle: Tab[] = ["write", "replace", "history"];
  const tabsForMode: Record<Mode, Tab[]> = {
    nfc: ["scan", "write", "erase", "replace", "history", "advanced"],
    qr:  ["scan", "write", "history"],
  };
  const availableTabs = tabsForMode[mode];
  const activeTab: Tab = availableTabs.includes(tab) ? tab : "scan";

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

      {/* Mode toggle — ALWAYS enabled. */}
      <Card>
        <div className="u-row u-row-between u-row-wrap u-gap-3">
          <h3>Mode</h3>
          <div className="u-row u-gap-2">
            <button type="button"
              onClick={() => setMode("nfc")}
              className={"pill-btn " + (mode === "nfc" ? "is-active" : "")}>
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
            <strong>NFC isn't available here.</strong> On the web build the Capacitor NFC plugin isn't registered.
            Install the MotoPulse Android APK to use NFC chip features — or stick with QR (works on every phone).
          </p>
        </Card>
      )}
      {status === "disabled" && mode === "nfc" && (
        <Card>
          <p role="alert" className="u-text-sm">
            NFC is turned off on this device. Enable it in Android Settings and come back.
          </p>
        </Card>
      )}

      {/* Vehicle picker */}
      {vehiclesLoading ? (
        <Card><p className="u-ink-muted u-text-sm">Loading vehicles…</p></Card>
      ) : vehicles.length === 0 ? (
        <Card>
          <h3>Add a vehicle first</h3>
          <p className="u-text-sm u-ink-muted">
            Tag & QR features bind a token to a vehicle. Go to the Garage, add one, then come back here.
          </p>
          <div className="sheet__actions">
            <Link to="/vehicles" className="btn btn--primary">
              <Icon name="plus" size="sm"/> Open Garage
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {vehicles.length > 1 && (
            <Card>
              <label htmlFor="vsel">Vehicle</label>
              <select id="vsel" value={vehicleId ?? ""}
                onChange={(e) => setParams({ vehicle: e.target.value })}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Card>
          )}

          <nav className="u-row u-gap-2 u-row-wrap" role="tablist"
            aria-label={`${mode === "nfc" ? "NFC" : "QR"} tools`}>
            {availableTabs.map((t) => {
              const needs = needsVehicle.includes(t) && !vehicle;
              return (
                <button key={t}
                  role="tab"
                  aria-selected={activeTab === t}
                  onClick={() => setTab(t)}
                  disabled={needs}
                  className={"pill-btn " + (activeTab === t ? "is-active" : "")}>
                  {labelFor(t, mode)}
                </button>
              );
            })}
          </nav>

          <section>
            {/* SCAN */}
            {activeTab === "scan" && mode === "nfc" && <TagInfoScreen/>}
            {activeTab === "scan" && mode === "qr" && (
              <Card>
                <div className="u-col u-gap-3" style={{ textAlign: "center", padding: "var(--s-5) 0" }}>
                  <h4>Point your camera at a MotoPulse QR</h4>
                  <p className="u-ink-muted u-text-sm">
                    The in-app scanner is for verifying a sticker before you print it. For normal use, your phone's own camera already does the same thing.
                  </p>
                  <div><Button variant="primary" onClick={() => setScannerOpen(true)}>
                    <Icon name="search" size="sm"/> Open scanner
                  </Button></div>
                </div>
              </Card>
            )}

            {/* WRITE */}
            {activeTab === "write" && vehicle && mode === "nfc" && (
              <WriteTagScreen vehicleId={vehicle.id} vehicleName={vehicle.name}/>
            )}
            {activeTab === "write" && vehicle && mode === "qr" && (
              <QrCodeCard vehicleId={vehicle.id} vehicleName={vehicle.name} activeToken={vehicle.active_tag_token}/>
            )}

            {/* NFC-only */}
            {activeTab === "erase"    && mode === "nfc" && <EraseFormatScreen/>}
            {activeTab === "replace"  && vehicle && mode === "nfc" && <ReplaceTagScreen vehicleId={vehicle.id} vehicleName={vehicle.name}/>}
            {activeTab === "advanced" && mode === "nfc" && <AdvancedScreen/>}

            {/* Shared */}
            {activeTab === "history" && vehicle && <TagHistoryScreen vehicleId={vehicle.id} vehicleName={vehicle.name}/>}
          </section>
        </>
      )}

      {scannerOpen && <QrScannerSheet onClose={() => setScannerOpen(false)}
        onToken={(token) => {
          window.dispatchEvent(new CustomEvent("motopulse:tapToken", { detail: token }));
        }}/>
      }
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
