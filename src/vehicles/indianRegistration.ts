/**
 * Indian vehicle registration number validation.
 *
 * Standard format (post-1989 and still the dominant one):
 *   AA 00 BB 0000
 *   └┬┘ └┬┘ └┬┘ └┬┘
 *    │   │   │   └── 1 to 4 digit vehicle number
 *    │   │   └────── 1 to 3 letter series (A–Z, excluding I and O ambiguity)
 *    │   └────────── 1 to 2 digit RTO district code (01..99)
 *    └────────────── 2 letter state / UT code (KA, MH, DL, UP, TN, ...)
 *
 * Bharat (BH) series — new (2021+) for central-govt-posted employees and
 * select businesses, carried across state transfers:
 *   22 BH 0000 AA
 *   └┬┘ └┬┘ └─┬┘ └┬┘
 *   year  BH  seq  check (1 or 2 letters)
 *
 * Separators are optional: KA01AB1234, KA-01-AB-1234, KA 01 AB 1234
 * are all accepted and normalized to the compact uppercase form on store.
 *
 * References: Central Motor Vehicles Rules, Rule 51(c); state RTO lists at
 * parivahan.gov.in. We don't look up the state code against a hardcoded
 * list — RTOs add new codes occasionally and we don't want to reject a
 * valid registration because our list is stale.
 */

const STANDARD = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/;
const BHARAT   = /^\d{2}BH\d{4}[A-Z]{1,2}$/;

/** Strips spaces and hyphens, uppercases — produces the canonical form. */
export function normalizeIndianReg(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** True iff the input (after normalization) matches the standard or BH format. */
export function isValidIndianReg(input: string): boolean {
  const n = normalizeIndianReg(input);
  return STANDARD.test(n) || BHARAT.test(n);
}

/** Pretty-prints with hyphens for display. */
export function formatIndianReg(input: string): string {
  const n = normalizeIndianReg(input);
  if (BHARAT.test(n)) {
    // 22 BH 0000 AA
    return `${n.slice(0, 2)}-${n.slice(2, 4)}-${n.slice(4, 8)}-${n.slice(8)}`;
  }
  if (STANDARD.test(n)) {
    // split: [2 letters][1-2 digits][1-3 letters][1-4 digits]
    const match = n.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
  }
  return n;
}
