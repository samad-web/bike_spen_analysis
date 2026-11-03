import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { scanOnce, eraseTag, decodeUriRecord, MOTOPULSE_URL_PREFIX } from "./nfcPlugin";
import { findTagByToken, markTagErased } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";

/**
 * Erase / format screen (build-docs/features/nfc-tools.md EraseFormatScreen).
 * `@capgo/capacitor-nfc` has no standalone `format()` call — erase() writes
 * an empty NDEF message, which is the practical equivalent for the NTAG21x
 * tags MotoPulse supports. If the erased tag was a known MotoPulse tag, its
 * nfc_tags row is marked `erased` so a future tap of that token says "tag no
 * longer valid" instead of trying to log.
 */
type Step = "idle" | "scanning" | "confirming" | "erasing" | "done" | "error";

export function EraseFormatScreen() {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  const startScan = async () => {
    setStep("scanning");
    setMessage(null);
    try {
      const scan = await scanOnce();
      setPendingUid(scan.uidHex);

      const url = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
      const token = url?.startsWith(MOTOPULSE_URL_PREFIX) ? url.slice(MOTOPULSE_URL_PREFIX.length) : null;
      setPendingToken(token);

      if (token) {
        const row = await findTagByToken(token);
        if (!row) setMessage("This looks like a MotoPulse tag but it isn't registered on this account.");
      }
      setStep("confirming");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  const confirmErase = async () => {
    setStep("erasing");
    try {
      await eraseTag();
      if (pendingToken) await markTagErased(pendingToken);
      await logTagEvent({
        tagToken: pendingToken,
        eventType: "erased",
        tagUid: pendingUid,
      });
      setStep("done");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  return (
    <div className="erase-format">
      <h2>Erase / format tag</h2>
      {step === "idle" && (
        <button type="button" onClick={startScan}>
          Scan the tag to erase
        </button>
      )}
      {step === "scanning" && <p>Hold the tag to the back of the phone...</p>}
      {step === "confirming" && (
        <div>
          <p>
            {pendingToken
              ? "This is a registered MotoPulse tag. Erasing it will make future taps of it do nothing."
              : "This tag's NDEF content will be cleared."}
          </p>
          {message && <p>{message}</p>}
          <button type="button" onClick={confirmErase}>
            Confirm erase
          </button>
        </div>
      )}
      {step === "erasing" && <p>Erasing...</p>}
      {step === "done" && <p role="status">Tag erased.</p>}
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
