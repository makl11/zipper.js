import { describe, expect, it } from "vitest";

import { BIT_FLAGS, decodeBitFlags, encodeBitFlags } from "./bitflags.js";

describe("BitFlags", () => {
  it("should encode single flags correctly", () => {
    expect(encodeBitFlags({ UTF8: true })).toEqual(BIT_FLAGS.UTF8);
    expect(encodeBitFlags({ DATA_DESCRIPTOR: true })).toEqual(
      BIT_FLAGS.DATA_DESCRIPTOR,
    );
  });

  it("should encode multiple flags correctly", () => {
    expect(
      encodeBitFlags({
        UTF8: true,
        DATA_DESCRIPTOR: true,
      }),
    ).toEqual(BIT_FLAGS.UTF8 | BIT_FLAGS.DATA_DESCRIPTOR);
  });

  it("should decode flags bytes correctly", () => {
    const { UTF8, DATA_DESCRIPTOR, ...flags } = decodeBitFlags([0x08, 0x08]);
    expect(UTF8).toBe(true);
    expect(DATA_DESCRIPTOR).toBe(true);
    expect(Object.values(flags)).not.toContain(true);
  });

  it("should decode flags numbers correctly", () => {
    const { UTF8, DATA_DESCRIPTOR, ...flags } = decodeBitFlags(
      BIT_FLAGS.UTF8 | BIT_FLAGS.DATA_DESCRIPTOR,
    );
    expect(UTF8).toBe(true);
    expect(DATA_DESCRIPTOR).toBe(true);
    expect(Object.values(flags)).not.toContain(true);
  });
});
