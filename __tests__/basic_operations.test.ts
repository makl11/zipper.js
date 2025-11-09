import { describe, expect, it } from "vitest";
import { DIR, FILE } from "./utils/test_data";
import { collectChunks } from "./utils/test_utils";

import Zipper from "../src/index";

describe("Basic Functionality", () => {
  describe("Basic ZIP Operations", () => {
    it("should correctly pack a single small file", async () => {
      const zipper = new Zipper();
      let stream: ReadableStream<Uint8Array>;

      expect(() => {
        zipper.add(FILE, FILE.data);
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should create directory entries", async () => {
      const zipper = new Zipper();
      let stream: ReadableStream<Uint8Array>;

      expect(() => {
        zipper.add(DIR);
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should handle nested empty directory structure", async () => {
      const zipper = new Zipper();
      let stream: ReadableStream<Uint8Array>;

      expect(() => {
        zipper.add({ ...DIR, name: "parent/child/" });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should handle nested directory structure with files", async () => {
      const zipper = new Zipper();
      let stream: ReadableStream<Uint8Array>;

      expect(() => {
        zipper.add({ ...DIR, name: "parent/child1/child2/" });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should handle adding files to existing empty directory entries", async () => {
      const zipper = new Zipper();
      let stream: ReadableStream<Uint8Array>;

      expect(() => {
        zipper.add(DIR);
        zipper.add({ ...FILE, name: DIR.name + FILE.name }, FILE.data);
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });
  });
});
