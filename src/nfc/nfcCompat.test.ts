import { describe, it, expect } from "vitest";
import { checkTagCompatibility } from "./nfcCompat";
import type { NfcTag } from "@capgo/capacitor-nfc";

function tag(overrides: Partial<NfcTag>): NfcTag {
  return {
    id: [1, 2, 3, 4],
    techTypes: [],
    type: null,
    maxSize: null,
    isWritable: true,
    canMakeReadOnly: true,
    ndefMessage: null,
    ...overrides,
  };
}

describe("checkTagCompatibility", () => {
  it("rejects Mifare Classic with the reference app's own warning", () => {
    const result = checkTagCompatibility(tag({ techTypes: ["android.nfc.tech.MifareClassic"] }));
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/not supported/i);
  });

  it("accepts an NFC Forum Type 2 tag and guesses NTAG213 from a small maxSize", () => {
    const result = checkTagCompatibility(tag({ type: "NFC Forum Type 2", maxSize: 144 }));
    expect(result.compatible).toBe(true);
    expect(result.guessedModel).toMatch(/NTAG213/);
  });

  it("accepts a MifareUltralight tech type even without an explicit type string", () => {
    const result = checkTagCompatibility(tag({ techTypes: ["android.nfc.tech.MifareUltralight"], maxSize: 504 }));
    expect(result.compatible).toBe(true);
    expect(result.guessedModel).toMatch(/NTAG215/);
  });

  it("rejects an unrecognized tag type", () => {
    const result = checkTagCompatibility(tag({ type: "ISO 7816" }));
    expect(result.compatible).toBe(false);
  });
});
