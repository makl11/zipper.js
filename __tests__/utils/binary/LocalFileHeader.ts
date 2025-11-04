import {
  decodeBitFlags,
  encodeBitFlags,
  type BitFlagOptions,
} from "./constants/bitflags.js";
import { LOCAL_FILE_HEADER } from "./constants/offsets.js";
import { ZIP_VERSION } from "./constants/versions.js";
import { ExtraField } from "./ExtraField.js";

const {
  SIGNATURE: SIGNATURE_OFFSET,
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
  FILE_NAME_START,
} = LOCAL_FILE_HEADER;

export class LocalFileHeader<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends DataView<BufType> {
  static readonly SIGNATURE = 0x04034b50;
  static readonly SIZE = 30; // Size of the fixed portion

  static create(): LocalFileHeader {
    const buffer = new ArrayBuffer(LocalFileHeader.SIZE);
    const view = new DataView(buffer);
    view.setUint32(SIGNATURE_OFFSET, LocalFileHeader.SIGNATURE, true);
    return new LocalFileHeader(buffer);
  }

  constructor(buffer: BufType, byteOffset: number = 0) {
    super(buffer, byteOffset);
  }

  // Read-only signature
  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get versionNeeded(): ZIP_VERSION {
    return this.getUint16(VERSION_NEEDED, true);
  }
  set versionNeeded(value: ZIP_VERSION) {
    this.setUint16(VERSION_NEEDED, value, true);
  }

  get flags(): BitFlagOptions {
    const flags = this.getUint16(FLAGS, true);
    return decodeBitFlags(flags);
  }
  set flags(flags: BitFlagOptions) {
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
    const view = new Uint8Array(
      this.buffer,
      this.byteOffset + FILE_NAME_START,
      bytes.byteLength,
    );
    view.set(bytes);
    this.filenameLength = bytes.byteLength;
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
    return LocalFileHeader.SIZE + this.filenameLength + this.extraFieldLength;
  }
}
