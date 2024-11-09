import { beforeEach, describe, expect, it } from "vitest";
import { collectChunks, concatUint8Arrays } from "./utils/test_utils.js";
import { LocalFileHeader } from "./utils/binary/LocalFileHeader.js";
import { decodeBitFlags } from "./utils/binary/constants/bitflags.js";
import { EndOfCentralDirectory } from "./utils/binary/EndOfCentralDirectory.js";
import { CentralDirectoryHeader } from "./utils/binary/CentralDirectoryHeader.js";

import Zipper from "../index.js";

describe("Path Handling", () => {
  let zipper: Zipper;

  beforeEach(() => {
    zipper = new Zipper();
  });

  // Core functionality
  describe("Basic Path Validation", () => {
    it.each([
      ["simple.txt", "simple filename"],
      ["file with spaces.txt", "spaces in filename"],
      ["file_with_!@#$%^&()_.txt", "special characters"],
      ["files/with/forward/slashes.txt", "forward slashes"],
    ])("should handle ASCII paths with %s (%s)", async (path, description) => {
      zipper.add({ name: path, data: new Uint8Array([1]), size: 1, lastModified: new Date() });

      const data = await collectChunks(zipper.stream()).then(concatUint8Arrays);
      const lfh = new LocalFileHeader(data.buffer);
      expect(lfh.filename).toBe(path);
    });

    it.each([
      ["测试.txt", "Chinese characters"],
      ["παράδειγμα.txt", "Greek characters"],
      ["©®℗™℉℃−⌊⌋⌉⌈⁅⁆⁇⁈⁉⁊⁋⁌⁍⁎⁏⁐⁑⁒⁓⁔⁕⁖⁗⁘⁙⁚⁛⁜⁝⁞ .txt", "copyright symbols"],
      ["🎉emoji🎊.txt", "emoji characters"],
    ])(
      "should handle Unicode paths with %s (%s)",
      async (path, description) => {
        zipper.add({ name: path, data: new Uint8Array([1]), size: 1, lastModified: new Date() });

        const data = await collectChunks(zipper.stream()).then(
          concatUint8Arrays,
        );
        const lfh = new LocalFileHeader(data.buffer);
        expect(lfh.filename).toBe(path);
        const bitFlags = decodeBitFlags(lfh.flags);
        expect(bitFlags.UTF8).toBe(true);
      },
    );

    it("should handle maximum allowed path length", () => {
      const longPath = "a".repeat(65535);
      expect(() => zipper.add({ name: longPath, data: new Uint8Array([1]), size: 1, lastModified: new Date() })).not.toThrow();

      const tooLongPath = longPath + ".txt";
      expect(() => zipper.add({ name: tooLongPath, data: new Uint8Array([1]), size: 1, lastModified: new Date() })).toThrow();
    });
  });

  // Error handling
  describe("Invalid Paths", () => {
    it.each([
      ["", "Empty string"],
      [".", "Current directory"],
      ["..", "Parent directory"],
      ["/absolute/path.txt", "Absolute path"],
      ["file\0hidden.txt", "Null byte"],
      ["file\x01name.txt", "Control character"],
      ["file:.txt", "Windows reserved character"],
      ["file*.txt", "Windows reserved character"],
      ["file?.txt", "Windows reserved character"],
      ["file<.txt", "Windows reserved character"],
      ["file>.txt", "Windows reserved character"],
      ["file|.txt", "Windows reserved character"],
      ["COM1", "Windows reserved name"],
      ["LPT1", "Windows reserved name"],
      ["PRN.txt", "Windows reserved name"],
      ["AUX.txt", "Windows reserved name"],
      ["NUL.txt", "Windows reserved name"],
    ])("should reject %s (%s)", (path, description) => {
      expect(() => zipper.add({ name: path, data: new Uint8Array([1]), size: 1, lastModified: new Date() }))
        .toThrow();
    });

    it("should handle duplicate paths", () => {
      zipper.add({ name: "test.txt", data: new Uint8Array([1]), size: 1, lastModified: new Date() });
      expect(() => zipper.add({ name: "test.txt", data: new Uint8Array([2]), size: 1, lastModified: new Date() }))
        .toThrow();
    });
  });

  it("should encode UTF-8 filenames correctly", () => {
    const entry = {
      name: "tést😂.txt",
      data: new Uint8Array(1),
      size: 1,
      lastModified: new Date(),
    };

    const headerBuffer = zipper.generateLocalFileHeader(entry);
    const header = new LocalFileHeader(headerBuffer.buffer);

    const encoder = new TextEncoder();
    const expectedBytes = encoder.encode(entry.name);
    expect(header.filenameLength).toBe(expectedBytes.length);
    expect(
      new Uint8Array(headerBuffer.buffer.slice(30, 30 + expectedBytes.length)),
    )
      .toEqual(expectedBytes);
  });

  it("should maintain case sensitivity", async () => {
    zipper.add({ name: "CamelCase.txt", data: new Uint8Array([1]), size: 1, lastModified: new Date() });
    zipper.add({ name: "camelcase.txt", data: new Uint8Array([2]), size: 1, lastModified: new Date() });

    const chunks = await collectChunks(zipper.stream());
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    const eocd = new EndOfCentralDirectory(
      chunks[0]!.buffer,
      chunks[0]!.byteLength - EndOfCentralDirectory.SIZE,
    );

    const cdh1 = new CentralDirectoryHeader(
      chunks[0]!.buffer,
      eocd.centralDirectoryOffset,
    );
    expect(cdh1.filename).toBe("CamelCase.txt");
    const cdh2 = new CentralDirectoryHeader(
      chunks[0]!.buffer,
      eocd.centralDirectoryOffset + cdh1.byteLength,
    );
    expect(cdh2.filename).toBe("camelcase.txt");
  });

  it("should prevent path traversal", () => {
    expect(() => zipper.add({ name: "../test.txt", data: new Uint8Array([1]), size: 1, lastModified: new Date() })).toThrow();
    expect(() => zipper.add({ name: "folder/../test.txt", data: new Uint8Array([1]), size: 1, lastModified: new Date() }))
      .toThrow();
  });
});
