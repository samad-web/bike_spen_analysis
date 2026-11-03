import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { scanOnce, writeTokenUrl, decodeUriRecord, MOTOPULSE_URL_PREFIX } from "./nfcPlugin";
import { checkTagCompatibility } from "./nfcCompat";
import { findTagByToken, generateToken, markTagReplaced, registerToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";

interface Props {
  vehicleId: string;
  vehicleName: string;
  onWritten?: (token: string) => void;
}

type Step = "idle" | "scanning" | "confirming" | "writing" | "done" | "error";

interface PendingScan {
  uidHex: string;
  tagType: string | null;
  /** Set when the scanned tag already carries a MotoPulse token owned by a
   * DIFFERENT vehicle — surfaced so the user can't silently steal a tag
   * that's physically mounted on another bike (nfc-tools.md edge case). */
  conflictingToken: string | null;
}

/** Mints a token and writes it to a scanned tag (build-docs/features/
 * nfc-tools.md WriteTagScreen). The DB row is only inserted AFTER the
 * on-device write succeeds (acceptance criterion: no orphan row if the app
 * is killed mid-write). */
export function WriteTagScreen({ vehicleId, vehicleName, onWritten }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingScan | null>(null);

  const startScan = async () => {
    setStep("scanning");
    setMessage(null);
    try {
      const scan = await scanOnce();
      const compat = checkTagCompatibility(scan.tag);
      if (!compat.compatible) {
        setStep("error");
        setMessage(compat.reason ?? "Incompatible tag.");
        await logTagEvent({
          vehicleId,
          eventType: "write_failed",
          tagUid: scan.uidHex,
          tagTechnology: scan.tag.type,
          detail: { reason: compat.reason },
        });
        return;
      }

      const existingUrl = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
      const existingToken = existingUrl?.startsWith(MOTOPULSE_URL_PREFIX)
        ? existingUrl.slice(MOTOPULSE_URL_PREFIX.length)
        : null;
      const existingTag = existingToken ? await findTagByToken(existingToken) : null;

      setPending({
        uidHex: scan.uidHex,
        tagType: scan.tag.type ?? null,
        conflictingToken: existingTag && existingTag.vehicle_id !== vehicleId ? existingToken : null,
      });
      setStep("confirming");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  const confirmWrite = async () => {
    if (!pending) return;
    setStep("writing");
    try {
      const token = generateToken();
      await writeTokenUrl(token); // on-device write first
      const registered = await registerToken(vehicleId, token); // DB row only after success

      if (pending.conflictingToken) {
        await markTagReplaced(pending.conflictingToken);
      }

      await logTagEvent({
        tagToken: registered,
        vehicleId,
        eventType: "written",
        tagUid: pending.uidHex,
        tagTechnology: pending.tagType,
        detail: { url: `${MOTOPULSE_URL_PREFIX}${registered}`, replacedToken: pending.conflictingToken },
      });

      setStep("done");
      onWritten?.(registered);
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
      await logTagEvent({ vehicleId, eventType: "write_failed", tagUid: pending.uidHex, detail: { error: String(err) } });
    }
  };

  return (
    <div className="write-tag">
      <h2>Write a tag for {vehicleName}</h2>

      {step === "idle" && (
        <button type="button" onClick={startScan}>
          Scan a blank or spare tag
        </button>
      )}
      {step === "scanning" && <p>Hold the tag to the back of the phone...</p>}
      {step === "confirming" && pending && (
        <div>
          <p>This will erase any existing content and write a new MotoPulse tag for {vehicleName}.</p>
          {pending.conflictingToken && (
            <p role="alert">
              This tag is already registered to another vehicle. Continuing will unassign it there and reassign
              it to {vehicleName}.
            </p>
          )}
          <button type="button" onClick={confirmWrite}>
            Confirm write
          </button>
        </div>
      )}
      {step === "writing" && <p>Writing...</p>}
      {step === "done" && <p role="status">Tag written and registered to {vehicleName}.</p>}
      {step === "error" && (
        <div role="alert">
          <p>{message}</p>
          <button type="button" onClick={startScan}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
