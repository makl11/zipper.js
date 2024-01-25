import { open } from "node:fs/promises"

/**
 * @export
 * @param {string} filePath
 * @param {number} [chunkSize=16777216] - Default: 16MiB 
 * @return {ReadableStream<Uint8Array>} 
 */
export function openFileAsReadableStream(filePath, chunkSize = 16777216) {
  /** @type {import("node:fs/promises").FileHandle} */
  let fileHandle;
  let position = 0;

  return new ReadableStream({
    type: "bytes",
    async start() {
      fileHandle = await open(filePath, "r");
    },
    async pull(controller) {
      if (!controller.byobRequest) throw "No BYOB Request"
      if (!controller.byobRequest.view) throw "No View in BYOB Request"
      const view = controller.byobRequest.view;

      const { bytesRead } = await fileHandle.read(new Uint8Array(view), 0, view.byteLength, position);
      if (bytesRead === 0) {
        await fileHandle.close();
        controller.close();
        controller.byobRequest.respond(0);
      } else {
        position += bytesRead;
        controller.byobRequest.respond(bytesRead);
      }
    },
    async cancel() {
      return await fileHandle.close();
    },
    autoAllocateChunkSize: chunkSize
  });
}
