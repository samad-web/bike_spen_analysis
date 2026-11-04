import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { lockTagPermanently, runOnNextTag, decodeUriRecord, MOTOPULSE_URL_PREFIX } from "./nfcPlugin";
import { findTagByToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";

type Step = "idle" | "locking" | "done" | "error";

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

  const startLock = async () => {
    if (typed !== "LOCK") return;
    setStep("locking");
    setMessage(null);

    try {
      await runOnNextTag(async (scan) => {
        const url = scan.tag.ndefMessage?.[0] ? decodeUriRecord(scan.tag.ndefMessage[0]) : null;
        const token = url?.startsWith(MOTOPULSE_URL_PREFIX) ? url.slice(MOTOPULSE_URL_PREFIX.length) : null;
        if (token) {
          const row = await findTagByToken(token);
          if (row && row.status === "active") {
            throw new Error("This tag is still assigned to a vehicle. Unassign or replace it first — a locked tag can never be erased or replaced.");
          }
        }
        await lockTagPermanently();
        await logTagEvent({ tagToken: token, eventType: "locked", tagUid: scan.uidHex });
      });
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="u-text-sm u-ink-muted">To unlock the action, type the word <strong>LOCK</strong> below:</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type LOCK"
              style={{ maxWidth: 200, fontFamily: "ui-monospace, monospace" }}
            />
            <div>
              <button
                type="button"
                className="btn btn--danger"
                disabled={typed !== "LOCK"}
                onClick={startLock}
              >
                Scan & lock permanently
              </button>
            </div>
          </div>
        )}

        {step === "locking" && (
          <div className="card card--accent" style={{ marginTop: 12 }}>
            <p><strong>Hold the tag to the back of the phone now…</strong></p>
            <p className="u-text-xs u-ink-muted">Do not pull the tag away until complete.</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("idle")}>
              Cancel
            </button>
          </div>
        )}

        {step === "done" && (
          <div style={{ marginTop: 12 }}>
            <p role="status" style={{ color: "var(--status-ok)" }}>✓ Tag has been permanently locked.</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setStep("idle"); setTyped(""); }}>
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div role="alert" style={{ marginTop: 12 }}>
            <p style={{ color: "var(--status-crit)" }}>{message}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep("idle")}>
              Try again
            </button>
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Password protection</h3>
        <p className="u-text-sm u-ink-muted">
          Password protection isn't supported in this version — it only works on NTAG213F/215F/216F chips
          (the ferrite-backed stickers recommended for MotoPulse don't use the F variant), and the current
          NFC plugin doesn't expose the required AUTH0/PWD config pages.
        </p>
      </section>
    </details>
  );
}
