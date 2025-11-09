import { ExtraField } from "./ExtraField.js";
import { DOS_ATTRS, UNIX_PERMISSIONS } from "./constants/externalAttrs.js";
import { CENTRAL_DIRECTORY_FILE_HEADER } from "./constants/offsets.js";
import { ZIP_VERSION } from "./constants/versions.js";

import type { ZipEntry } from "../../../src/index.js";
import {
  decodeBitFlags,
  encodeBitFlags,
  type BitFlagOptions,
} from "./constants/bitflags.js";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  VERSION_MADE_BY,
  VERSION_NEEDED,
  FLAGS,
  COMPRESSION,
  LAST_MOD_TIME,
  LAST_MOD_DATE,
  CRC32,
  COMPRESSED_SIZE,
  UNCOMPRESSED_SIZE,
  FILE_NAME_LENGTH,
  EXTRA_FIELD_LENGTH,
  COMMENT_LENGTH,
  DISK_NUMBER_START,
  INTERNAL_ATTRIBUTES,
  EXTERNAL_ATTRIBUTES,
  LOCAL_FILE_HEADER_OFFSET,
  FILE_NAME_START,
} = CENTRAL_DIRECTORY_FILE_HEADER;

export class CentralDirectoryFileHeader<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends DataView<BufType> {
  static readonly SIGNATURE = 0x02014b50;
  static readonly SIZE = 46;

  static create(): CentralDirectoryFileHeader {
    const buffer = new ArrayBuffer(CentralDirectoryFileHeader.SIZE);
    const view = new DataView(buffer);
    view.setUint32(
      SIGNATURE_OFFSET,
      CentralDirectoryFileHeader.SIGNATURE,
      true,
    );
    return new CentralDirectoryFileHeader(buffer);
  }

  constructor(buffer: BufType, byteOffset: number = 0) {
    super(buffer, byteOffset);
  }

  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get versionMadeBy(): number {
    return this.getUint16(VERSION_MADE_BY, true);
  }
  set versionMadeBy(value: number) {
    this.setUint16(VERSION_MADE_BY, value, true);
  }

  get versionNeeded(): ZIP_VERSION {
    return this.getUint16(VERSION_NEEDED, true);
  }
  set versionNeeded(value: ZIP_VERSION) {
    this.setUint16(VERSION_NEEDED, value, true);
  }

  get flags(): BitFlagOptions {
    const value = this.getUint16(FLAGS, true);
    return decodeBitFlags(value);
  }
  set flags(flags: Partial<BitFlagOptions>) {
    const value = encodeBitFlags(flags);
    this.setUint16(FLAGS, value, true);
  }

  get compression(): number {
    return this.getUint16(COMPRESSION, true);
  }
  set compression(value: number) {
    this.setUint16(COMPRESSION, value, true);
  }

  get lastModifiedTime(): number {
    return this.getUint16(LAST_MOD_TIME, true);
  }
  set lastModifiedTime(value: number) {
    this.setUint16(LAST_MOD_TIME, value, true);
  }

  get lastModifiedDate(): number {
    return this.getUint16(LAST_MOD_DATE, true);
  }
  set lastModifiedDate(value: number) {
    this.setUint16(LAST_MOD_DATE, value, true);
  }

  get crc32(): number {
    return this.getUint32(CRC32, true);
  }
  set crc32(value: number) {
    this.setUint32(CRC32, value, true);
  }

  get compressedSize(): number {
    return this.getUint32(COMPRESSED_SIZE, true);
  }
  set compressedSize(value: number) {
    this.setUint32(COMPRESSED_SIZE, value, true);
  }

  get uncompressedSize(): number {
    return this.getUint32(UNCOMPRESSED_SIZE, true);
  }
  set uncompressedSize(value: number) {
    this.setUint32(UNCOMPRESSED_SIZE, value, true);
  }

  get filenameLength(): number {
    return this.getUint16(FILE_NAME_LENGTH, true);
  }
  set filenameLength(value: number) {
    this.setUint16(FILE_NAME_LENGTH, value, true);
  }

  get extraFieldLength(): number {
    return this.getUint16(EXTRA_FIELD_LENGTH, true);
  }
  set extraFieldLength(value: number) {
    this.setUint16(EXTRA_FIELD_LENGTH, value, true);
  }

  get commentLength(): number {
    return this.getUint16(COMMENT_LENGTH, true);
  }
  set commentLength(value: number) {
    this.setUint16(COMMENT_LENGTH, value, true);
  }

  get diskNumberStart(): number {
    return this.getUint16(DISK_NUMBER_START, true);
  }
  set diskNumberStart(value: number) {
    this.setUint16(DISK_NUMBER_START, value, true);
  }

  get internalAttributes(): number {
    return this.getUint16(INTERNAL_ATTRIBUTES, true);
  }
  set internalAttributes(value: number) {
    this.setUint16(INTERNAL_ATTRIBUTES, value, true);
  }

  get externalAttributes(): number {
    return this.getUint32(EXTERNAL_ATTRIBUTES, true);
  }
  set externalAttributes(value: number) {
    this.setUint32(EXTERNAL_ATTRIBUTES, value, true);
  }

  get localFileHeaderOffset(): number {
    return this.getUint32(LOCAL_FILE_HEADER_OFFSET, true);
  }
  set localFileHeaderOffset(value: number) {
    this.setUint32(LOCAL_FILE_HEADER_OFFSET, value, true);
  }

  get filename(): string {
    const bytes = new Uint8Array(
      this.buffer,
      this.byteOffset + FILE_NAME_START,
      this.filenameLength,
    );
    return new TextDecoder().decode(bytes);
  }

  set filename(value: string) {
    const bytes = new TextEncoder().encode(value);
    const view = new Uint8Array(this.buffer, this.byteOffset + FILE_NAME_START);
    view.set(bytes);
    this.filenameLength = bytes.byteLength;
  }

  get comment(): string {
    const bytes = new Uint8Array(
      this.buffer,
      this.byteOffset +
        FILE_NAME_START +
        this.filenameLength +
        this.extraFieldLength,
      this.commentLength,
    );
    return new TextDecoder().decode(bytes);
  }

  set comment(value: string) {
    const bytes = new TextEncoder().encode(value);
    const view = new Uint8Array(
      this.buffer,
      this.byteOffset +
        FILE_NAME_START +
        this.filenameLength +
        this.extraFieldLength,
    );
    view.set(bytes);
    this.commentLength = bytes.byteLength;
  }

  get extraFields(): ExtraField[] {
    const fields: ExtraField[] = [];
    let offset = this.byteOffset + FILE_NAME_START + this.filenameLength;
    const endOffset = offset + this.extraFieldLength;

    while (offset < endOffset) {
      const field = new ExtraField(this.buffer, offset);
      fields.push(field);
      offset += field.byteLength;
    }

    return fields;
  }

  setExtraFields(fields: ExtraField[], updateLength: boolean = false) {
    const targetOffset =
      this.byteOffset + FILE_NAME_START + this.filenameLength;
    let totalLength = 0;

    for (const field of fields) {
      const targetView = new Uint8Array(
        this.buffer,
        targetOffset + totalLength,
      );
      if (totalLength + field.byteLength > this.extraFieldLength) {
        throw new Error("Extra field length exceeded");
      }
      targetView.set(
        new Uint8Array(field.buffer, field.byteOffset, field.byteLength),
      );
      totalLength += field.byteLength;
    }

    if (updateLength) this.extraFieldLength = totalLength;
    else if (totalLength < this.extraFieldLength) {
      throw new Error("Extra field length mismatch");
    }
  }

  override get byteLength(): number {
    return (
      CentralDirectoryFileHeader.SIZE +
      this.filenameLength +
      this.extraFieldLength +
      this.commentLength
    );
  }
}

export function generateExternalAttrs(entry: ZipEntry): Uint8Array {
  let unixMode: number = 0;
  let dosAttrs: number = 0;

  if (entry._type === "dir") {
    // Directory: use provided mode or default to drwxr-xr-x (4755)
    unixMode = entry.mode ?? 0o755;
    dosAttrs |= DOS_ATTRS.DIRECTORY;
  } else {
    // Regular file: use provided mode or default to rw-r--r-- (0644)
    unixMode = entry.mode ?? 0o644;
    // For files, always set ARCHIVE bit (standard practice)
    dosAttrs |= DOS_ATTRS.ARCHIVE;
  }

  // Handle readonly flag for both files and directories
  if (entry.readonly) {
    // Remove write permissions from Unix mode
    unixMode &= ~(
      UNIX_PERMISSIONS.USER_WRITE |
      UNIX_PERMISSIONS.GROUP_WRITE |
      UNIX_PERMISSIONS.OTHER_WRITE
    );
    // Set DOS read-only attribute
    dosAttrs |= DOS_ATTRS.READONLY;
  }

  return new Uint8Array([
    dosAttrs, // DOS attributes (byte 0)
    0x00, // Reserved (byte 1)
    unixMode & 0xff, // Unix mode low byte (byte 2)
    (unixMode >> 8) & 0xff, // Unix mode high byte (byte 3)
  ]);
}
