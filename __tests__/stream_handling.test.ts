import { beforeEach, describe, expect, it } from "vitest";
import { collectChunks } from "./utils/test_utils.js";
import { FILE } from "./utils/test_data.js";

import Zipper from "../index.js";

describe("Stream Handling", () => {
  let zipper: Zipper;

  beforeEach(() => {
    zipper = new Zipper();
  });

  // Core functionality
  describe("Basic Stream Operations", () => {
    it("should provide a valid ReadableStream", () => {
      const stream = zipper.stream();
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("should stream data in chunks", async () => {
      zipper.add(FILE);

      const stream = zipper.stream();
      const chunks = await collectChunks(stream);

      expect(chunks.length).toBeGreaterThanOrEqual(FILE.size / (64 * 1024)); // 64KB is default chunk size for node fs streams
    });

    it.fails("should stop zip generation when an abort signal is received", async () => {
      zipper.add(FILE);

      const controller = new AbortController()
      const stream = zipper.stream({ signal: controller.signal });
      setTimeout(() => controller.abort("User abort"), 100)
      await expect(collectChunks(stream)).rejects.toThrow(/user abort/i);

    })
  });

  // Error handling
  describe("Error Cases", () => {
    it("should handle output stream errors", async () => {
      const errorStream = new WritableStream({
        write() {
          throw new Error("Stream controller error");
        },
      });

      zipper.add(FILE);
      const stream = zipper.stream();

      await expect(stream.pipeTo(errorStream)).rejects.toThrow(
        "Stream controller error",
      );
    });

    it("should handle output stream controller abort", async () => {
      zipper.add(FILE);
      const stream = zipper.stream();

      const abortController = new AbortController();
      const promise = stream.pipeTo(
        new WritableStream({
          async write(chunk) {
            return new Promise((resolve) => setTimeout(resolve, 50));
          },
        }),
        { signal: abortController.signal },
      );
      setTimeout(() => abortController.abort("Aborted"), 50);
      await expect(promise).rejects.toThrow(/canceled/i);
    });

    it("should handle input stream errors", async () => {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.error(new Error("Stream error"));
        },
      });

      zipper.add({ ...FILE, data: errorStream });

      const stream = zipper.stream();
      await expect(collectChunks(stream)).rejects.toThrow("Stream error");
    });

    it("should handle invalid input stream data", async () => {
      const invalidStream = new ReadableStream({
        start(controller) {
          controller.enqueue("invalid data");
        },
      });

      zipper.add({ ...FILE, data: invalidStream });

      const stream = zipper.stream();
      await expect(collectChunks(stream)).rejects.toThrow();
    });

    it("should handle interleaved invalid input stream data", async () => {
      let count = 0;
      const invalidStream = new ReadableStream({
        start(controller) {
          while (count++ < 10) {
            controller.enqueue(new Uint8Array([1]));
            if (count === 5) controller.enqueue("invalid data");
          }
        },
      });

      zipper.add({ ...FILE, data: invalidStream });

      await expect(collectChunks(zipper.stream())).rejects.toThrow(
        /invalid input data/i,
      );
    });

    it("should properly close streams when cancelled", async () => {
      zipper.add(FILE);

      const stream = zipper.stream();
      const reader = stream.getReader();

      await reader.read();
      await expect(reader.cancel()).rejects.toThrow(/canceled/i);

      await expect(reader.closed).resolves.toBeUndefined();
    });
  });
});
