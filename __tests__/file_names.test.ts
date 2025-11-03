import { describe, expect, it } from "vitest";
import Zipper from "../src/index.js";
import { LocalFileHeader } from "./utils/binary/LocalFileHeader.js";
import { decodeBitFlags } from "./utils/binary/constants/bitflags.js";
import { collectChunks, concatUint8Arrays } from "./utils/test_utils.js";

describe("Path Handling", () => {
  describe("Basic Path Validation", () => {
    it.each([
      ["simple.txt", "simple filename"],
      ["file with spaces.txt", "spaces in filename"],
      ["file_with_!@#$%^&()_.txt", "special characters"],
      ["files/with/forward/slashes.txt", "forward slashes"],
    ])("should handle ASCII paths with %s (%s)", async (name, _description) => {
      const zipper = new Zipper();

      zipper.add({ name }, new Uint8Array([1]));
      const data = await collectChunks(zipper.stream()).then(concatUint8Arrays);
      const lfh = new LocalFileHeader(data.buffer);
      expect(lfh.filename).toBe(name);
    });

    it.each([
      ["测试.txt", "Chinese characters"],
      ["παράδειγμα.txt", "Greek characters"],
      ["©®℗™℉℃−⌊⌋⌉⌈⁅⁆⁇⁈⁉⁊⁋⁌⁍⁎⁏⁐⁑⁒⁓⁔⁕⁖⁗⁘⁙⁚⁛⁜⁝⁞ .txt", "copyright symbols"],
      ["🎉emoji🎊.txt", "emoji characters"],
    ])(
      "should handle Unicode paths with %s (%s)",
      async (name, _description) => {
        const zipper = new Zipper();

        zipper.add({ name }, new Uint8Array([1]));
        const data = await collectChunks(zipper.stream()).then(
          concatUint8Arrays,
        );
        const lfh = new LocalFileHeader(data.buffer);
        expect(lfh.filename).toBe(name);
        const bitFlags = decodeBitFlags(lfh.flags);
        expect(bitFlags.UTF8).toBe(true);
      },
    );

    it("should handle maximum allowed path length", () => {
      const zipper = new Zipper();

      const longPath = "a".repeat(65535);
      expect(() =>
        zipper.add({ name: longPath }, new Uint8Array([1])),
      ).not.toThrow();

      const tooLongPath = longPath + ".txt";
      expect(() =>
        zipper.add({ name: tooLongPath }, new Uint8Array([1])),
      ).toThrow();
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
    ])("should reject %s (%s)", (name, _description) => {
      const zipper = new Zipper();

      expect(() => zipper.add({ name }, new Uint8Array([1]))).toThrow();
    });

    it("should handle duplicate paths", () => {
      const zipper = new Zipper();

      zipper.add({ name: "test.txt" }, new Uint8Array([1]));
      expect(() =>
        zipper.add({ name: "test.txt" }, new Uint8Array([2])),
      ).toThrow();
    });
  });

  it("should prevent path traversal", () => {
    const zipper = new Zipper();

    expect(() =>
      zipper.add({ name: "../test.txt" }, new Uint8Array([1])),
    ).toThrow();
    expect(() =>
      zipper.add({ name: "folder/../test.txt" }, new Uint8Array([1])),
    ).toThrow();
  });
});
