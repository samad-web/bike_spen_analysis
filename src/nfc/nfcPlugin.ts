import { CapacitorNfc, type NfcEvent, type NfcTag } from "@capgo/capacitor-nfc";

/**
 * Thin wrapper around `@capgo/capacitor-nfc` (v8.3.6 API, verified against
 * its README on 2026-11-03 — see build-docs/MEMORY.md "Correction"; the
 * originally-planned `@capacitor-community/nfc` is deprecated/unpublished).
 *
 * Every MotoPulse NFC screen (build-docs/features/nfc-tools.md) talks to
 * this module, not the plugin directly, so the real plugin's exact shape
 * only needs to be known in one place.
 */

import { TOKEN_URL_PREFIX } from "@/lib/publicUrl";

export const MOTOPULSE_URL_PREFIX = TOKEN_URL_PREFIX;

/** NDEF URI record TNF/type per the NDEF URI Record spec. 0x04 = "https://". */
const TNF_WELL_KNOWN = 0x01;
const TYPE_URI = [0x55]; // 'U'
const URI_PREFIX_HTTPS = 0x04;

export function buildTokenUrlRecord(token: string) {
  // Strip the scheme because NDEF URI records store it as a single-byte
  // prefix code (0x04 = "https://"). Whatever host the deployment uses
  // (motopulse.pages.dev, motopulse.app, …) sits after the prefix byte.
  const hostAndPath = TOKEN_URL_PREFIX.replace(/^https?:\/\//, "") + token;
  const suffix = Array.from(new TextEncoder().encode(hostAndPath));
  return { tnf: TNF_WELL_KNOWN, type: TYPE_URI, id: [], payload: [URI_PREFIX_HTTPS, ...suffix] };
}

/** Decodes a URI record back to a full URL, reversing buildTokenUrlRecord.
 * Returns null if the record isn't a well-known URI record we recognize. */
export function decodeUriRecord(record: { tnf: number; type: number[]; payload: number[] }): string | null {
  if (record.tnf !== TNF_WELL_KNOWN || record.type[0] !== TYPE_URI[0]) return null;
  const [prefixCode, ...rest] = record.payload;
  const body = new TextDecoder().decode(new Uint8Array(rest));
  const prefixes: Record<number, string> = { 0x00: "", 0x01: "http://www.", 0x02: "https://www.", 0x04: "https://" };
  return (prefixes[prefixCode] ?? "") + body;
}

export interface ScanResult {
  tag: NfcTag;
  uidHex: string;
}

function toHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join(":");
}

/** One-shot foreground scan: resolves with the first tag discovered, then
 * stops scanning. Used by every NFC Tools screen (read, write, erase,
 * replace) — they all start from "scan a tag". */
export async function scanOnce(): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    let handle: { remove: () => Promise<void> } | undefined;
    const timeout = setTimeout(async () => {
      await handle?.remove();
      await CapacitorNfc.stopScanning().catch(() => {});
      reject(new Error("No tag detected within 30s. Hold the tag steady against the back of the phone."));
    }, 30_000);

    CapacitorNfc.addListener("nfcEvent", async (event: NfcEvent) => {
      clearTimeout(timeout);
      await handle?.remove();
      await CapacitorNfc.stopScanning().catch(() => {});
      resolve({ tag: event.tag, uidHex: toHex(event.tag.id ?? []) });
    })
      .then((h) => {
        handle = h;
        return CapacitorNfc.startScanning();
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

export async function stopScan(): Promise<void> {
  // capgo plugin exposes removeAllListeners via the listener handle, not the plugin object itself.
  // Handles are already removed inside scanOnce(); stopScan is a best-effort stop of any in-flight scan.
  await CapacitorNfc.stopScanning().catch(() => {});
}

/**
 * Opens a scan session, runs `inSession` the moment the tag is detected,
 * then closes the session. The crucial property vs. `scanOnce` + a separate
 * write call: the NFC session stays OPEN across the whole callback, so the
 * plugin's `.write()` / `.erase()` / `.makeReadOnly()` methods can operate
 * on the tag the user is still holding against the phone.
 *
 * The previous flow (scan → confirm → write) broke on hardware because
 * `stopScanning()` was called after the scan, leaving no active tag for
 * the subsequent write. Any UI confirmation step must happen BEFORE the
 * session is opened, not after.
 */
export async function runOnNextTag<T>(inSession: (result: ScanResult) => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let handle: { remove: () => Promise<void> } | undefined;
    let done = false;
    const cleanup = async () => {
      await handle?.remove().catch(() => {});
      await CapacitorNfc.stopScanning().catch(() => {});
    };
    const timeout = setTimeout(async () => {
      if (done) return;
      done = true;
      await cleanup();
      reject(new Error("No tag detected within 30s. Hold the tag steady against the back of the phone."));
    }, 30_000);

    CapacitorNfc.addListener("nfcEvent", async (event: NfcEvent) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      try {
        // Session is STILL OPEN here — inSession can call write/erase/makeReadOnly.
        const value = await inSession({ tag: event.tag, uidHex: toHex(event.tag.id ?? []) });
        await cleanup();
        resolve(value);
      } catch (err) {
        await cleanup();
        reject(err);
      }
    })
      .then((h) => {
        handle = h;
        return CapacitorNfc.startScanning();
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

/** Writes a single URI record, overwriting whatever was on the tag.
 * `allowFormat: true` lets a blank/foreign NDEF-formattable tag be
 * provisioned in one step (gap analysis: no separate "format first" step
 * needed for the common case — see nfc-tools.md EraseFormatScreen for the
 * explicit standalone version). */
export async function writeTokenUrl(token: string): Promise<void> {
  await CapacitorNfc.write({ allowFormat: true, records: [buildTokenUrlRecord(token)] });
}

/** Writes an empty NDEF message to the last-scanned tag (Erase, per the
 * plugin's own semantics — there is no separate format() call). */
export async function eraseTag(): Promise<void> {
  await CapacitorNfc.erase();
}

/** Permanently locks the last-scanned tag read-only. IRREVERSIBLE — gated
 * behind the Advanced screen's double confirmation, never called from the
 * main write/replace flow. */
export async function lockTagPermanently(): Promise<void> {
  await CapacitorNfc.makeReadOnly();
}

export type NfcHardwareStatus = "ok" | "no_hardware" | "disabled" | "unknown";

export async function getNfcHardwareStatus(): Promise<NfcHardwareStatus> {
  const { supported } = await CapacitorNfc.isSupported();
  if (!supported) return "no_hardware";
  const { status } = await CapacitorNfc.getStatus();
  if (status === "NFC_OK") return "ok";
  if (status === "NFC_DISABLED") return "disabled";
  return "unknown";
}
