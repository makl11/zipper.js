import { DATA_DESCRIPTOR } from "./constants/offsets.js";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  CRC32,
  COMPRESSED_SIZE,
  UNCOMPRESSED_SIZE,
} = DATA_DESCRIPTOR;

export class DataDescriptor<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends DataView<BufType> {
  static readonly SIGNATURE = 0x08074b50;
  static readonly SIZE = 16;
  static readonly SIZE_ZIP64 = 24;
  private readonly isZip64: boolean;

  static create(zip64: boolean = false): DataDescriptor {
    const buffer = new ArrayBuffer(
      zip64 ? DataDescriptor.SIZE_ZIP64 : DataDescriptor.SIZE,
    );
    const view = new DataView(buffer);
    view.setUint32(SIGNATURE_OFFSET, DataDescriptor.SIGNATURE, true);
    return new DataDescriptor(buffer, 0, zip64);
  }

  constructor(
    buffer: BufType,
    byteOffset: number = 0,
    isZip64: boolean = false,
  ) {
    super(
      buffer,
      byteOffset,
      isZip64 ? DataDescriptor.SIZE_ZIP64 : DataDescriptor.SIZE,
    );
    this.isZip64 = isZip64;
  }

  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get crc32(): number {
    return this.getUint32(CRC32, true);
  }
  set crc32(value: number) {
    this.setUint32(CRC32, value, true);
  }

  get compressedSize(): number | bigint {
    return this.isZip64
      ? this.getBigUint64(COMPRESSED_SIZE, true)
      : this.getUint32(COMPRESSED_SIZE, true);
  }
  set compressedSize(value: number | bigint) {
    if (this.isZip64) {
      this.setBigUint64(COMPRESSED_SIZE, BigInt(value), true);
    } else {
      this.setUint32(COMPRESSED_SIZE, Number(value), true);
    }
  }

  get uncompressedSize(): number | bigint {
    return this.isZip64
      ? this.getBigUint64(UNCOMPRESSED_SIZE + 4, true)
      : this.getUint32(UNCOMPRESSED_SIZE, true);
  }
  set uncompressedSize(value: number | bigint) {
    if (this.isZip64) {
      this.setBigUint64(UNCOMPRESSED_SIZE + 4, BigInt(value), true);
    } else {
      this.setUint32(UNCOMPRESSED_SIZE, Number(value), true);
    }
  }
}
