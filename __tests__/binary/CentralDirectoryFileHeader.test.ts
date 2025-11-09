import { describe, expect, it } from "vitest";

import { FEATURES_VERSION } from "./constants/versions";

import { FILE, LARGE_FILE } from "../utils/test_data";

import Zipper from "../../src/index";
import { CentralDirectoryFileHeader } from "./CentralDirectoryFileHeader";
import { COMPRESSION } from "./constants/compression";
import { Zip64ExtraField } from "./ExtraField/Zip64ExtraField";

describe("Central Directory File Header", () => {
  it("should generate correct central directory entry for files", () => {
    const zipper = new Zipper();

    const fakeRelativeOffset = 0x1234;
    const headerBuffer = zipper.generateCentralDirectoryHeader(
      { ...FILE, size: undefined },
      fakeRelativeOffset,
      FILE.crc,
    );
    const header = new CentralDirectoryFileHeader(headerBuffer.buffer);

    // Verify every field in the central directory entry
    expect(header.signature).toBe(CentralDirectoryFileHeader.SIGNATURE);
    expect(header.versionNeeded).toBe(FEATURES_VERSION.BASE); // Base version
    expect(Object.values(header.flags)).not.toContain(true); // No flags set for basic storage
    expect(header.compression).toBe(COMPRESSION.STORE);
    expect(header.lastModifiedTime).toBe(0x6000); // 12:00:00
    expect(header.lastModifiedDate).toBe(0x5821); // 2024-01-01
    expect(header.crc32).toBe(FILE.crc);
    expect(header.compressedSize).toBe(FILE.size);
    expect(header.uncompressedSize).toBe(FILE.size);
    expect(header.filenameLength).toBe(FILE.name.length);
    expect(header.extraFieldLength).toBe(0);
    expect(header.commentLength).toBe(0);
    expect(header.diskNumberStart).toBe(0);
    expect(header.internalAttributes).toBe(0);
    const dosAttributes = header.externalAttributes & 0xff;
    const unixPermissions = (header.externalAttributes >> 16) & 0o777;
    expect(dosAttributes & 0x20).toBe(0x20); // Archive flag
    expect(unixPermissions).toBe(0o644); // rw-r--r--
    expect(header.localFileHeaderOffset).toBe(fakeRelativeOffset);
    expect(header.filename).toBe(FILE.name);
    expect(header.comment).toBe("");
    expect(header.extraFields).toStrictEqual([]);
  });

  it("should handle ZIP64 when needed", () => {
    const zipper = new Zipper();

    const headerBuffer = zipper.generateCentralDirectoryHeader(
      { ...LARGE_FILE, size: undefined },
      0,
      0,
    );
    const header = new CentralDirectoryFileHeader(headerBuffer.buffer);

    // Check ZIP64 version and markers
    expect(header.versionNeeded).toBe(FEATURES_VERSION.ZIP64); // ZIP64 version
    expect(header.compressedSize).toBe(0xffffffff);
    expect(header.uncompressedSize).toBe(0xffffffff);

    const zip64Field = header.extraFields
      .find((f) => f.is(Zip64ExtraField))
      ?.as(Zip64ExtraField);
    expect(zip64Field).toBeDefined();
    expect(zip64Field!.dataSize).toBe(Zip64ExtraField.DATA_SIZE_CDH);
    expect(zip64Field!.compressedSize).toBe(LARGE_FILE.size);
    expect(zip64Field!.uncompressedSize).toBe(LARGE_FILE.size);
    expect(zip64Field!.diskStartNumber).toBe(0);
    expect(zip64Field!.relativeHeaderOffset).toBe(0);
  });

  it("should handle UTF-8 filenames correctly", () => {
    const zipper = new Zipper();

    const file = { ...FILE, name: "tést.txt", size: undefined };

    const headerBuffer = zipper.generateCentralDirectoryHeader(file, 0, 0);
    const header = new CentralDirectoryFileHeader(headerBuffer.buffer);

    expect(header.signature).toBe(CentralDirectoryFileHeader.SIGNATURE);
    expect(header.flags.UTF8).toBe(true);
    // "test.txt" = 8 + "´" = 1 or "tst.txt" = 7 + "é" = 2
    expect(header.filenameLength).toBe(9);
    expect(header.filename).toBe("tést.txt");
  });
});
