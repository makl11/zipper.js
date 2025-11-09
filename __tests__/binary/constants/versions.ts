/**
 * Well-known ZIP specification versions and their features.
 * Version numbers are multiplied by 10 to avoid decimals.
 * @enum {number}
 */
export enum ZIP_VERSION {
  /** Basic PKZIP 1.0 compatibility */
  V1_0 = 10,
  /** Basic PKZIP 2.0 compatibility */
  V2_0 = 20,
  /** PKZIP 2.5 - Compressed patched data */
  V2_5 = 25,
  /** PKZIP 2.6 - PKWare DCL Implode compression */
  V2_6 = 26,
  /** PKZIP 2.7 - File compression with deflate64 */
  V2_7 = 27,
  /** PKZIP 4.5 - Includes directory spanning */
  V4_5 = 45,
  /** PKZIP 4.6 - Strong encryption */
  V4_6 = 46,
  /** PKZIP 5.0 - Patched archive */
  V5_0 = 50,
  /** PKZIP 5.1 - Archive attributes */
  V5_1 = 51,
  /** PKZIP 5.2 - Archive extended timestamps */
  V5_2 = 52,
  /** PKZIP 6.1 - Archive encryption */
  V6_1 = 61,
  /** PKZIP 6.2 - Central directory encryption */
  V6_2 = 62,
  /** PKZIP 6.3 - Archive features */
  V6_3 = 63,
  /** PKZIP 6.5+ - Compressed patched data version 2 */
  V6_5 = 65,
}

/**
 * Minimum version needed for specific ZIP features
 * @enum {number}
 */
export enum FEATURES_VERSION {
  BASE = ZIP_VERSION.V1_0,
  /** Directories */
  DIRS = ZIP_VERSION.V2_0,
  /** No compression */
  STORE = ZIP_VERSION.V2_0,
  /** Deflate compression */
  DEFLATE = ZIP_VERSION.V2_0,
  /** Enhanced Deflate compression */
  DEFLATE64 = ZIP_VERSION.V2_7,
  /** ZIP64 format extensions */
  ZIP64 = ZIP_VERSION.V4_5,
  /** Standard encryption */
  ENCRYPTION = ZIP_VERSION.V5_0,
  /** Strong encryption */
  STRONG_ENCRYPTION = ZIP_VERSION.V4_6,
  /** Unicode file names */
  UTF8 = ZIP_VERSION.V6_3,
  /** Enhanced compression */
  ENHANCED_COMPRESSION = ZIP_VERSION.V5_0,
  /** Patched data */
  PATCHED_DATA = ZIP_VERSION.V2_7,
  /** Central directory encryption */
  CENTRAL_DIR_ENCRYPTION = ZIP_VERSION.V6_2,
}
