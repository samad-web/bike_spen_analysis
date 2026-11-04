import { useState } from "react";
import { CapacitorNfc } from "@capgo/capacitor-nfc";
import { Button, Icon } from "@/app/ui";
import { buildTokenUrlRecord, decodeUriRecord, MOTOPULSE_URL_PREFIX, runOnNextTag } from "./nfcPlugin";
import { checkTagCompatibility } from "./nfcCompat";
import { findTagByToken, generateToken, markTagReplaced, registerToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";
import { errorMessage } from "@/lib/errors";

interface Props {
  vehicleId: string;
  vehicleName: string;
  onReplaced?: (newToken: string) => void;
}

type Step = "pick-old" | "retire-old" | "waiting-for-old" | "waiting-for-new" | "writing" | "done" | "error";

/**
 * Replace a tag. Two sequential single-session NFC operations:
 *   1. Read the old tag (one session).
 *   2. Scan + write the new tag (one session, no lift-and-confirm between).
 *
 * Previous flow lost the write session between confirm and write calls.
 */
export function ReplaceTagScreen({ vehicleId, vehicleName, onReplaced }: Props) {
  const [step, setStep] = useState<Step>("pick-old");
  const [message, setMessage] = useState<string | null>(null);
  const [oldToken, setOldToken] = useState<string | null>(null);

  const scanOld = async () => {
    setStep("waiting-for-old");
    setMessage(null);
    try {
      const token = await runOnNextTag(async (scan) => {
        const url = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
        const t = url?.startsWith(MOTOPULSE_URL_PREFIX) ? url.slice(MOTOPULSE_URL_PREFIX.length) : null;
        if (!t) throw new Error("That tag is not a MotoPulse tag.");
        const row = await findTagByToken(t);
        if (!row || row.vehicle_id !== vehicleId) {
          throw new Error(`That tag is not registered to ${vehicleName}.`);
        }
        return t;
      });
      setOldToken(token);
      setStep("retire-old");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  const skipOld = () => {
    setOldToken(null);
    setStep("retire-old");
  };

  const scanAndWriteNew = async () => {
    setStep("waiting-for-new");
    setMessage(null);
    try {
      const token = generateToken();
      const record = buildTokenUrlRecord(token);
      const { uidHex } = await runOnNextTag(async (scan) => {
        const compat = checkTagCompatibility(scan.tag);
        if (!compat.compatible) throw new Error(compat.reason ?? "Incompatible tag.");
        // Session still open — write while tag is in contact.
        await CapacitorNfc.write({ allowFormat: true, records: [record] });
        return { uidHex: scan.uidHex };
      });

      setStep("writing");
      if (oldToken) await markTagReplaced(oldToken);
      const registered = await registerToken(vehicleId, token);
      await logTagEvent({
        tagToken: registered,
        vehicleId,
        eventType: "replaced",
        tagUid: uidHex,
        detail: { oldToken, newToken: registered },
      });
      setStep("done");
      onReplaced?.(registered);
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
      await logTagEvent({ vehicleId, eventType: "write_failed", detail: { error: errorMessage(err) } });
    }
  };

  return (
    <div className="replace-tag u-col u-gap-4">
      <h2>Replace tag for {vehicleName}</h2>

      {step === "pick-old" && (
        <div className="u-col u-gap-3">
          <p className="u-ink-muted u-text-sm">
            Scan the OLD tag first so we can retire it, then scan the NEW tag. Skip to the new tag if the old one is lost or already damaged.
          </p>
          <div className="u-row u-gap-2 u-row-wrap">
            <Button variant="primary" onClick={() => void scanOld()}>Scan old tag</Button>
            <Button variant="ghost" onClick={skipOld}>Skip — old tag lost</Button>
          </div>
        </div>
      )}

      {step === "waiting-for-old" && (
        <p className="u-ink-muted u-text-sm">Hold the OLD tag to the phone…</p>
      )}

      {step === "retire-old" && (
        <div className="u-col u-gap-3">
          <p role="status" className="u-text-sm" style={{ color: "var(--status-good)" }}>
            <Icon name="check" size="sm"/> {oldToken ? "Old tag found." : "Old tag skipped."} Now scan the NEW tag.
          </p>
          <Button variant="primary" onClick={() => void scanAndWriteNew()}>Scan new tag and write</Button>
        </div>
      )}

      {step === "waiting-for-new" && (
        <p className="u-ink-muted u-text-sm">
          Hold the NEW tag against the back of the phone. Don&apos;t lift until it says &quot;Done&quot;.
        </p>
      )}
      {step === "writing" && <p className="u-ink-muted u-text-sm">Saving to your account…</p>}
      {step === "done" && (
        <p role="status" className="u-text-sm" style={{ color: "var(--status-good)" }}>
          <Icon name="check" size="sm"/> Replaced. The old tag will no longer log taps.
        </p>
      )}
      {step === "error" && (
        <div role="alert" className="u-col u-gap-3">
          <p className="u-text-sm" style={{ color: "var(--status-crit)" }}>{message}</p>
          <div><Button variant="ghost" onClick={() => setStep("pick-old")}>Start over</Button></div>
        </div>
      )}
    </div>
  );
}
