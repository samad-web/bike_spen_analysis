import { useState } from "react";
import { CapacitorNfc } from "@capgo/capacitor-nfc";
import { Button, Icon } from "@/app/ui";
import { buildAarRecord, buildTokenUrlRecord, decodeUriRecord, MOTOPULSE_URL_PREFIX, runOnNextTag } from "./nfcPlugin";
import { checkTagCompatibility } from "./nfcCompat";
import { findTagByToken, generateToken, markTagReplaced, registerToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";
import { errorMessage } from "@/lib/errors";
import { extractToken } from "@/tap-session/useAppLinkListener";

interface Props {
  vehicleId: string;
  vehicleName: string;
  onWritten?: (token: string) => void;
}

type Step = "idle" | "waiting-for-tag" | "writing" | "done" | "error";

/**
 * Write-tag flow. Scan AND write happen inside a SINGLE Capacitor NFC
 * session; previously they were two sessions with a confirmation step in
 * between — the tag was disconnected by the time write() was called, which
 * the plugin reports as "connection lost".
 *
 * UX: user taps "Scan tag and write", session opens, write fires the moment
 * the tag touches the phone. If a confirmation is needed (tag belongs to
 * another vehicle), the error surfaces AFTER the attempt so the user never
 * ends up in a lifted-phone-between-steps dead end.
 */
export function WriteTagScreen({ vehicleId, vehicleName, onWritten }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    setStep("waiting-for-tag");
    setMessage(null);
    try {
      const token = generateToken();
      const newRecord = buildTokenUrlRecord(token);

      const { tagUid, tagType, replacedToken } = await runOnNextTag(async (scan) => {
        const compat = checkTagCompatibility(scan.tag);
        if (!compat.compatible) throw new Error(compat.reason ?? "Incompatible tag.");

        const existingUrl = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
        const existingToken = existingUrl ? extractToken(existingUrl) : null;
        const existingTag = existingToken ? await findTagByToken(existingToken) : null;
        if (existingTag && existingTag.vehicle_id !== vehicleId) {
          throw new Error("This tag is registered to another vehicle. Use the Replace tab to reassign it.");
        }

        // Session still open — write URL + Android Application Record (AAR) now.
        // The AAR guarantees Android launches the MotoPulse app directly.
        await CapacitorNfc.write({ allowFormat: true, records: [newRecord, buildAarRecord()] });
        return {
          tagUid: scan.uidHex,
          tagType: scan.tag.type ?? null,
          replacedToken: existingTag ? existingToken : null,
        };
      });

      setStep("writing");
      const registered = await registerToken(vehicleId, token);
      if (replacedToken) await markTagReplaced(replacedToken);

      await logTagEvent({
        tagToken: registered,
        vehicleId,
        eventType: "written",
        tagUid,
        tagTechnology: tagType,
        detail: { url: `${MOTOPULSE_URL_PREFIX}${registered}`, replacedToken },
      });

      setStep("done");
      onWritten?.(registered);
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
      await logTagEvent({ vehicleId, eventType: "write_failed", detail: { error: errorMessage(err) } });
    }
  };

  return (
    <div className="write-tag u-col u-gap-4">
      <div>
        <h2>Write a tag for {vehicleName}</h2>
        <p className="u-ink-muted u-text-sm">
          A fresh token will be generated and written to the next tag you present.
          Any existing content on the tag will be overwritten.
        </p>
      </div>

      {step === "idle" && (
        <Button variant="primary" onClick={() => void start()}>
          <Icon name="nfc" size="sm"/> Scan tag and write
        </Button>
      )}

      {step === "waiting-for-tag" && (
        <p className="u-ink-muted u-text-sm">
          Hold the tag flat against the back of the phone. Don't lift until it says "Done" — writing happens while the tag is still touching the phone.
        </p>
      )}

      {step === "writing" && (
        <p className="u-ink-muted u-text-sm">Saving to your account…</p>
      )}

      {step === "done" && (
        <p role="status" className="u-text-sm" style={{ color: "var(--status-good)" }}>
          <Icon name="check" size="sm"/> Tag written and registered to {vehicleName}.
        </p>
      )}

      {step === "error" && (
        <div role="alert" className="u-col u-gap-3">
          <p className="u-text-sm" style={{ color: "var(--status-crit)" }}>{message}</p>
          <div><Button variant="ghost" onClick={() => void start()}>Try again</Button></div>
        </div>
      )}
    </div>
  );
}
