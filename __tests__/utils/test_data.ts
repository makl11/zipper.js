import assert from "assert";

/** This file is 1KB */
export const FILE = {
  _type: "file" as const,
  name: "test.txt",
  mTime: new Date(2024, 0, 1, 12, 0, 0),
  get data() {
    return new Uint8Array(1024).fill(65);
  },
  size: 1024,
  crc: 3073899290,
} as const;

/** This file is >4GB to test ZIP 64 */
export const LARGE_FILE = {
  _type: "file" as const,
  name: "test.txt",
  mTime: new Date(2024, 0, 1, 12, 0, 0),

  get data() {
    const size = this.size;
    let bytesWritten = 0;
    return new ReadableStream({
      type: "bytes",
      pull(controller) {
        try {
          if (bytesWritten + FILE.size > size) {
            const data = FILE.data.slice(0, size % FILE.size);
            controller.enqueue(data);
            bytesWritten += size % FILE.size;
            assert(bytesWritten === size);
            controller.close();
            return;
          }
          controller.enqueue(FILE.data);
          bytesWritten += FILE.size;
        } catch (error) {
          controller.error(error);
        }
      },
    });
  },
  size: 1024 * 1024 * 1024 * 4 + 16,
  crc: 1152402260,
} as const;

export const DIR = {
  _type: "dir" as const,
  name: "test-dir/",
  mTime: new Date(2024, 0, 1, 12, 0, 0),
  data: undefined,
  size: 0,
} as const;
