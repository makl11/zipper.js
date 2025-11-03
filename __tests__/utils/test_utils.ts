import { open } from "fs/promises";

export async function collectChunks(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array[]>;
export async function collectChunks(
  stream: ReadableStream<Uint8Array>,
  omit_data: false,
): Promise<Uint8Array[]>;
export async function collectChunks(
  stream: ReadableStream<Uint8Array>,
  omit_data: true,
): Promise<"### Chunk content omitted ###">;
export async function collectChunks(
  stream: ReadableStream<Uint8Array>,
  omit_data = false,
) {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!omit_data) chunks.push(value);
  }
  reader.releaseLock();

  return omit_data ? "### Chunk content omitted ###" : chunks;
}

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((len, arr) => len + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

export function createSmallMockFile(size: number = 1): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = i % 256;
  }
  return data;
}

export async function writeChunksToFile(path: string, chunks: Uint8Array[]) {
  const file = await open(path, "w");
  for (const chunk of chunks) {
    await file.write(chunk);
  }
  await file.close();
}
