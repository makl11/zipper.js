import crc32 from "crc/crc32";
import type { _ZipEntry, ZipFileBuffer } from "../../index.js";

/** This file is 128KB */
export const FILE = {
  _type: "file" as const,
  name: "test.txt",
  mTime: new Date(2024, 0, 1, 12, 0, 0),

  get data() { return new Uint8Array(128 * 1024).fill(65) },
  size: 128 * 1024,

  crc: crc32(new Uint8Array(128 * 1024).fill(65)),
} as const satisfies _ZipEntry & { crc: number };

/** This file is >4GB to test ZIP 64 */
export const LARGE_FILE = {
  _type: "file" as const,
  name: "test.txt",
  mTime: new Date(2024, 0, 1, 12, 0, 0),

  get data() { return new Uint8Array(1024 * 1024 * 1024 * 4 + 16).fill(65) },
  size: 1024 * 1024 * 1024 * 4 + 16,

  crc: crc32(new Uint8Array(1024 * 1024 * 1024 * 4 + 16).fill(65)),
} as const satisfies _ZipEntry & { crc: number };

export const DIR = {
  _type: "dir" as const,
  name: "test-dir/",
  mTime: new Date(2024, 0, 1, 12, 0, 0),

  data: undefined,
  size: 0,
} as const satisfies _ZipEntry;
