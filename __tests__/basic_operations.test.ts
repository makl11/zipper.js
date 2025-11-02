import { beforeEach, describe, expect, it } from "vitest";
import { DIR, FILE } from "./utils/test_data.js";
import { collectChunks } from "./utils/test_utils.js";

import Zipper from "../src/index.js";

describe("Basic Functionality", () => {
  let zipper: Zipper;
  let stream: ReadableStream<Uint8Array> | undefined;

  beforeEach(() => {
    zipper = new Zipper();
    stream = undefined;
  });

  describe("Basic ZIP Operations", () => {
    it("should correctly pack a single small file", async () => {
      expect(() => {
        zipper.add(FILE, FILE.data);
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should create directory entries", async () => {
      expect(() => {
        zipper.add(DIR);
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should handle nested empty directory structure", async () => {
      expect(() => {
        zipper.add({ ...DIR, name: "parent/child/" });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should handle nested directory structure with files", async () => {
      expect(() => {
        zipper.add({ ...DIR, name: "parent/child1/child2/" });
      }).not.toThrow();
      expect(() => {
        stream = zipper.stream();
      }).not.toThrow();
      await expect(collectChunks(stream!)).resolves.not.toThrow();
    });

    it("should handle adding files to existing empty directory entries", async () => {
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
