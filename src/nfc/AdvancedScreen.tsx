import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { lockTagPermanently, scanOnce, decodeUriRecord, MOTOPULSE_URL_PREFIX } from "./nfcPlugin";
import { findTagByToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";

type Step = "idle" | "scanning" | "confirming" | "locking" | "done" | "error";

/**
 * Advanced NFC Tools features (build-docs/features/nfc-tools.md
 * AdvancedScreen). INTENTIONALLY off the happy path:
 *
 *   - "Lock tag" is PERMANENT and makes the tag impossible to erase or
 *     reassign. It directly contradicts the "support replacing a lost tag"
 *     requirement for that specific tag. Guarded by a typed-confirmation
 *     input (user must type the word "LOCK" exactly) in addition to the
 *     warning paragraph.
 *   - Password protection is NOT built here — `@capgo/capacitor-nfc` 8.3.6
 *     has no AUTH0/PWD/PACK config-page APIs, and the chip variant that
 *     would support it (NTAG213F/215F/216F) isn't the SKU the setup
 *     checklist tells users to buy. Showing it would promise a feature
 *     that silently no-ops. Documented as explicitly out of scope.
 */
export function AdvancedScreen() {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [stillAssigned, setStillAssigned] = useState(false);

  const scan = async () => {
    setStep("scanning");
    setMessage(null);
    setTyped("");
    try {
      const result = await scanOnce();
      setPendingUid(result.uidHex);
      const url = result.tag.ndefMessage?.[0] ? decodeUriRecord(result.tag.ndefMessage[0]) : null;
      const token = url?.startsWith(MOTOPULSE_URL_PREFIX) ? url.slice(MOTOPULSE_URL_PREFIX.length) : null;
      setPendingToken(token);
      if (token) {
        const row = await findTagByToken(token);
        setStillAssigned(Boolean(row && row.status === "active"));
      } else {
        setStillAssigned(false);
      }
      setStep("confirming");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  const confirmLock = async () => {
    setStep("locking");
    try {
      await lockTagPermanently();
      await logTagEvent({ tagToken: pendingToken, eventType: "locked", tagUid: pendingUid });
      setStep("done");
    } catch (err) {
      setStep("error");
      setMessage(errorMessage(err));
    }
  };

  return (
    <details className="advanced-screen">
      <summary>Advanced (irreversible)</summary>

      <section>
        <h3>Lock tag (permanent)</h3>
        <p>
          Locking a tag makes it read-only forever. The tag can never be erased, rewritten, or replaced
          afterwards. This process cannot be reverted.
        </p>

        {step === "idle" && (
          <button type="button" onClick={scan}>
            Scan a tag to lock
          </button>
        )}
        {step === "scanning" && <p>Hold the tag to the phone...</p>}
        {step === "confirming" && (
          <div>
            {stillAssigned && (
              <p role="alert">
                This tag is still assigned to a vehicle. Unassign or replace it first — a locked tag can never
                be erased or replaced.
              </p>
            )}
            {!stillAssigned && (
              <>
                <p>Type the word LOCK to confirm.</p>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} />
                <button type="button" disabled={typed !== "LOCK"} onClick={confirmLock}>
                  Lock permanently
                </button>
              </>
            )}
            <button type="button" onClick={() => setStep("idle")}>
              Cancel
            </button>
          </div>
        )}
        {step === "locking" && <p>Locking...</p>}
        {step === "done" && <p role="status">Tag locked.</p>}
        {step === "error" && (
          <div role="alert">
            <p>{message}</p>
            <button type="button" onClick={() => setStep("idle")}>
              Back
            </button>
          </div>
        )}
      </section>

      <section>
        <h3>Password protection</h3>
        <p>
          Password protection isn't supported in this version — it only works on NTAG213F/215F/216F chips
          (the ferrite-backed stickers recommended for MotoPulse don't use the F variant), and the current
          NFC plugin doesn't expose the required AUTH0/PWD config pages. Not shipping a button that silently
          does nothing.
        </p>
      </section>
    </details>
  );
}
