import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { scanOnce, decodeUriRecord, type ScanResult } from "./nfcPlugin";
import { checkTagCompatibility } from "./nfcCompat";

/**
 * Read-only diagnostics scan (build-docs/features/nfc-tools.md). Writes
 * nothing. Doubles as the "Test tag" button target from vehicle setup
 * (gap analysis #3).
 */
export function TagInfoScreen() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const scan = await scanOnce();
      setResult(scan);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  const compat = result ? checkTagCompatibility(result.tag) : null;
  const urlOnTag = result?.tag.ndefMessage?.[0] ? decodeUriRecord(result.tag.ndefMessage[0]) : null;

  return (
    <div className="tag-info">
      <h2>Tag Info</h2>
      <button type="button" onClick={handleScan} disabled={scanning}>
        {scanning ? "Hold the tag to the back of the phone..." : "Scan a tag"}
      </button>

      {error && <p role="alert">{error}</p>}

      {result && compat && (
        <dl>
          <dt>Compatible with MotoPulse</dt>
          <dd>{compat.compatible ? "Yes" : `No — ${compat.reason}`}</dd>
          <dt>Guessed model</dt>
          <dd>{compat.guessedModel}</dd>
          <dt>UID</dt>
          <dd>{result.uidHex}</dd>
          <dt>Reported type</dt>
          <dd>{result.tag.type ?? "unknown"}</dd>
          <dt>Tech types</dt>
          <dd>{result.tag.techTypes?.join(", ") || "none reported"}</dd>
          <dt>Memory (max NDEF size)</dt>
          <dd>{result.tag.maxSize != null ? `${result.tag.maxSize} bytes` : "unknown"}</dd>
          <dt>Writable</dt>
          <dd>{result.tag.isWritable == null ? "unknown" : result.tag.isWritable ? "Yes" : "No"}</dd>
          <dt>Can be locked read-only</dt>
          <dd>{result.tag.canMakeReadOnly == null ? "unknown" : result.tag.canMakeReadOnly ? "Yes" : "No"}</dd>
          <dt>Current content</dt>
          <dd>{urlOnTag ?? (result.tag.ndefMessage?.length ? "Non-URL NDEF content" : "Blank")}</dd>
        </dl>
      )}
    </div>
  );
}
