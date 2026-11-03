import type { NfcTag } from "@capgo/capacitor-nfc";

export interface CompatResult {
  compatible: boolean;
  reason?: string;
  guessedModel: string; // best-effort label shown in TagInfoScreen; never presented as certain
}

/**
 * Checks a scanned tag against "must be NTAG213/215/216" (gap analysis #3).
 * The plugin doesn't expose the exact chip model (see nfc-tools.md's
 * "Tag-type detection caveat") so this is a heuristic, not a lookup:
 * - Reject anything whose techTypes mention MifareClassic outright — that's
 *   the one case the reference app explicitly calls out as unsupported.
 * - Accept tags reporting as NFC Forum Type 2 / MifareUltralight, and use
 *   maxSize to guess which NTAG21x it probably is.
 */
export function checkTagCompatibility(tag: NfcTag): CompatResult {
  const techTypes = tag.techTypes ?? [];
  const isMifareClassic = techTypes.some((t) => t.includes("MifareClassic"));
  const isType2 = (tag.type ?? "").includes("Type 2") || techTypes.some((t) => t.includes("MifareUltralight"));

  if (isMifareClassic) {
    return {
      compatible: false,
      reason: "This NFC tag is not supported — must be an NTAG213/215/216 (NFC Forum Type 2), not Mifare Classic.",
      guessedModel: "Mifare Classic",
    };
  }

  if (!isType2) {
    return {
      compatible: false,
      reason: `Unrecognized tag type (${tag.type ?? (techTypes.join(", ") || "unknown")}). MotoPulse needs an NTAG213/215/216.`,
      guessedModel: tag.type ?? "Unknown",
    };
  }

  return { compatible: true, guessedModel: guessNtagModel(tag.maxSize) };
}

function guessNtagModel(maxSize: number | null | undefined): string {
  if (maxSize == null) return "NTAG21x (model unknown — plugin doesn't report it)";
  // Approximate usable NDEF memory for the plain (non-F) variants.
  if (maxSize <= 160) return "Likely NTAG213 (~144B usable)";
  if (maxSize <= 540) return "Likely NTAG215 (~504B usable)";
  return "Likely NTAG216 (~888B usable)";
}
