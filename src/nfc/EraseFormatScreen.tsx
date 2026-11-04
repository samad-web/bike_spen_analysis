import { useState } from "react";
import { CapacitorNfc } from "@capgo/capacitor-nfc";
import { Button, Icon } from "@/app/ui";
import { decodeUriRecord, runOnNextTag } from "./nfcPlugin";
import { findTagByToken, markTagErased } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";
import { errorMessage } from "@/lib/errors";
import { extractToken } from "@/tap-session/useAppLinkListener";

type Step = "idle" | "waiting-for-tag" | "erasing" | "done" | "error";

/**
 * Erase/format a tag. Scan + erase happen in ONE session; the previous
 * two-session flow left the tag disconnected by the time erase() ran,
 * producing a "connection lost" error on the hardware.
 */
export function EraseFormatScreen() {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    setStep("waiting-for-tag");
    setMessage(null);
    try {
      const { eraseToken, uidHex } = await runOnNextTag(async (scan) => {
        const url = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
        const token = url ? extractToken(url) : null;
        // Session still open — erase while tag is in contact.
        await CapacitorNfc.erase();
        return { eraseToken: token, uidHex: scan.uidHex };
      });

      setStep("erasing");
      if (eraseToken) {
        const row = await findTagByToken(eraseToken);
        if (row) await markTagErased(eraseToken);
      }
      await logTagEvent({ tagToken: eraseToken, eventType: "erased", tagUid: uidHex });
      setStep("done");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  return (
    <div className="erase-format u-col u-gap-4">
      <div>
        <h2>Erase / format tag</h2>
        <p className="u-ink-muted u-text-sm">
          Clears the next tag you present. A registered MotoPulse tag will be
          marked erased in your account so future taps of it do nothing.
        </p>
      </div>

      {step === "idle" && (
        <Button variant="primary" onClick={() => void start()}>
          <Icon name="nfc" size="sm"/> Scan tag and erase
        </Button>
      )}
      {step === "waiting-for-tag" && (
        <p className="u-ink-muted u-text-sm">
          Hold the tag against the back of the phone. Don&apos;t lift until it says &quot;Done&quot;.
        </p>
      )}
      {step === "erasing" && <p className="u-ink-muted u-text-sm">Updating your records…</p>}
      {step === "done" && (
        <p role="status" className="u-text-sm" style={{ color: "var(--status-good)" }}>
          <Icon name="check" size="sm"/> Tag erased.
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
