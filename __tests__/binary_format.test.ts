import { describe, expect, it } from "vitest";
import {
  decodeBitFlags,
  encodeBitFlags,
} from "./utils/binary/constants/bitflags.js";
import {
  FEATURES_VERSION,
  ZIP_VERSION,
} from "./utils/binary/constants/versions.js";
import {
  CentralDirectoryHeader,
  DataDescriptor,
  EndOfCentralDirectory,
  ExtraField,
  LocalFileHeader,
  Zip64EndOfCentralDirectory,
  Zip64EndOfCentralDirectoryLocator,
  Zip64ExtraField,
} from "./utils/binary/index.js";
import { DIR, FILE, LARGE_FILE } from "./utils/test_data.js";

import type { ZipFileStream } from "../src/index.js";
import Zipper from "../src/index.js";

describe("Binary Format", () => {
  describe("Local File Header", () => {
    it("should generate correct header structure for basic file", () => {
      const zipper = new Zipper();

      const headerBuffer = zipper.generateLocalFileHeader(FILE, FILE.crc);
      const header = new LocalFileHeader(headerBuffer.buffer);

      // Verify every field in the header
      expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(header.versionNeeded).toBe(ZIP_VERSION.V2_0); // Base version
      expect(Object.values(decodeBitFlags(header.flags))).not.toContain(true); // No flags set for basic storage
      expect(header.compression).toBe(0x0000); // No compression

      expect(header.lastModifiedTime).toBe(0x6000);
      expect(header.lastModifiedDate).toBe(0x5821);
      expect(header.crc32).toBe(FILE.crc);
      expect(header.compressedSize).toBe(FILE.size);
      expect(header.uncompressedSize).toBe(FILE.size);
      expect(header.filenameLength).toBe(FILE.name.length); // "test.txt".length
      expect(header.filename).toBe(FILE.name);
      expect(header.extraFieldLength).toBe(0); // No extra fields for basic file
      expect(header.byteLength).toBe(
        LocalFileHeader.SIZE + FILE.name.length + 0,
      );
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
      expect(decodeBitFlags(header.flags).DATA_DESCRIPTOR).toBe(true); // Flag set for data descriptor
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
      const decodedFlags = decodeBitFlags(header.flags);
      expect(decodedFlags.UTF8).toBe(true);
      // "test.txt" = 8 + "´" = 1 or "tst.txt" = 7 + "é" = 2
      expect(header.filenameLength).toBe(9);
      expect(header.filename).toBe("tést.txt");
    });

    it("should handle directory entries with correct attributes", () => {
      const zipper = new Zipper();

      const headerBuffer = zipper.generateLocalFileHeader(DIR);
      const header = new LocalFileHeader(headerBuffer.buffer);

      expect(header.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(header.compressedSize).toBe(0);
      expect(header.uncompressedSize).toBe(0);

      expect(header.versionNeeded).toBe(FEATURES_VERSION.DIRS);

      expect(header.filename).toBe("test-dir/");
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
      expect(zip64Field!.compressedSize).toBe(BigInt(largeFile.size));
      expect(zip64Field!.uncompressedSize).toBe(BigInt(largeFile.size));
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
      expect(header.compressedSize).toBe(BigInt(0xffffffff + 0xff));
      expect(header.uncompressedSize).toBe(BigInt(0xffffffff + 0xff));
    });
  });

  describe("Central Directory Header", () => {
    it("should generate correct central directory entry for files", () => {
      const zipper = new Zipper();

      const fakeRelativeOffset = 0x1234;
      const headerBuffer = zipper.generateCentralDirectoryHeader(
        { ...FILE, size: undefined },
        fakeRelativeOffset,
        FILE.crc,
      );
      const header = new CentralDirectoryHeader(headerBuffer.buffer);

      // Verify every field in the central directory entry
      expect(header.signature).toBe(CentralDirectoryHeader.SIGNATURE);
      expect(header.versionNeeded).toBe(ZIP_VERSION.V2_0); // Base version
      expect(header.flags).toBe(0x0000);
      expect(header.compression).toBe(0x0000);
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
      expect(header.localHeaderOffset).toBe(fakeRelativeOffset);
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
      const header = new CentralDirectoryHeader(headerBuffer.buffer);

      // Check ZIP64 version and markers
      expect(header.versionNeeded).toBe(FEATURES_VERSION.ZIP64); // ZIP64 version
      expect(header.compressedSize).toBe(0xffffffff);
      expect(header.uncompressedSize).toBe(0xffffffff);

      const zip64Field = header.extraFields.find(ExtraField.isZip64);
      expect(zip64Field).toBeDefined();
      expect(zip64Field!.dataSize).toBe(Zip64ExtraField.DATA_SIZE_CDH);
      expect(zip64Field!.compressedSize).toBe(BigInt(LARGE_FILE.size));
      expect(zip64Field!.uncompressedSize).toBe(BigInt(LARGE_FILE.size));
      expect(zip64Field!.diskStartNumber).toBe(0);
      expect(zip64Field!.relativeHeaderOffset).toBe(0n);
    });

    it("should handle UTF-8 filenames correctly", () => {
      const zipper = new Zipper();

      const file = { ...FILE, name: "tést.txt", size: undefined };

      const headerBuffer = zipper.generateCentralDirectoryHeader(file, 0, 0);
      const header = new CentralDirectoryHeader(headerBuffer.buffer);

      expect(header.signature).toBe(CentralDirectoryHeader.SIGNATURE);
      const decodedFlags = decodeBitFlags(header.flags);
      expect(decodedFlags.UTF8).toBe(true);
      // "test.txt" = 8 + "´" = 1 or "tst.txt" = 7 + "é" = 2
      expect(header.filenameLength).toBe(9);
      expect(header.filename).toBe("tést.txt");
    });
  });

  describe("ZIP64 End of Central Directory Record", () => {
    it("should generate correct ZIP64 EOCD Record structure", () => {
      const zipper = new Zipper();

      const zip64RecordBuffer = zipper.generateZip64EndOfCentralDirectoryRecord(
        5,
        1000,
        2000,
      );
      const zip64Record = new Zip64EndOfCentralDirectory(
        zip64RecordBuffer.buffer,
      );

      expect(zip64Record.signature).toBe(Zip64EndOfCentralDirectory.SIGNATURE);
      expect(Number(zip64Record.recordSize)).toBe(44); // Size of ZIP64 EOCD record
      expect(zip64Record.versionNeeded).toBe(45); // ZIP64 version
    });
  });

  describe("ZIP64 End of Central Directory Locator", () => {
    it("should generate correct ZIP64 EOCD Locator structure", () => {
      const zipper = new Zipper();

      const locatorBuffer = zipper.generateZip64EndOfCentralDirectoryLocator(
        2000,
        1000,
      );
      const locator = new Zip64EndOfCentralDirectoryLocator(
        locatorBuffer.buffer,
      );

      expect(locator.signature).toBe(
        Zip64EndOfCentralDirectoryLocator.SIGNATURE,
      );
      expect(locator.zip64EOCDRDisk).toBe(0); // Disk number
      expect(locator.zip64EOCDROffset).toBe(3000n); // Disk number
      expect(locator.totalDisks).toBe(1);
    });
  });

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
      const record = new EndOfCentralDirectory(recordBuffer.buffer);

      expect(record.signature).toBe(EndOfCentralDirectory.SIGNATURE);
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

  describe("BitFlags", () => {
    it("should encode single flags correctly", () => {
      expect(encodeBitFlags({ UTF8: true })).toEqual([0x00, 0x08]);
      expect(encodeBitFlags({ DATA_DESCRIPTOR: true })).toEqual([0x08, 0x00]);
    });

    it("should encode multiple flags correctly", () => {
      expect(
        encodeBitFlags({
          UTF8: true,
          DATA_DESCRIPTOR: true,
        }),
      ).toEqual([0x08, 0x08]);
    });

    it("should decode flags bytes correctly", () => {
      const flags = decodeBitFlags([0x08, 0x08]);
      expect(flags.UTF8).toBe(true);
      expect(flags.DATA_DESCRIPTOR).toBe(true);
      expect(flags.ENCRYPTED).toBe(false);
    });

    it("should decode flags numbers correctly", () => {
      const flags = decodeBitFlags(0x0808);
      expect(flags.UTF8).toBe(true);
      expect(flags.DATA_DESCRIPTOR).toBe(true);
      expect(flags.ENCRYPTED).toBe(false);
    });
  });
});
