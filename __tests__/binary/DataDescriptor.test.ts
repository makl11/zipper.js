import { describe, expect, it } from "vitest";

import { FILE } from "../utils/test_data.js";

import Zipper from "../../src/index.js";
import { DataDescriptor } from "./DataDescriptor.js";

describe("Data Descriptor", () => {
  it("should generate correct data descriptor for streamed files", () => {
    const zipper = new Zipper();

    const headerBuffer = zipper.generateDataDescriptor(FILE.crc, FILE.size);
    const header = new DataDescriptor(headerBuffer.buffer);

    // Verify every field in the central directory entry
    expect(header.signature).toBe(DataDescriptor.SIGNATURE);
    expect(header.byteLength).toBe(DataDescriptor.SIZE);
    expect(header.crc32).toBe(FILE.crc);
    expect(header.compressedSize).toBe(FILE.size);
    expect(header.uncompressedSize).toBe(FILE.size);
  });

  it("should generate correct ZIP64 data descriptor for streamed files larger than 4GB", () => {
    const zipper = new Zipper();

    const headerBuffer = zipper.generateDataDescriptor(
      FILE.crc,
      0xffffffff + 0xff,
    );
    const header = new DataDescriptor(headerBuffer.buffer, 0, true);

    // Verify every field in the central directory entry
    expect(header.signature).toBe(DataDescriptor.SIGNATURE);
    expect(header.byteLength).toBe(DataDescriptor.SIZE_ZIP64);
    expect(header.crc32).toBe(FILE.crc);
    expect(header.compressedSize).toBe(0xffffffff + 0xff);
    expect(header.uncompressedSize).toBe(0xffffffff + 0xff);
  });
});
