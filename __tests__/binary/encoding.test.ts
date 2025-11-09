import { describe, expect, it } from "vitest";
import Zipper from "../../src";

describe("Number encoding", () => {
  it("should encode 8bit/1byte numbers in litte-endian byte order", () => {
    expect(new Zipper().encodeNumber(0x5b, 1)).toStrictEqual(
      new Uint8Array([0x5b]),
    );
  });

  it("should encode 16bit/2byte numbers in litte-endian byte order", () => {
    expect(new Zipper().encodeNumber(0x5b69, 2)).toStrictEqual(
      new Uint8Array([0x69, 0x5b]),
    );
  });

  it("should encode 32bit/4byte numbers in litte-endian byte order", () => {
    expect(new Zipper().encodeNumber(0x5b6974bc)).toStrictEqual(
      new Uint8Array([0xbc, 0x74, 0x69, 0x5b]),
    );
  });

  it("should encode 64bit/8byte numbers in litte-endian byte order", () => {
    expect(new Zipper().encodeNumber(0xffffffff * 63, 8)).toStrictEqual(
      new Uint8Array([0xc1, 0xff, 0xff, 0xff, 0x3e, 0x00, 0x00, 0x00]),
    );
  });

  it("should throw if input is not of type `number`", () => {
    expect(() =>
      // @ts-expect-error passing invalid value on purpose
      new Zipper().encodeNumber(BigInt(0xffffffff * 63), 8),
    ).toThrow();
    // @ts-expect-error passing invalid value on purpose
    expect(() => new Zipper().encodeNumber("0xffffffff")).toThrow();
    // @ts-expect-error passing invalid value on purpose
    expect(() => new Zipper().encodeNumber(undefined)).toThrow();
  });

  it("should throw if input is negative, `NaN` or  `Infinity`", () => {
    expect(() => new Zipper().encodeNumber(-0xffffffff, 8)).toThrow();
    expect(() => new Zipper().encodeNumber(NaN, 8)).toThrow();
    expect(() => new Zipper().encodeNumber(Infinity, 8)).toThrow();
  });

  it("should only encode numbers up to `Number.MAX_SAFE_INTEGER`", () => {
    expect(new Zipper().encodeNumber(Number.MAX_SAFE_INTEGER, 8)).toStrictEqual(
      new Uint8Array([255, 255, 255, 255, 255, 255, 31, 0]),
    );
    expect(() =>
      new Zipper().encodeNumber(Number.MAX_SAFE_INTEGER + 1, 8),
    ).toThrow();
  });
});

describe("MS DOS Datetime encoding", () => {
  /** Generated using `.\DosDateTimeUtil.exe 2025 10 9 14 37 54` */
  const DOS_2025_10_09__14_37_54 = 0x5b4974bb;
  /** Generated using `.\DosDateTimeUtil.exe 2025 10 9 14 37 56` */
  const DOS_2025_10_09__14_37_56 = 0x5b4974bc;

  it("should correctly encode `Date` objects", () => {
    const dosTimestamp = new Zipper().dateToDOSTime(
      new Date(2025, 10, 9, 14, 37, 54, 644),
    );
    expect(dosTimestamp).toBe(DOS_2025_10_09__14_37_56);
  });

  it("should round up second values to the next full *even* number", () => {
    const zipper = new Zipper();
    const date = new Date(2025, 10, 9, 14, 37, 54, 0);

    expect(zipper.dateToDOSTime(date)).toBe(DOS_2025_10_09__14_37_54);
    date.setMilliseconds(400);
    expect(zipper.dateToDOSTime(date)).toBe(DOS_2025_10_09__14_37_56);
    date.setMilliseconds(800);
    expect(zipper.dateToDOSTime(date)).toBe(DOS_2025_10_09__14_37_56);
    date.setSeconds(55);
    date.setMilliseconds(0);
    expect(zipper.dateToDOSTime(date)).toBe(DOS_2025_10_09__14_37_56);
    date.setMilliseconds(400);
    expect(zipper.dateToDOSTime(date)).toBe(DOS_2025_10_09__14_37_56);
    date.setMilliseconds(800);
    expect(zipper.dateToDOSTime(date)).toBe(DOS_2025_10_09__14_37_56);
  });

  it("should throw if input is not of type `Date`", () => {
    // @ts-expect-error passing invalid value on purpose
    expect(() => new Zipper().dateToDOSTime("some date")).toThrow();
  });

  it("should throw if input timestamp is before 1/1/1980", () => {
    expect(() => new Zipper().dateToDOSTime(new Date(1979, 11, 31))).toThrow();
  });

  it("should throw if input timestamp is after 12/31/2107", () => {
    expect(() => new Zipper().dateToDOSTime(new Date(2108, 0, 1))).toThrow();
  });
});
