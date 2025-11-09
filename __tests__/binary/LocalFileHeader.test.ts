import { describe, expect, it } from "vitest";

import { FEATURES_VERSION } from "./constants/versions.js";

import { DIR, FILE } from "../utils/test_data.js";

import type { ZipFileStream } from "../../src/index.js";
import Zipper from "../../src/index.js";

import { COMPRESSION } from "./constants/compression.js";
import { ExtraField, Zip64ExtraField } from "./ExtraField.js";
import { LocalFileHeader } from "./LocalFileHeader.js";

describe("Local File Header", () => {
  it("should generate correct header structure for basic file", () => {
    const zipper = new Zipper();

    const headerBuffer = zipper.generateLocalFileHeader(FILE, FILE.crc);
    const header = new LocalFileHeader(headerBuffer.buffer);

    // Verify every field in the header
    expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
    expect(header.versionNeeded).toBe(FEATURES_VERSION.BASE); // Base version
    expect(Object.values(header.flags)).not.toContain(true); // No flags set for basic storage
    expect(header.compression).toBe(COMPRESSION.STORE); // No compression

    expect(header.lastModifiedTime).toBe(0x6000);
    expect(header.lastModifiedDate).toBe(0x5821);
    expect(header.crc32).toBe(FILE.crc);
    expect(header.compressedSize).toBe(FILE.size);
    expect(header.uncompressedSize).toBe(FILE.size);
    expect(header.filenameLength).toBe(FILE.name.length); // "test.txt".length
    expect(header.extraFieldLength).toBe(0); // No extra fields for basic file
    expect(header.filename).toBe(FILE.name);
    expect(header.byteLength).toBe(LocalFileHeader.SIZE + FILE.name.length + 0);
  });

  it("should generate correct header structure for streamed file", () => {
    const zipper = new Zipper();

    const file = {
      ...FILE,
      data: new Blob([FILE.data]).stream(),
    } satisfies ZipFileStream;

    const headerBuffer = zipper.generateLocalFileHeader(file);
    const header = new LocalFileHeader(headerBuffer.buffer);

    expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
    expect(header.flags.DATA_DESCRIPTOR).toBe(true); // Flag set for data descriptor
    expect(header.crc32).toBe(0); // Located in Data Descriptor instead
    expect(header.compressedSize).toBe(0); // Located in Data Descriptor instead
    expect(header.uncompressedSize).toBe(0); // Located in Data Descriptor instead
  });

  it("should handle UTF-8 filenames correctly", () => {
    const zipper = new Zipper();

    const file = { ...FILE, path: "tést.txt" };

    const headerBuffer = zipper.generateLocalFileHeader(file);
    const header = new LocalFileHeader(headerBuffer.buffer);

    expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
    expect(header.flags.UTF8).toBe(true);
    // "test.txt" = 8 + "´" = 1 or "tst.txt" = 7 + "é" = 2
    expect(header.filenameLength).toBe(9);
    expect(header.filename).toBe(file.path);
  });

  it("should handle directory entries with correct attributes", () => {
    const zipper = new Zipper();

    const headerBuffer = zipper.generateLocalFileHeader(DIR);
    const header = new LocalFileHeader(headerBuffer.buffer);

    expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
    expect(header.compression).toBe(COMPRESSION.STORE);
    expect(header.compressedSize).toBe(0);
    expect(header.uncompressedSize).toBe(0);

    expect(header.versionNeeded).toBe(FEATURES_VERSION.DIRS);

    expect(header.filename).toBe(DIR.name);
  });

  it("should handle nested directory paths", () => {
    const zipper = new Zipper();

    const dir = { ...DIR, name: "parent/child/grandchild/" };

    const headerBuffer = zipper.generateLocalFileHeader(dir);
    const header = new LocalFileHeader(headerBuffer.buffer);

    expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
    expect(header.compressedSize).toBe(0);
    expect(header.uncompressedSize).toBe(0);

    expect(header.versionNeeded).toBe(FEATURES_VERSION.DIRS);

    expect(header.filename).toBe(dir.name);
  });

  it("should handle ZIP64 when needed", () => {
    // TODO: this test needs a rewrite. The zip64 extra field is more complicated than this
    const zipper = new Zipper();

    const largeFile = {
      ...FILE,
      size: 0xffffffff + 0xff,
    };

    const headerBuffer = zipper.generateLocalFileHeader(largeFile);
    const header = new LocalFileHeader(headerBuffer.buffer);

    expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
    expect(header.versionNeeded).toBe(FEATURES_VERSION.ZIP64);
    expect(header.extraFieldLength).toBe(
      ExtraField.SIZE + Zip64ExtraField.DATA_SIZE_LFH,
    );

    const zip64Field = header.extraFields.find(ExtraField.isZip64);
    expect(zip64Field).toBeDefined();
    expect(zip64Field!.dataSize).toBe(Zip64ExtraField.DATA_SIZE_LFH);
    expect(zip64Field!.compressedSize).toBe(largeFile.size);
    expect(zip64Field!.uncompressedSize).toBe(largeFile.size);
  });

  it("should handle DOS time field limits", () => {
    const zipper = new Zipper();

    // Should default to minimum DOS date (1980-01-01)
    const headerBuffer1 = zipper.generateLocalFileHeader({
      ...FILE,
      mTime: new Date(1970, 0, 1),
    });
    const header1 = new LocalFileHeader(headerBuffer1.buffer);
    expect(header1.lastModifiedDate).toBe(0x2100); // 1980-01-01
    expect(header1.lastModifiedTime).toBe(0x0000); // 00:00:00

    // Should cap at maximum DOS date (2107-12-31)
    const headerBuffer2 = zipper.generateLocalFileHeader({
      ...FILE,
      mTime: new Date(2108, 0, 1),
    });
    const header2 = new LocalFileHeader(headerBuffer2.buffer);
    expect(header2.lastModifiedDate).toBe(0xff9f); // 2107-12-31
    expect(header2.lastModifiedTime).toBe(0xbf7d); // 23:59:58
  });
});
