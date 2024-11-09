import { beforeEach, describe, expect, it } from "vitest";
import { collectChunks, writeChunksToFile } from "./utils/test_utils.js";
import { DIR, FILE } from "./utils/test_data.js";

import Zipper from "../index.js";

describe("Size Prediction", { sequential: true }, () => {
  let zipper: Zipper;

  beforeEach(() => {
    zipper = new Zipper();
  });

  it("should update predicted size when adding new files", async () => {
    const initialSize = zipper.predictSize();

    zipper.add(FILE);
    const sizeAfterOneFile = zipper.predictSize();

    zipper.add({ ...FILE, name: FILE.name + "2" });
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
    zipper.add(FILE);

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
    zipper.add({ ...FILE, data: new Blob([FILE.data]).stream() });

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
    zipper.add(FILE);
    zipper.add(DIR);
    zipper.add({ ...FILE, name: DIR.name + FILE.name });

    const predictedSize = zipper.predictSize();
    const stream = zipper.stream();

    const chunks = await collectChunks(stream);
    const totalChunksSize = chunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    );
    expect(totalChunksSize).toBe(predictedSize);
  });

  it("should accurately predict size with ZIP64 structures", {
    timeout: 300_000,
  }, async () => {
    const content = new Uint8Array(4 * 1024 * 1024 * 1024 + 16);
    const contentSize = content.byteLength;
    zipper.add({ ...FILE, data: new Blob([content]).stream(), size: contentSize });

    const predictedSize = zipper.predictSize();
    const stream = zipper.stream();

    const chunks = await collectChunks(stream);
    const totalChunksSize = chunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    );

    await writeChunksToFile("./z64_chunks.zip", chunks);
    expect(totalChunksSize).toBe(predictedSize);
  });
});
