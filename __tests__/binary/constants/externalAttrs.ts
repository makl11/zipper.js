/**
 * DOS/Windows attributes (last byte of external attrs)
 * @see {@link https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT} Section 4.4.2.2
 * @enum {number}
 */
export const DOS_ATTRS = {
  /** Read-only file */
  READONLY: 0x01,
  /** Hidden file */
  HIDDEN: 0x02,
  /** System file */
  SYSTEM: 0x04,
  /** Volume label */
  VOLUME: 0x08,
  /** Directory entry */
  DIRECTORY: 0x10,
  /** File has changed since last backup */
  ARCHIVE: 0x20,
  /** Device file */
  DEVICE: 0x40,
  /** Normal file */
  NORMAL: 0x80,
} as const;

/**
 * Unix file types (high byte of external attrs)
 * @see {@link https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT} Section 4.4.2.2
 * @enum {number}
 */
export const UNIX_TYPES = {
  /** Unix socket (140000 octal) */
  SOCKET: 0o140000,
  /** Unix symbolic link (120000 octal) */
  SYMLINK: 0o120000,
  /** Unix regular file (100000 octal) */
  REGULAR: 0o100000,
  /** Unix block device (060000 octal) */
  BLOCK: 0o060000,
  /** Unix directory (040000 octal) */
  DIRECTORY: 0o040000,
  /** Unix character device (020000 octal) */
  CHAR: 0o020000,
  /** Unix FIFO (010000 octal) */
  FIFO: 0o010000,
} as const;

/**
 * Unix permissions (low byte of external attrs)
 * @see {@link https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT} Section 4.4.2.2
 * @enum {number}
 */
// prettier-ignore
export const UNIX_PERMISSIONS = {
  USER_READ: 0o400, USER_WRITE: 0o200, USER_EXEC: 0o100,
  GROUP_READ: 0o040, GROUP_WRITE: 0o020, GROUP_EXEC: 0o010,
  OTHER_READ: 0o004, OTHER_WRITE: 0o002, OTHER_EXEC: 0o001,
} as const;
