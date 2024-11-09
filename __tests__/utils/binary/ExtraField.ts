import { EXTRA_FIELD, ZIP64_EXTRA_FIELD } from "./constants/offsets.js";

export class ExtraField extends Uint8Array {
  static readonly SIZE: number = 4; // Size of fixed portion
  protected view: DataView;

  constructor(buffer: ArrayBuffer, byteOffset: number) {
    const dataSize = new DataView(buffer, byteOffset).getUint16(
      EXTRA_FIELD.SIZE,
      true,
    );
    super(buffer, byteOffset, ExtraField.SIZE + dataSize);
    this.view = new DataView(this.buffer, this.byteOffset, this.byteLength);
  }

  get id(): number {
    return this.view.getUint16(EXTRA_FIELD.ID, true);
  }
  set id(value: number) {
    this.view.setUint16(EXTRA_FIELD.ID, value, true);
  }

  get dataSize(): number {
    return this.view.getUint16(EXTRA_FIELD.SIZE, true);
  }
  set dataSize(value: number) {
    this.view.setUint16(EXTRA_FIELD.SIZE, value, true);
  }

  get data(): Uint8Array {
    return new Uint8Array(
      this.buffer,
      this.byteOffset + EXTRA_FIELD.DATA_START,
      this.dataSize,
    );
  }
  set data(value: Uint8Array) {
    if (value.byteLength !== this.dataSize) {
      throw new Error("Data length mismatch");
    }
    new Uint8Array(
      this.buffer,
      this.byteOffset + EXTRA_FIELD.DATA_START,
      this.dataSize,
    ).set(value);
  }

  static isZip64(field: ExtraField): boolean {
    return field.id === Zip64ExtraField.ID;
  }

  static isUnixUidGid(field: ExtraField): boolean {
    return field.id === UnixUidGidExtraField.ID;
  }

  static isUniversalTime(field: ExtraField): boolean {
    return field.id === UniversalTimeExtraField.ID;
  }

  asZip64() {
    if (!ExtraField.isZip64(this)) {
      throw new Error("Can not interpret this ExtraField as Zip64ExtraField");
    }
    return new Zip64ExtraField(this.buffer, this.byteOffset);
  }

  asUnixUidGid() {
    if (!ExtraField.isUnixUidGid(this)) {
      throw new Error(
        "Can not interpret this ExtraField as UnixUidGidExtraField",
      );
    }
    return new UnixUidGidExtraField(this.buffer, this.byteOffset);
  }

  asUniversalTime() {
    if (!ExtraField.isUniversalTime(this)) {
      throw new Error(
        "Can not interpret this ExtraField as UniversalTimeExtraField",
      );
    }
    return new UniversalTimeExtraField(this.buffer, this.byteOffset);
  }
}

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.5.3%20%2DZip64%20Extended%20Information%20Extra%20Field%20(0x0001) */
export class Zip64ExtraField extends ExtraField {
  static readonly ID = 0x0001;
  static readonly DATA_SIZE_LFH = 16; // Local file header
  static readonly DATA_SIZE_CDH = 28; // Central directory header
  private readonly isLFH: boolean;

  constructor(buffer: ArrayBuffer, byteOffset: number) {
    super(buffer, byteOffset);
    if (this.id !== Zip64ExtraField.ID) {
      throw new Error("Invalid ZIP64 extra field");
    }
    this.isLFH =
      this.byteLength === ExtraField.SIZE + Zip64ExtraField.DATA_SIZE_LFH;
    if (
      !this.isLFH &&
      this.byteLength !== ExtraField.SIZE + Zip64ExtraField.DATA_SIZE_CDH
    ) {
      throw new Error("Invalid ZIP64 extra field size");
    }
  }

  get uncompressedSize(): bigint {
    return this.view.getBigUint64(ZIP64_EXTRA_FIELD.ORIGINAL_SIZE, true);
  }

  set uncompressedSize(value: bigint) {
    this.view.setBigUint64(ZIP64_EXTRA_FIELD.ORIGINAL_SIZE, value, true);
  }

  get compressedSize(): bigint {
    return this.view.getBigUint64(ZIP64_EXTRA_FIELD.COMPRESSED_SIZE, true);
  }

  set compressedSize(value: bigint) {
    this.view.setBigUint64(ZIP64_EXTRA_FIELD.COMPRESSED_SIZE, value, true);
  }

  get relativeHeaderOffset(): bigint | null {
    if (this.isLFH) {
      console.warn(
        "ZIP64 relative header offset is not supported for local file headers",
      );
      return null;
    }
    return this.view.getBigUint64(
      ZIP64_EXTRA_FIELD.RELATIVE_HEADER_OFFSET,
      true,
    );
  }

  set relativeHeaderOffset(value: bigint) {
    if (this.isLFH) {
      console.warn(
        "ZIP64 relative header offset is not supported for local file headers",
      );
      return;
    }
    this.view.setBigUint64(
      ZIP64_EXTRA_FIELD.RELATIVE_HEADER_OFFSET,
      value,
      true,
    );
  }

  get diskStartNumber(): number | null {
    if (this.isLFH) {
      console.warn(
        "ZIP64 disk start number is not supported for local file headers",
      );
      return null;
    }
    return this.view.getUint32(ZIP64_EXTRA_FIELD.DISK_START_NUMBER, true);
  }

  set diskStartNumber(value: number) {
    if (this.isLFH) {
      console.warn(
        "ZIP64 disk start number is not supported for local file headers",
      );
      return;
    }
    this.view.setUint32(ZIP64_EXTRA_FIELD.DISK_START_NUMBER, value, true);
  }

  static createLFH(
    originalSize?: bigint | number,
    compressedSize?: bigint | number,
  ): Zip64ExtraField {
    const initData = new Uint8Array(
      ExtraField.SIZE + Zip64ExtraField.DATA_SIZE_LFH,
    );
    initData.set([0x01, 0x00, Zip64ExtraField.DATA_SIZE_LFH, 0x00]);
    const field = new Zip64ExtraField(initData.buffer, 0);
    if (originalSize !== undefined) {
      field.uncompressedSize = BigInt(originalSize);
    }
    if (compressedSize !== undefined) {
      field.compressedSize = BigInt(compressedSize);
    }
    return field;
  }

  static createCDH(
    originalSize?: bigint | number,
    compressedSize?: bigint | number,
    relativeHeaderOffset?: bigint | number,
    diskStartNumber?: number,
  ): Zip64ExtraField {
    const initData = new Uint8Array(
      ExtraField.SIZE + Zip64ExtraField.DATA_SIZE_CDH,
    );
    initData.set([0x01, 0x00, Zip64ExtraField.DATA_SIZE_CDH, 0x00]);
    const field = new Zip64ExtraField(initData.buffer, 0);
    if (originalSize !== undefined) {
      field.uncompressedSize = BigInt(originalSize);
    }
    if (compressedSize !== undefined) {
      field.compressedSize = BigInt(compressedSize);
    }
    if (relativeHeaderOffset !== undefined) {
      field.relativeHeaderOffset = BigInt(relativeHeaderOffset);
    }
    if (diskStartNumber !== undefined) field.diskStartNumber = diskStartNumber;
    return field;
  }
}

class UniversalTimeExtraField extends ExtraField {
  static readonly ID = 0x5455;
  static readonly FLAGS = {
    MTIME: 0x01,
    ATIME: 0x02,
    CTIME: 0x04,
  } as const;

  constructor(buffer: ArrayBuffer, byteOffset: number) {
    super(buffer, byteOffset);
    if (this.id !== UniversalTimeExtraField.ID) {
      throw new Error("Invalid Universal Time extra field");
    }
    // Size should be 1 (flags) + 4 bytes per timestamp
    const expectedSizes = [1, 5, 9, 13]; // flags only, +mtime, +atime, +ctime
    if (!expectedSizes.includes(this.dataSize)) {
      throw new Error("Invalid Universal Time extra field size");
    }
  }

  get flags(): number {
    return this.view.getUint8(EXTRA_FIELD.DATA_START);
  }
  set flags(value: number) {
    this.view.setUint8(EXTRA_FIELD.DATA_START, value);
  }

  get modificationTime(): Date | null {
    if (!(this.flags & UniversalTimeExtraField.FLAGS.MTIME)) return null;
    const timestamp = this.view.getUint32(EXTRA_FIELD.DATA_START + 1, true);
    return new Date(timestamp * 1000);
  }
  set modificationTime(value: Date | null) {
    if (!value) {
      this.flags &= ~UniversalTimeExtraField.FLAGS.MTIME;
      return;
    }
    this.flags |= UniversalTimeExtraField.FLAGS.MTIME;
    this.view.setUint32(
      EXTRA_FIELD.DATA_START + 1,
      Math.floor(value.getTime() / 1000),
      true,
    );
  }

  get accessTime(): Date | null {
    if (!(this.flags & UniversalTimeExtraField.FLAGS.ATIME)) return null;
    const timestamp = this.view.getUint32(EXTRA_FIELD.DATA_START + 5, true);
    return new Date(timestamp * 1000);
  }
  set accessTime(value: Date | null) {
    if (!value) {
      this.flags &= ~UniversalTimeExtraField.FLAGS.ATIME;
      return;
    }
    this.flags |= UniversalTimeExtraField.FLAGS.ATIME;
    this.view.setUint32(
      EXTRA_FIELD.DATA_START + 5,
      Math.floor(value.getTime() / 1000),
      true,
    );
  }

  get creationTime(): Date | null {
    if (!(this.flags & UniversalTimeExtraField.FLAGS.CTIME)) return null;
    const timestamp = this.view.getUint32(EXTRA_FIELD.DATA_START + 9, true);
    return new Date(timestamp * 1000);
  }
  set creationTime(value: Date | null) {
    if (!value) {
      this.flags &= ~UniversalTimeExtraField.FLAGS.CTIME;
      return;
    }
    this.flags |= UniversalTimeExtraField.FLAGS.CTIME;
    this.view.setUint32(
      EXTRA_FIELD.DATA_START + 9,
      Math.floor(value.getTime() / 1000),
      true,
    );
  }

  static create(
    mtime?: Date,
    atime?: Date,
    ctime?: Date,
  ): UniversalTimeExtraField {
    let flags = 0;
    let size = 1; // Start with flags byte
    if (mtime) {
      flags |= UniversalTimeExtraField.FLAGS.MTIME;
      size += 4;
    }
    if (atime) {
      flags |= UniversalTimeExtraField.FLAGS.ATIME;
      size += 4;
    }
    if (ctime) {
      flags |= UniversalTimeExtraField.FLAGS.CTIME;
      size += 4;
    }

    const initData = new Uint8Array(ExtraField.SIZE + size);
    initData.set([0x55, 0x54, size, 0x00]); // ID and size
    const field = new UniversalTimeExtraField(initData.buffer, 0);
    field.flags = flags;
    if (mtime) field.modificationTime = mtime;
    if (atime) field.accessTime = atime;
    if (ctime) field.creationTime = ctime;
    return field;
  }
}

class UnixUidGidExtraField extends ExtraField {
  static readonly ID = 0x7875;

  constructor(buffer: ArrayBuffer, byteOffset: number) {
    super(buffer, byteOffset);
    if (this.id !== UnixUidGidExtraField.ID) {
      throw new Error("Invalid Unix UID/GID extra field");
    }
    const expectedSize = 3 + this.uidSize + this.gidSize; // version + sizes + values
    if (this.dataSize !== expectedSize) {
      throw new Error("Invalid Unix UID/GID extra field size");
    }
  }

  get version(): number {
    return this.view.getUint8(EXTRA_FIELD.DATA_START);
  }
  set version(value: number) {
    this.view.setUint8(EXTRA_FIELD.DATA_START, value);
  }

  get uidSize(): number {
    return this.view.getUint8(EXTRA_FIELD.DATA_START + 1);
  }
  set uidSize(value: number) {
    this.view.setUint8(EXTRA_FIELD.DATA_START + 1, value);
  }

  get uid(): number {
    switch (this.uidSize) {
      case 1:
        return this.view.getUint8(EXTRA_FIELD.DATA_START + 2);
      case 2:
        return this.view.getUint16(EXTRA_FIELD.DATA_START + 2, true);
      case 4:
        return this.view.getUint32(EXTRA_FIELD.DATA_START + 2, true);
      case 8:
        return Number(this.view.getBigUint64(EXTRA_FIELD.DATA_START + 2, true));
      default:
        throw new Error("Invalid Unix UID size");
    }
  }
  set uid(value: number) {
    switch (this.uidSize) {
      case 1:
        this.view.setUint8(EXTRA_FIELD.DATA_START + 2, value);
        break;
      case 2:
        this.view.setUint16(EXTRA_FIELD.DATA_START + 2, value, true);
        break;
      case 4:
        this.view.setUint32(EXTRA_FIELD.DATA_START + 2, value, true);
        break;
      case 8:
        this.view.setBigUint64(EXTRA_FIELD.DATA_START + 2, BigInt(value), true);
        break;
      default:
        throw new Error("Invalid Unix UID size");
    }
  }

  get gidSize(): number {
    return this.view.getUint8(EXTRA_FIELD.DATA_START + 1 + this.uidSize);
  }
  set gidSize(value: number) {
    this.view.setUint8(EXTRA_FIELD.DATA_START + 1 + this.uidSize, value);
  }

  get gid(): number {
    switch (this.gidSize) {
      case 1:
        return this.view.getUint8(EXTRA_FIELD.DATA_START + 3 + this.uidSize);
      case 2:
        return this.view.getUint16(
          EXTRA_FIELD.DATA_START + 3 + this.uidSize,
          true,
        );
      case 4:
        return this.view.getUint32(
          EXTRA_FIELD.DATA_START + 3 + this.uidSize,
          true,
        );
      case 8:
        return Number(
          this.view.getBigUint64(
            EXTRA_FIELD.DATA_START + 3 + this.uidSize,
            true,
          ),
        );
      default:
        throw new Error("Invalid Unix GID size");
    }
  }
  set gid(value: number) {
    switch (this.gidSize) {
      case 1:
        this.view.setUint8(EXTRA_FIELD.DATA_START + 3 + this.uidSize, value);
        break;
      case 2:
        this.view.setUint16(
          EXTRA_FIELD.DATA_START + 3 + this.uidSize,
          value,
          true,
        );
        break;
      case 4:
        this.view.setUint32(
          EXTRA_FIELD.DATA_START + 3 + this.uidSize,
          value,
          true,
        );
        break;
      case 8:
        this.view.setBigUint64(
          EXTRA_FIELD.DATA_START + 3 + this.uidSize,
          BigInt(value),
          true,
        );
        break;
      default:
        throw new Error("Invalid Unix GID size");
    }
  }
}
