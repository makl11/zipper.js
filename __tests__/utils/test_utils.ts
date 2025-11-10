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
