import { describe, expect, it } from "vitest";

import Zipper from "../../src/index.js";
import { EndOfCentralDirectoryRecord } from "./EndOfCentralDirectoryRecord.js";

describe("End of Central Directory", () => {
  it("should generate correct EOCD structure", () => {
    const zipper = new Zipper();

    const totalEntries = 5;
    const centralDirSize = 500;
    const centralDirOffset = 1000;

    // Add some entries to the queue
    for (let i = 0; i < totalEntries; i++) {
      zipper.queue.push({
        _type: "file",
        name: `file${i}.txt`,
        data: new Uint8Array(1),
        size: 1,
      });
    }

    const recordBuffer = zipper.generateEndOfCentralDirectoryRecord(
      totalEntries,
      centralDirOffset,
      centralDirSize,
    );
    const record = new EndOfCentralDirectoryRecord(recordBuffer.buffer);

    expect(record.signature).toBe(EndOfCentralDirectoryRecord.SIGNATURE);
    expect(record.diskNumber).toBe(0);
    expect(record.centralDirectoryDisk).toBe(0);
    expect(record.entriesOnDisk).toBe(totalEntries);
    expect(record.totalEntries).toBe(totalEntries);
    expect(record.centralDirectorySize).toBe(centralDirSize);
    expect(record.centralDirectoryOffset).toBe(centralDirOffset);
    expect(record.commentLength).toBe(0);
    expect(record.comment).toBe("");
  });
});
