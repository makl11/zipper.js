/**
 * Bit flags as defined in section 4.4.4 of the ZIP specification:
 * @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 */
export const BIT_FLAGS = {
  /**
   * Bit 0: If set, indicates that the file is encrypted.
   * For Strong Encryption (bit 6), version needed to extract must be at least 50.
   * For AES encryption, version must be at least 51.
   */
  ENCRYPTED: 0x0001,

  /**
   * For Methods 8 and 9 (Deflating):
   * Bits 1-2: Maximum (-exx/-ex) compression option was used.
   *
   * For Method 14 (LZMA):
   * Bit 1: If set, indicates an end-of-stream (EOS) marker is used.
   * If clear, then EOS marker is not present and compressed data size must be known to extract.
   */
  COMPRESSION_OPTION_1: 0x0002,

  /**
   * For Methods 8 and 9 (Deflating):
   * Bits 1-2: Fast (-ef) compression option was used.
   * Note: When both bits 1-2 are set, Super Fast (-es) compression option was used.
   */
  COMPRESSION_OPTION_2: 0x0004,

  /**
   * Bit 3: If set, the CRC-32, compressed size and uncompressed size are zero in the local header.
   * The correct values are stored in the data descriptor immediately following the compressed data.
   * Note: PKZIP 2.04g only recognizes this for method 8, newer versions for any compression method.
   */
  DATA_DESCRIPTOR: 0x0008,

  /**
   * Bit 4: Reserved for use with method 8, for enhanced deflating.
   */
  ENHANCED_DEFLATION: 0x0010,

  /**
   * Bit 5: If set, indicates that the file is compressed patched data.
   * Note: Requires PKZIP version 2.70 or greater
   */
  COMPRESSED_PATCHED_DATA: 0x0020,

  /**
   * Bit 6: Strong encryption. If set, version needed to extract must be at least 50
   * and bit 0 (ENCRYPTED) must also be set. For AES encryption, version must be at least 51.
   */
  STRONG_ENCRYPTION: 0x0040,

  /** Bit 7: Currently unused */
  UNUSED_1: 0x0080,

  /** Bit 8: Currently unused */
  UNUSED_2: 0x0100,

  /** Bit 9: Currently unused */
  UNUSED_3: 0x0200,

  /** Bit 10: Currently unused */
  UNUSED_4: 0x0400,

  /**
   * Bit 11: Language encoding flag (EFS). If set, the filename and comment fields
   * for this file MUST be encoded using UTF-8.
   */
  UTF8: 0x0800,

  /** Bit 12: Reserved by PKWARE for enhanced compression */
  RESERVED_1: 0x1000,

  /**
   * Bit 13: Set when encrypting the Central Directory to indicate selected data values
   * in the Local Header are masked to hide their actual values.
   */
  MASK_HEADER_VALUES: 0x2000,

  /** Bit 14: Reserved by PKWARE for alternate streams */
  RESERVED_2: 0x4000,

  /** Bit 15: Reserved by PKWARE */
  RESERVED_3: 0x8000,
} as const;

export type BitFlags = typeof BIT_FLAGS;
export type BitFlag = keyof BitFlags;

export type BitFlagOptions = Record<BitFlag, boolean>;

/**
 * Encodes bit flags into a single number for ZIP file format
 * @param options - Object with bit flag keys and boolean values
 * @returns Tuple of byte values for the bit flags.
 */
export function encodeBitFlags(
  options: Partial<BitFlagOptions>,
): [lowByte: number, highByte: number] {
  const flags = (Object.entries(options) as [BitFlag, boolean][])
    .filter(([, isSet]) => isSet)
    .reduce((result, [flag]) => result | BIT_FLAGS[flag], 0);

  return [flags & 0xff, (flags >> 8) & 0xff];
}

/**
 * Decodes a number into an object showing which bit flags are active
 * @param value - Number to decode into flags
 * @returns Object with all bit flags and their states
 */
export function decodeBitFlags(
  value: number | [number, number],
): BitFlagOptions {
  if (Array.isArray(value)) {
    value = value[0] | (value[1] << 8);
  }

  return Object.fromEntries(
    (Object.entries(BIT_FLAGS) as [BitFlag, number][]).map(([flag, mask]) => [
      flag,
      (value & mask) === mask,
    ]),
  ) as BitFlagOptions;
}
