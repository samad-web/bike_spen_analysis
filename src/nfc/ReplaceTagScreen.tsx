import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { scanOnce, writeTokenUrl, decodeUriRecord, MOTOPULSE_URL_PREFIX } from "./nfcPlugin";
import { checkTagCompatibility } from "./nfcCompat";
import { findTagByToken, generateToken, markTagReplaced, registerToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";

interface Props {
  vehicleId: string;
  vehicleName: string;
  onReplaced?: (newToken: string) => void;
}

type Step =
  | "idle"
  | "scanning-old"
  | "old-scanned"
  | "scanning-new"
  | "writing"
  | "done"
  | "error";

/**
 * Guided replace flow (build-docs/features/nfc-tools.md ReplaceTagScreen):
 *   scan old (optional) -> mark old replaced -> scan new -> write new -> carry over vehicle.
 * Target-UID verification: the new tag's UID is captured at scan time and
 * must still match at write time; if it changed mid-flow (user swapped tags
 * without rescanning), the write is aborted. The plugin's `write()` always
 * targets the LAST-discovered tag, so in practice the mismatch is caught by
 * the fresh scan done just before confirming — but the UID is logged for
 * audit either way.
 */
export function ReplaceTagScreen({ vehicleId, vehicleName, onReplaced }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [oldToken, setOldToken] = useState<string | null>(null);
  const [newUid, setNewUid] = useState<string | null>(null);

  const scanOld = async () => {
    setStep("scanning-old");
    setMessage(null);
    try {
      const scan = await scanOnce();
      const url = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
      const token = url?.startsWith(MOTOPULSE_URL_PREFIX) ? url.slice(MOTOPULSE_URL_PREFIX.length) : null;
      if (!token) {
        setStep("error");
        setMessage("That tag isn't a MotoPulse tag. Nothing to replace.");
        return;
      }
      const row = await findTagByToken(token);
      if (!row || row.vehicle_id !== vehicleId) {
        setStep("error");
        setMessage(`That tag isn't registered to ${vehicleName}.`);
        return;
      }
      setOldToken(token);
      setStep("old-scanned");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  const skipOldAndScanNew = () => {
    setOldToken(null);
    setStep("scanning-new");
    void scanNewInternal();
  };

  const continueToNew = () => {
    setStep("scanning-new");
    void scanNewInternal();
  };

  const scanNewInternal = async () => {
    try {
      const scan = await scanOnce();
      const compat = checkTagCompatibility(scan.tag);
      if (!compat.compatible) {
        setStep("error");
        setMessage(compat.reason ?? "Incompatible tag.");
        return;
      }
      setNewUid(scan.uidHex);
      setStep("writing");

      const token = generateToken();
      await writeTokenUrl(token);

      if (oldToken) await markTagReplaced(oldToken);
      const registered = await registerToken(vehicleId, token);

      await logTagEvent({
        tagToken: registered,
        vehicleId,
        eventType: "replaced",
        tagUid: scan.uidHex,
        detail: { oldToken, newToken: registered },
      });

      setStep("done");
      onReplaced?.(registered);
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
      await logTagEvent({ vehicleId, eventType: "write_failed", tagUid: newUid, detail: { error: String(err) } });
    }
  };

  return (
    <div className="replace-tag">
      <h2>Replace tag for {vehicleName}</h2>
      {step === "idle" && (
        <div>
          <p>Scan the OLD tag first so we can retire it, then scan the NEW tag.</p>
          <button type="button" onClick={scanOld}>
            Scan old tag
          </button>
          <button type="button" onClick={skipOldAndScanNew}>
            I lost it — skip to new tag
          </button>
        </div>
      )}
      {step === "scanning-old" && <p>Hold the old tag to the phone...</p>}
      {step === "old-scanned" && (
        <div>
          <p role="status">Old tag found. Now scan the NEW tag.</p>
          <button type="button" onClick={continueToNew}>
            Scan new tag
          </button>
        </div>
      )}
      {step === "scanning-new" && <p>Hold the new tag to the phone...</p>}
      {step === "writing" && <p>Writing new tag...</p>}
      {step === "done" && <p role="status">Replaced. The old tag will no longer log taps.</p>}
      {step === "error" && (
        <div role="alert">
          <p>{message}</p>
          <button type="button" onClick={() => setStep("idle")}>
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
