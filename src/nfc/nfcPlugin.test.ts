import { describe, it, expect } from "vitest";
import { buildTokenUrlRecord, decodeUriRecord, MOTOPULSE_URL_PREFIX } from "./nfcPlugin";

describe("buildTokenUrlRecord / decodeUriRecord round trip", () => {
  it("encodes a token into a well-known URI record and decodes it back to the same URL", () => {
    const token = "abc123XYZ";
    const record = buildTokenUrlRecord(token);
    expect(record.tnf).toBe(0x01);
    expect(record.type).toEqual([0x55]);

    const decoded = decodeUriRecord(record);
    expect(decoded).toBe(`${MOTOPULSE_URL_PREFIX}${token}`);
  });

  it("returns null for a record that isn't a well-known URI record", () => {
    const textRecord = { tnf: 0x01, type: [0x54], payload: [0, 101, 110] }; // type 'T', not 'U'
    expect(decodeUriRecord(textRecord)).toBeNull();
  });
});
