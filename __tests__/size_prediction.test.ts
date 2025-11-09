import { describe, expect, it } from "vitest";
import { DIR, FILE } from "./utils/test_data";
import { collectChunks, writeChunksToFile } from "./utils/test_utils";

import Zipper from "../src/index";

describe("Size Prediction", { sequential: true }, () => {
  it("should update predicted size when adding new files", async () => {
    const zipper = new Zipper();

    const initialSize = zipper.predictSize();

    zipper.add(FILE, FILE.data);
    const sizeAfterOneFile = zipper.predictSize();

    zipper.add({ ...FILE, name: FILE.name + "2" }, FILE.data);
    const sizeAfterTwoFiles = zipper.predictSize();

    expect(sizeAfterOneFile).toBeGreaterThan(initialSize);
    expect(sizeAfterTwoFiles).toBeGreaterThan(sizeAfterOneFile);

    const stream = zipper.stream();

    const chunks = await collectChunks(stream);
    const totalChunksSize = chunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    );
    expect(totalChunksSize).toBe(sizeAfterTwoFiles);
  });

  it("should accurately predict final ZIP size for a single file", async () => {
    const zipper = new Zipper();

    zipper.add(FILE, FILE.data);

    const predictedSize = zipper.predictSize();
    const stream = zipper.stream();

    const chunks = await collectChunks(stream);
    const totalChunksSize = chunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    );
    expect(totalChunksSize).toBe(predictedSize);
  });

  it("should accurately predict final ZIP size for a single streamed file", async () => {
    const zipper = new Zipper();

    zipper.add(FILE, new Blob([FILE.data]).stream(), FILE.size);

    const predictedSize = zipper.predictSize();

    const stream = zipper.stream();

    const chunks = await collectChunks(stream);
    const totalChunksSize = chunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    );

    expect(
      totalChunksSize,
      `Size prediction off by ${totalChunksSize - predictedSize}`,
    ).toBe(predictedSize);
  });

  it("should accurately predict final ZIP size for file and directory entries", async () => {
    const zipper = new Zipper();

    zipper.add(FILE, FILE.data);
    zipper.add(DIR);
    zipper.add({ ...FILE, name: DIR.name + FILE.name }, FILE.data);

    const predictedSize = zipper.predictSize();
    const stream = zipper.stream();

    const chunks = await collectChunks(stream);
    const totalChunksSize = chunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    );
    expect(totalChunksSize).toBe(predictedSize);
  });

  it(
    "should accurately predict size with ZIP64 structures",
    {
      timeout: 300_000,
    },
    async () => {
      const zipper = new Zipper();

      const content = new Uint8Array(4 * 1024 * 1024 * 1024 + 16);
      const contentSize = content.byteLength;
      zipper.add(FILE, new Blob([content]).stream(), contentSize);

      const predictedSize = zipper.predictSize();
      const stream = zipper.stream();

      const chunks = await collectChunks(stream);
      const totalChunksSize = chunks.reduce(
        (acc, chunk) => acc + chunk.byteLength,
        0,
      );

      await writeChunksToFile("./z64_chunks.zip", chunks);
      expect(totalChunksSize).toBe(predictedSize);
    },
  );
});
