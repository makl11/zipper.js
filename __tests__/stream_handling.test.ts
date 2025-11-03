import { describe, expect, it } from "vitest";
import { FILE } from "./utils/test_data.js";
import { collectChunks } from "./utils/test_utils.js";

import Zipper from "../src/index.js";

describe("Stream Handling", () => {
  describe("Basic Stream Operations", () => {
    it("should provide a valid ReadableStream", () => {
      const zipper = new Zipper();

      const stream = zipper.stream();
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("should stream data in chunks", async () => {
      const zipper = new Zipper();

      zipper.add(FILE, FILE.data);

      const stream = zipper.stream();
      const chunks = await collectChunks(stream);

      expect(chunks.length).toBeGreaterThanOrEqual(FILE.size / (64 * 1024)); // 64KB is default chunk size for node fs streams
    });

    it.fails(
      "should stop zip generation when an abort signal is received",
      async () => {
        const zipper = new Zipper();

        zipper.add(FILE, FILE.data);

        const controller = new AbortController();
        const stream = zipper.stream({ signal: controller.signal });
        setTimeout(() => controller.abort("User abort"), 100);
        await expect(collectChunks(stream, true)).rejects.toThrow(
          /user abort/i,
        );
      },
    );
  });

  describe("Error Cases", () => {
    it("should handle output stream errors", async () => {
      const zipper = new Zipper();

      const errorStream = new WritableStream<Uint8Array>({
        write() {
          throw new Error("Stream controller error");
        },
      });

      zipper.add(FILE, FILE.data);
      const stream = zipper.stream();

      await expect(stream.pipeTo(errorStream)).rejects.toThrow(
        "Stream controller error",
      );
    });

    it("should handle output stream controller abort", async () => {
      const zipper = new Zipper();

      zipper.add(FILE, FILE.data);
      const stream = zipper.stream();

      const abortController = new AbortController();
      const promise = stream.pipeTo(
        new WritableStream({
          async write() {
            return new Promise((resolve) => setTimeout(resolve, 50));
          },
        }),
        { signal: abortController.signal },
      );
      setTimeout(() => abortController.abort("Aborted"), 50);
      await expect(promise).rejects.toThrow(/canceled/i);
    });

    it("should handle input stream errors", async () => {
      const zipper = new Zipper();

      const errorStream = new ReadableStream<Uint8Array>({
        type: "bytes",
        start(controller) {
          controller.error(new Error("Stream error"));
        },
      });

      zipper.add(FILE, errorStream, 10);

      const stream = zipper.stream();
      await expect(collectChunks(stream, true)).rejects.toThrow("Stream error");
    });

    it("should handle invalid input stream data", async () => {
      const zipper = new Zipper();

      const invalidStream = new ReadableStream({
        type: "bytes",
        start(controller) {
          controller.enqueue(
            "invalid data" as unknown as Uint8Array<ArrayBuffer>,
          );
        },
      });

      zipper.add(FILE, invalidStream, 10);

      const stream = zipper.stream();
      await expect(collectChunks(stream, true)).rejects.toThrow();
    });

    it("should handle interleaved invalid input stream data", async () => {
      const zipper = new Zipper();

      let count = 0;
      const invalidStream = new ReadableStream({
        type: "bytes",
        start(controller) {
          while (count++ < 10) {
            controller.enqueue(new Uint8Array([1]));
            if (count === 5) {
              controller.enqueue(
                "invalid data" as unknown as Uint8Array<ArrayBuffer>,
              );
            }
          }
        },
      });

      zipper.add(FILE, invalidStream, 10);

      await expect(collectChunks(zipper.stream(), true)).rejects.toThrow(
        /invalid input data/i,
      );
    });

    it("should properly close streams when cancelled", async () => {
      const zipper = new Zipper();

      zipper.add(FILE, FILE.data);

      const stream = zipper.stream();
      const reader = stream.getReader();

      await reader.read();
      await expect(reader.cancel()).rejects.toThrow(/canceled/i);

      await expect(reader.closed).resolves.toBeUndefined();
    });
  });
});
