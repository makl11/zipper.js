/**
 * Compression methods as defined in section 4.4.5 of the ZIP specification:
 * @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.4.5%20compression%20method
 * @enum {number}
 */
export const COMPRESSION = {
  /** The file is stored (no compression) */
  STORE: 0,
  /** The file is Shrunk */
  SHRINK: 1,
  /** The file is Reduced with compression factor 1 */
  REDUCE_1: 2,
  /** The file is Reduced with compression factor 2 */
  REDUCE_2: 3,
  /** The file is Reduced with compression factor 3 */
  REDUCE_3: 4,
  /** The file is Reduced with compression factor 4 */
  REDUCE_4: 5,
  /** The file is Imploded */
  IMPLODE: 6,
  /** Reserved for Tokenizing compression algorithm */
  RESERVED_TC: 7,
  /** The file is Deflated */
  DEFLATE: 8,
  /** Enhanced Deflating using Deflate64(tm) */
  DEFLATE64: 9,
  /** PKWARE Data Compression Library Imploding (old IBM TERSE) */
  OLD_TERSE: 10,
  /** Reserved by PKWARE */
  RESERVED_PK1: 11,
  /** File is compressed using BZIP2 algorithm */
  BZIP2: 12,
  /** Reserved by PKWARE */
  RESERVED_PK2: 13,
  /** LZMA */
  LZMA: 14,
  /** Reserved by PKWARE */
  RESERVED_PK3: 15,
  /** IBM z/OS CMPSC Compression */
  CMPSC: 16,
  /** Reserved by PKWARE */
  RESERVED_PK4: 17,
  /** File is compressed using IBM TERSE (new) */
  TERSE: 18,
  /** IBM LZ77 z Architecture */
  LZ77: 19,
  /** deprecated (use method 93 for zstd) */
  DEPRECATED_ZSTD: 20,
  /** Zstandard (zstd) Compression */
  ZSTD: 93,
  /** MP3 Compression */
  MP3: 94,
  /** XZ Compression */
  XZ: 95,
  /** JPEG variant */
  JPEG: 96,
  /** WavPack compressed data */
  WAVPACK: 97,
  /** PPMd version I, Rev 1 */
  PPMD: 98,
  /** AE-x encryption marker (see APPENDIX E) */
  AE_X_ENCRYPTION_MARKER: 99,
} as const;
