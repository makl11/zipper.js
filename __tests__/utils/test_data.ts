import crc32 from "crc/crc32";

/** This file is 128KB */
export const FILE = {
  _type: "file" as const,
  name: "test.txt",
  size: 128 * 1024,
  lastModified: new Date(2024, 0, 1, 12, 0, 0),
  get data() { return new Uint8Array(128 * 1024).fill(65) },
  crc: crc32(new Uint8Array(128 * 1024).fill(65)),
} as const;

/** This file is >4GB to test ZIP 64 */
export const LARGE_FILE = {
  _type: "file" as const,
  name: "test.txt",
  size: 1024 * 1024 * 1024 * 4 + 16,
  lastModified: new Date(2024, 0, 1, 12, 0, 0),
  get data() { return new Uint8Array(1024 * 1024 * 1024 * 4 + 16).fill(65) },
  crc: crc32(new Uint8Array(1024 * 1024 * 1024 * 4 + 16).fill(65)),
} as const;

export const DIR = {
  ...FILE,
  _type: "dir" as const,
  name: "test-dir/",
  data: new Uint8Array(),
  size: 0,
} as const;
