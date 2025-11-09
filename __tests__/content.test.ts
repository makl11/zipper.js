import { describe, expect, it } from "vitest";
import Zipper from "../src/index.js";
import { FEATURES_VERSION, ZIP_VERSION } from "./binary/constants/versions.js";
import {
  CentralDirectoryFileHeader,
  DataDescriptor,
  EndOfCentralDirectoryRecord,
  LocalFileHeader,
  Zip64EndOfCentralDirectoryLocator,
  Zip64EndOfCentralDirectoryRecord,
} from "./binary/index.js";
import { DIR, FILE, LARGE_FILE } from "./utils/test_data.js";
import { collectChunks, concatUint8Arrays } from "./utils/test_utils.js";

describe("File Content", () => {
  describe("Content Types", () => {
    it("should handle empty files", async () => {
      const zipper = new Zipper();

      expect(() => zipper.add(FILE, new Uint8Array(0))).not.toThrow();

      const streamPromise = collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );
      await expect(streamPromise).resolves.not.toThrow();
      const stream = await streamPromise;

      const lfh = new LocalFileHeader(stream.buffer);
      expect(lfh.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(lfh.uncompressedSize).toBe(0);
      expect(lfh.compressedSize).toBe(0);
      expect(lfh.crc32).toBe(0);

      // There should be no data between the local file header and the central directory header

      const cdh = new CentralDirectoryFileHeader(stream.buffer, lfh.byteLength);
      expect(cdh.signature).toBe(CentralDirectoryFileHeader.SIGNATURE);
      expect(cdh.uncompressedSize).toBe(0);
      expect(cdh.compressedSize).toBe(0);
      expect(cdh.crc32).toBe(0);
    });

    it("should handle Uint8Array content", async () => {
      const zipper = new Zipper();

      expect(() => zipper.add(FILE, FILE.data)).not.toThrow();

      const streamPromise = collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );
      await expect(streamPromise).resolves.not.toThrow();
      const stream = await streamPromise;

      const lfh = new LocalFileHeader(stream.buffer);
      expect(lfh.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(lfh.uncompressedSize).toBe(FILE.size);
      expect(lfh.compressedSize).toBe(FILE.size);
      expect(lfh.crc32).toBe(FILE.crc);

      const data = new DataView(stream.buffer, lfh.byteLength);
      expect(data.getUint8(0)).toBe(65);
      expect(data.getUint8(FILE.size - 1)).toBe(65);
      expect(data.getUint8(FILE.size)).not.toBe(65);

      const cdh = new CentralDirectoryFileHeader(
        stream.buffer,
        lfh.byteLength + FILE.size,
      );
      expect(cdh.signature).toBe(CentralDirectoryFileHeader.SIGNATURE);
      expect(cdh.uncompressedSize).toBe(FILE.size);
      expect(cdh.compressedSize).toBe(FILE.size);
      expect(cdh.crc32).toBe(FILE.crc);
    });

    it("should handle ReadableStream content", async () => {
      const zipper = new Zipper();

      expect(() =>
        zipper.add(FILE, new Blob([FILE.data]).stream(), FILE.size),
      ).not.toThrow();

      const streamPromise = collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );
      await expect(streamPromise).resolves.not.toThrow();
      const stream = await streamPromise;

      const lfh = new LocalFileHeader(stream.buffer);
      expect(lfh.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(lfh.uncompressedSize).toBe(0);
      expect(lfh.compressedSize).toBe(0);
      expect(lfh.crc32).toBe(0);

      const data = new DataView(stream.buffer, lfh.byteLength);
      expect(data.getUint8(0)).toBe(65);
      expect(data.getUint8(FILE.size - 1)).toBe(65);
      expect(data.getUint8(FILE.size)).not.toBe(65);

      const dd = new DataDescriptor(
        stream.buffer,
        data.byteOffset + data.byteLength,
      );

      expect(dd.signature).toBe(DataDescriptor.SIGNATURE);
      expect(dd.compressedSize).toBe(FILE.size);
      expect(dd.uncompressedSize).toBe(FILE.size);
      expect(dd.crc32).toBe(FILE.crc);
    });

    it("should handle empty ReadableStream content", async () => {
      const zipper = new Zipper();

      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });

      zipper.add(FILE, sourceStream, 0);

      const stream = await collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );

      const lfh = new LocalFileHeader(stream.buffer);
      expect(lfh.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(lfh.uncompressedSize).toBe(0);
      expect(lfh.compressedSize).toBe(0);
      expect(lfh.crc32).toBe(0);

      // There should be no data between the local file header and the data descriptor

      const dd = new DataDescriptor(stream.buffer, lfh.byteLength);
      expect(dd.signature).toBe(DataDescriptor.SIGNATURE);
      expect(dd.compressedSize).toBe(0);
      expect(dd.uncompressedSize).toBe(0);
      expect(dd.crc32).toBe(0);
    });
  });

  describe("Error Cases", () => {
    it("should reject invalid entry data", () => {
      const zipper = new Zipper();

      expect(() =>
        zipper.add(FILE, "invalid data" as unknown as Uint8Array),
      ).toThrow(/Uint8Array or ReadableStream/i);
      expect(() => zipper.add(FILE, 1 as unknown as Uint8Array)).toThrow(
        /Uint8Array or ReadableStream/i,
      );
      expect(() => zipper.add(FILE, false as unknown as Uint8Array)).toThrow(
        /Uint8Array or ReadableStream/i,
      );
    });

    it("should handle malformed Uint8Array views", () => {
      const zipper = new Zipper();

      const buffer = new ArrayBuffer(100);
      const view1 = new Uint8Array(buffer, 0, 50);
      const view2 = new Uint8Array(buffer, 50, 50);

      expect(() => zipper.add(FILE, view1)).not.toThrow();
      // The views share an underlying buffer, so after adding the first file,
      // the buffer will be detached while generating the zip and cannot be reused.
      expect(() =>
        zipper.add({ ...FILE, name: FILE.name + "2" }, view2),
      ).toThrow(/buffer/i);
    });

    it("should reject new entries when zip file is already being generated", () => {
      const zipper = new Zipper();

      expect(() => zipper.add(DIR)).not.toThrow();
      zipper.stream();
      expect(() => zipper.add({ ...DIR, name: "2" + DIR.name })).toThrow();
    });

    it("should abort zip generator when a stream has more data than it should", async () => {
      const zipper = new Zipper();

      zipper.add(FILE, new Blob([FILE.data]).stream(), FILE.size / 2);
      await expect(collectChunks(zipper.stream(), true)).rejects.toThrow(
        /size missmatch/i,
      );
    });
  });

  describe("ZIP64 Thresholds", { timeout: 120_000, sequential: true }, () => {
    it("should switch to ZIP64 for files larger than 4GB", async () => {
      const zipper = new Zipper();

      zipper.add({ ...LARGE_FILE }, LARGE_FILE.data);

      const stream = await collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );

      const lfh = new LocalFileHeader(stream.buffer);
      expect(lfh.signature).toBe(LocalFileHeader.SIGNATURE);
      expect(lfh.versionNeeded).toBe(FEATURES_VERSION.ZIP64);

      const data = new DataView(stream.buffer, lfh.byteLength);
      expect(data.getUint8(0)).toBe(65);
      expect(data.getUint8(LARGE_FILE.size - 1)).toBe(65);
      expect(data.getUint8(LARGE_FILE.size)).not.toBe(65);

      const cdh = new CentralDirectoryFileHeader(
        stream.buffer,
        data.byteOffset + LARGE_FILE.size,
      );
      expect(cdh.signature).toBe(CentralDirectoryFileHeader.SIGNATURE);
    });

    it("should handle streamed content larger than 4GB with ZIP64", async () => {
      const zipper = new Zipper();

      zipper.add(
        LARGE_FILE,
        new Blob([LARGE_FILE.data]).stream(),
        LARGE_FILE.size,
      );

      const stream = await collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );

      const lfh = new LocalFileHeader(stream.buffer);
      expect(lfh.versionNeeded).toBe(FEATURES_VERSION.ZIP64);

      const data = new DataView(stream.buffer, lfh.byteLength);
      expect(data.getUint8(0)).toBe(65);
      expect(data.getUint8(LARGE_FILE.size - 1)).toBe(65);
      expect(data.getUint8(LARGE_FILE.size)).not.toBe(65);

      const dd = new DataDescriptor(
        stream.buffer,
        data.byteOffset + LARGE_FILE.size,
      );

      expect(dd.signature).toBe(DataDescriptor.SIGNATURE);
    });

    it("should handle exactly 65535 files", async () => {
      const zipper = new Zipper();

      const fileCount = 65535;
      for (let i = 0; i < fileCount; i++) {
        zipper.add({ name: `file${i}.txt` }, new Uint8Array([65]));
      }

      const stream = await collectChunks(zipper.stream()).then(
        concatUint8Arrays,
      );

      const lfhOffsets: number[] = [];

      let offset = 0;
      for (let i = 0; i < fileCount; i++) {
        lfhOffsets.push(offset);
        const lfh = new LocalFileHeader(stream.buffer, offset);
        expect(lfh.signature).toBe(LocalFileHeader.SIGNATURE);
        expect(lfh.versionNeeded).toBe(ZIP_VERSION.V2_0);
        expect(lfh.filename).toBe(`file${i}.txt`);
        expect(lfh.extraFieldLength).toBe(0); // Expect no ZIP64ExtraField in LFH
        offset += lfh.byteLength;

        const data = new DataView(stream.buffer, offset);
        expect(data.getUint8(0), `file${i}.txt`).toBe(65);
        expect(data.getUint8(1), `file${i}.txt`).not.toBe(65);
        offset += 1;
      }

      for (let i = 0; i < fileCount; i++) {
        const cdh = new CentralDirectoryFileHeader(stream.buffer, offset);
        expect(cdh.signature).toBe(CentralDirectoryFileHeader.SIGNATURE);
        expect(cdh.versionNeeded).toBe(ZIP_VERSION.V2_0);
        expect(cdh.filename).toBe(`file${i}.txt`);
        expect(cdh.localFileHeaderOffset).toBe(lfhOffsets[i]);
        expect(cdh.extraFieldLength).toBe(0); // Expect no ZIP64ExtraField in LFH
        offset += cdh.byteLength;
      }

      let eocd: EndOfCentralDirectoryRecord;
      expect(() => {
        eocd = EndOfCentralDirectoryRecord.find(stream.buffer);
      }).not.toThrow();
      expect(eocd!.signature).toBe(EndOfCentralDirectoryRecord.SIGNATURE);
      expect(eocd!.entriesOnDisk).toBe(0xffff);
      expect(eocd!.totalEntries).toBe(0xffff);
      expect(eocd!.centralDirectorySize).toBe(0xffffffff);
      expect(eocd!.centralDirectoryOffset).toBe(0xffffffff);

      const eocd64Locator = new Zip64EndOfCentralDirectoryLocator(
        stream.buffer,
        eocd!.byteOffset - Zip64EndOfCentralDirectoryLocator.SIZE,
      );
      expect(eocd64Locator.signature).toBe(
        Zip64EndOfCentralDirectoryLocator.SIGNATURE,
      );
      expect(eocd64Locator.eocd64Disk).toBe(0);
      expect(eocd64Locator.totalDisks).toBe(1);

      const eocd64 = new Zip64EndOfCentralDirectoryRecord(
        stream.buffer,
        Number(eocd64Locator.eocd64Offset),
      );
      expect(eocd64.signature).toBe(Zip64EndOfCentralDirectoryRecord.SIGNATURE);
      expect(eocd64.entriesOnDisk).toBe(fileCount);
      expect(eocd64.totalEntries).toBe(fileCount);
    });
  });
});
