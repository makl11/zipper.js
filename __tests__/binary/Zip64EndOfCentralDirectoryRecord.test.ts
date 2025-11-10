import { describe, expect, it } from "vitest";

import Zipper from "../../src/index";
import { Zip64EndOfCentralDirectoryRecord } from "./Zip64EndOfCentralDirectoryRecord";

describe("ZIP64 End of Central Directory Record", () => {
  it("should generate correct ZIP64 EOCD Record structure", () => {
    const zipper = new Zipper();

    const zip64RecordBuffer = zipper.generateZip64EndOfCentralDirectoryRecord(
      5,
      1000,
      2000,
    );
    const zip64Record = new Zip64EndOfCentralDirectoryRecord(
      zip64RecordBuffer.buffer,
    );

    expect(zip64Record.signature).toBe(
      Zip64EndOfCentralDirectoryRecord.SIGNATURE,
    );
    expect(Number(zip64Record.recordSize)).toBe(44); // Size of ZIP64 EOCD record
    expect(zip64Record.versionNeeded).toBe(45); // ZIP64 version
  });
});
