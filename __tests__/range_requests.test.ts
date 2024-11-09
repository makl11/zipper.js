import { beforeEach, describe, expect, it } from "vitest";
import { collectChunks, concatUint8Arrays } from "./utils/test_utils.js";
import { FILE } from "./utils/test_data.js";

import Zipper from "../index.js";

describe.skip("HTTP Range Request Support", () => {
  let zipper: Zipper;

  beforeEach(() => {
    zipper = new Zipper();
  });

  // Core functionality
  describe("Basic Range Operations", () => {
    it("should support basic range requests", async () => {
      zipper.add(FILE);

      const stream = zipper.stream();
      const fullBuffer = await collectChunks(stream);

      const ranges = [
        { start: 0, end: 99 },
        { start: 100, end: 199 },
        { start: fullBuffer.length - 100, end: fullBuffer.length - 1 },
      ];

      for (const range of ranges) {
        const rangeStream = zipper.stream(range.start, range.end);
        const rangeBuffer = await collectChunks(rangeStream);
        expect(rangeBuffer).toEqual(
          fullBuffer.slice(range.start, range.end + 1),
        );
      }
    });

    it("should maintain consistent byte order across range requests", async () => {
      const content = new Uint8Array([
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x07,
        0x08,
      ]);
      zipper.add({ ...FILE, data: content, size: content.byteLength });

      const range1 = await collectChunks(zipper.stream(0, 3)).then(
        concatUint8Arrays,
      );
      const range2 = await collectChunks(zipper.stream(4, 7)).then(
        concatUint8Arrays,
      );

      const view1 = new DataView(range1.buffer);
      const view2 = new DataView(range2.buffer);

      expect(view1.getUint32(0, true)).toBe(0x04030201);
      expect(view2.getUint32(0, true)).toBe(0x08070605);
    });
  });

  // Edge cases
  describe("Boundary Conditions", () => {
    it("should handle range requests crossing file boundaries", async () => {
      zipper.add({ ...FILE, data: new Uint8Array(100).fill(65), size: 100 });
      zipper.add({ ...FILE, data: new Uint8Array(100).fill(66), size: 100 });

      const stream = zipper.stream();
      const fullBuffer = await collectChunks(stream);

      const rangeStream = zipper.stream(90, 110);
      const rangeBuffer = await collectChunks(rangeStream);

      expect(rangeBuffer).toEqual(fullBuffer.slice(90, 111));
    });

    it("should handle range requests spanning central directory", async () => {
      zipper.add({ ...FILE, data: new Uint8Array(100), size: 100 });
      const totalSize = zipper.predictSize();

      const rangeStream = zipper.stream(totalSize - 50, totalSize - 1);
      const rangeBuffer = await collectChunks(rangeStream);

      const stream = zipper.stream();
      const fullBuffer = await collectChunks(stream);

      expect(rangeBuffer).toEqual(fullBuffer.slice(totalSize - 50, totalSize));
    });

    it("should handle range requests at structure boundaries", async () => {
      zipper.add({ ...FILE, data: new Uint8Array(1000), size: 1000 });

      const totalSize = zipper.predictSize();
      const ranges = [
        { start: 0, end: 29 }, // Local header boundary
        { start: 30, end: 1029 }, // File data boundary
        { start: totalSize - 22, end: totalSize - 1 }, // End of central directory
      ];

      for (const range of ranges) {
        const rangeStream = zipper.stream(range.start, range.end);
        const rangeBuffer = await collectChunks(rangeStream);
        expect(rangeBuffer.length).toBe(range.end - range.start + 1);
      }
    });
  });

  // Error handling
  describe("Error Cases", () => {
    it("should validate range request parameters", () => {
      zipper.add({ ...FILE, data: new Uint8Array(100), size: 100 });
      const totalSize = zipper.predictSize();

      expect(() => zipper.stream(-1, 50)).toThrow();
      expect(() => zipper.stream(50, 40)).toThrow();
      expect(() => zipper.stream(0, totalSize + 1)).toThrow();
    });

    it("should handle aborted range requests", async () => {
      zipper.add({ ...FILE, data: new Uint8Array(1000), size: 1000 });

      const controller = new AbortController();
      const rangeStream = zipper.stream(0, 999, controller.signal);

      controller.abort();

      const reader = rangeStream.getReader();
      await expect(reader.read()).rejects.toThrow(/aborted/i);
    });
  });

  // Concurrent operations
  describe("Concurrency", () => {
    it("should support concurrent range requests", async () => {
      zipper.add({ ...FILE, data: new Uint8Array(1000), size: 1000 });

      const ranges = [
        { start: 0, end: 99 },
        { start: 200, end: 299 },
        { start: 400, end: 499 },
      ];

      const rangePromises = ranges.map((range) =>
        collectChunks(zipper.stream(range.start, range.end))
      );

      const rangeBuffers = await Promise.all(rangePromises);
      const fullBuffer = await collectChunks(zipper.stream());

      ranges.forEach((range, index) => {
        expect(rangeBuffers[index]).toEqual(
          fullBuffer.slice(range.start, range.end + 1),
        );
      });
    });

    it("should handle rapid creation and cancellation of range streams", async () => {
      zipper.add({ ...FILE, data: new Uint8Array(1000000), size: 1000000 });

      const streams: ReadableStream[] = [];
      const controllers: AbortController[] = [];

      for (let i = 0; i < 100; i++) {
        const controller = new AbortController();
        controllers.push(controller);
        streams.push(
          zipper.stream(i * 1000, (i + 1) * 1000 - 1, {
            signal: controller.signal,
          }),
        );
      }

      controllers.forEach((controller) => controller.abort());

      await Promise.all(streams.map((stream) => {
        const reader = stream.getReader();
        return expect(reader.closed).resolves.toBeUndefined();
      }));
    });
  });
});
