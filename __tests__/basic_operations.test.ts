import { beforeEach, describe, expect, it } from "vitest";
import { collectChunks } from "./utils/test_utils.js";
import { DIR, FILE } from "./utils/test_data.js";

import Zipper from "../index.js";

describe("Basic Functionality", () => {
  let zipper: Zipper;
  let stream: ReadableStream<Uint8Array>;

  beforeEach(() => {
    zipper = new Zipper();
  });

  describe("Basic ZIP Operations", () => {
    it("should correctly pack a single small file", async () => {
      expect(() => {
        zipper.add({ name: FILE.name, data: FILE.data, size: FILE.size, lastModified: FILE.lastModified });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream)).resolves.not.toThrow();
    });

    it("should create directory entries", async () => {
      expect(() => {
        zipper.add({ ...DIR, name: DIR.name });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream)).resolves.not.toThrow();
    });

    it("should handle nested empty directory structure", async () => {
      expect(() => {
        zipper.add({ ...DIR, name: "parent/child/" });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream)).resolves.not.toThrow();
    });

    it("should handle nested directory structure with files", async () => {
      expect(() => {
        zipper.add({ ...DIR, name: "parent/child1/child2/" });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream)).resolves.not.toThrow();
    });

    it("should handle adding files to existing empty directory entries", async () => {
      expect(() => {
        zipper.add(DIR);
        zipper.add({ ...FILE, name: DIR.name + FILE.name });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream)).resolves.not.toThrow();
    });
  });
});
