import { describe, expect, it } from "vitest";
import { DIR, FILE, LARGE_FILE } from "./utils/test_data";
import { collectChunks } from "./utils/test_utils";

import Zipper from "../src/index";

describe("Size Prediction", { timeout: 30_000 }, () => {
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

  it("should accurately predict size with ZIP64 structures", async () => {
    const zipper = new Zipper();

    zipper.add(LARGE_FILE, LARGE_FILE.data, LARGE_FILE.size);

    const predictedSize = zipper.predictSize();
    const stream = zipper.stream();

    let totalChunksSize = 0;
    await stream.pipeTo(
      new WritableStream({
        write: (chunk) => void (totalChunksSize += chunk.byteLength),
      }),
    );

    expect(totalChunksSize).toBe(predictedSize);
  });
});
