/**
 * ZIP file format offset constants
 * @module binary/constants/offsets
 * @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 * @version 6.3.10
 */

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.3.7%20%20Local%20file%20header */
export const LOCAL_FILE_HEADER = {
  /** Local file header signature (bytes 0-3) */
  SIGNATURE: 0,
  /** Version needed to extract (bytes 4-5) */
  VERSION_NEEDED: 4,
  /** General purpose bit flag (bytes 6-7) */
  FLAGS: 6,
  /** Compression method (bytes 8-9) */
  COMPRESSION: 8,
  /** Last mod file time (bytes 10-11) */
  LAST_MOD_TIME: 10,
  /** Last mod file date (bytes 12-13) */
  LAST_MOD_DATE: 12,
  /** CRC-32 (bytes 14-17) */
  CRC32: 14,
  /** Compressed size (bytes 18-21) */
  COMPRESSED_SIZE: 18,
  /** Uncompressed size (bytes 22-25) */
  UNCOMPRESSED_SIZE: 22,
  /** Filename length (bytes 26-27) */
  FILE_NAME_LENGTH: 26,
  /** Extra field length (bytes 28-29) */
  EXTRA_FIELD_LENGTH: 28,
  /** Filename (starts at byte 30) */
  FILE_NAME_START: 30,
} as const;

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.3.12%20%20Central%20directory%20structure */
export const CENTRAL_DIRECTORY_FILE_HEADER = {
  /** Central directory header signature (bytes 0-3) */
  SIGNATURE: 0,
  /** Version made by (bytes 4-5) */
  VERSION_MADE_BY: 4,
  /** Version needed to extract (bytes 6-7) */
  VERSION_NEEDED: 6,
  /** General purpose bit flag (bytes 8-9) */
  FLAGS: 8,
  /** Compression method (bytes 10-11) */
  COMPRESSION: 10,
  /** Last mod file time (bytes 12-13) */
  LAST_MOD_TIME: 12,
  /** Last mod file date (bytes 14-15) */
  LAST_MOD_DATE: 14,
  /** CRC-32 (bytes 16-19) */
  CRC32: 16,
  /** Compressed size (bytes 20-23) */
  COMPRESSED_SIZE: 20,
  /** Uncompressed size (bytes 24-27) */
  UNCOMPRESSED_SIZE: 24,
  /** Filename length (bytes 28-29) */
  FILE_NAME_LENGTH: 28,
  /** Extra field length (bytes 30-31) */
  EXTRA_FIELD_LENGTH: 30,
  /** File comment length (bytes 32-33) */
  COMMENT_LENGTH: 32,
  /** Disk number start (bytes 34-35) */
  DISK_NUMBER_START: 34,
  /** Internal file attributes (bytes 36-37) */
  INTERNAL_ATTRIBUTES: 36,
  /** External file attributes (bytes 38-41) */
  EXTERNAL_ATTRIBUTES: 38,
  /** Relative offset of local header (bytes 42-45) */
  LOCAL_FILE_HEADER_OFFSET: 42,
  /** Filename (starts at byte 46) */
  FILE_NAME_START: 46,
} as const;

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.3.16%20%20End%20of%20central%20directory%20record */
export const END_OF_CENTRAL_DIR = {
  /** End of central dir signature (bytes 0-3) */
  SIGNATURE: 0,
  /** Number of this disk (bytes 4-5) */
  DISK_NUMBER: 4,
  /** Disk where central directory starts (bytes 6-7) */
  DISK_WITH_CD_START: 6,
  /** Number of central directory records on this disk (bytes 8-9) */
  ENTRIES_ON_DISK: 8,
  /** Total number of central directory records (bytes 10-11) */
  TOTAL_ENTRIES: 10,
  /** Size of central directory in bytes (bytes 12-15) */
  CENTRAL_DIRECTORY_SIZE: 12,
  /** Offset of central directory (bytes 16-19) */
  CENTRAL_DIRECTORY_OFFSET: 16,
  /** Comment length (bytes 20-21) */
  COMMENT_LENGTH: 20,
  /** Comment (starts at byte 22) */
  COMMENT_START: 22,
} as const;

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.3.9%20%20Data%20descriptor */
export const DATA_DESCRIPTOR = {
  /** Optional data descriptor signature (bytes 0-3) */
  SIGNATURE: 0,
  /** CRC-32 (bytes 4-7) */
  CRC32: 4,
  /** Compressed size (bytes 8-11) | zip64: (bytes 8-15) */
  COMPRESSED_SIZE: 8,
  /** Uncompressed size (bytes 12-15) */
  UNCOMPRESSED_SIZE: 12,
  /** Zip64 uncompressed size (bytes 16-24) */
  ZIP64_UNCOMPRESSED_SIZE: 16,
} as const;

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.3.14%20%20Zip64%20end%20of%20central%20directory%20record */
export const ZIP64_END_OF_CENTRAL_DIR = {
  /** ZIP64 end of central dir signature (bytes 0-3) */
  SIGNATURE: 0,
  /** Size of ZIP64 end of central directory record (bytes 4-11) */
  RECORD_SIZE: 4,
  /** Version made by (bytes 12-13) */
  VERSION_MADE_BY: 12,
  /** Version needed to extract (bytes 14-15) */
  VERSION_NEEDED: 14,
  /** Number of this disk (bytes 16-19) */
  DISK_NUMBER: 16,
  /** Disk with central directory start (bytes 20-23) */
  DISK_WITH_CD_START: 20,
  /** Number of entries on this disk (bytes 24-31) */
  ENTRIES_ON_DISK: 24,
  /** Total number of entries (bytes 32-39) */
  TOTAL_ENTRIES: 32,
  /** Size of central directory (bytes 40-47) */
  CENTRAL_DIRECTORY_SIZE: 40,
  /** Offset of central directory (bytes 48-55) */
  CENTRAL_DIRECTORY_OFFSET: 48,
  /** Comment (starts at byte 56 up to the size of EOCD64) */
  COMMENT_START: 56,
} as const;

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.3.15%20Zip64%20end%20of%20central%20directory%20locator */
export const ZIP64_END_OF_CENTRAL_DIR_LOCATOR = {
  /** ZIP64 end of central dir locator signature (bytes 0-3) */
  SIGNATURE: 0,
  /** Number of disk with ZIP64 end of central directory record (bytes 4-7) */
  EOCD64_DISK_NUMBER: 4,
  /** Offset of ZIP64 end of central directory record (bytes 8-15) */
  EOCD64_OFFSET: 8,
  /** Total number of disks (bytes 16-19) */
  TOTAL_DISKS: 16,
} as const;

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.5%20Extensible%20data%20fields */
export const EXTRA_FIELD = {
  /** Extra field ID (bytes 0-1) */
  ID: 0,
  /** Extra field size (bytes 2-3) */
  SIZE: 2,
  /** Extra field data (starts at byte 4) */
  DATA_START: 4,
} as const;

export const ZIP64_EXTRA_FIELD = {
  /** ZIP64 extra field ID (bytes 0-1) */
  ID: 0,
  /** ZIP64 extra field size (bytes 2-3) */
  SIZE: 2,
  /** ZIP64 original file size (bytes 4-11) */
  ORIGINAL_SIZE: 4,
  /** ZIP64 compressed file size (bytes 12-19) */
  COMPRESSED_SIZE: 12,
  /** ZIP64 relative header offset (bytes 20-27) */
  RELATIVE_HEADER_OFFSET: 20,
  /** ZIP64 disk start number (bytes 28-35) */
  DISK_START_NUMBER: 28,
} as const;
