import { ZIP64_END_OF_CENTRAL_DIR_LOCATOR } from "./constants/offsets";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  EOCD64_DISK_NUMBER: DISK_NUMBER,
  EOCD64_OFFSET: CD_OFFSET,
  TOTAL_DISKS,
} = ZIP64_END_OF_CENTRAL_DIR_LOCATOR;

export class Zip64EndOfCentralDirectoryLocator<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends DataView<BufType> {
  static readonly SIGNATURE = 0x07064b50;
  static readonly SIZE = 20;

  static create(): Zip64EndOfCentralDirectoryLocator {
    const buffer = new ArrayBuffer(Zip64EndOfCentralDirectoryLocator.SIZE);
    const view = new DataView(buffer);
    view.setUint32(
      SIGNATURE_OFFSET,
      Zip64EndOfCentralDirectoryLocator.SIGNATURE,
      true,
    );
    return new Zip64EndOfCentralDirectoryLocator(buffer);
  }

  constructor(buffer: BufType, byteOffset: number = 0) {
    super(buffer, byteOffset);
  }

  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get eocd64Disk(): number {
    return this.getUint32(DISK_NUMBER, true);
  }
  set eocd64Disk(value: number) {
    this.setUint32(DISK_NUMBER, value, true);
  }

  get eocd64Offset(): number {
    const value = this.getBigUint64(CD_OFFSET, true);
    // Technically this limit is incorrect but bigint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }
  set eocd64Offset(value: number) {
    this.setBigUint64(CD_OFFSET, BigInt(value), true);
  }

  get totalDisks(): number {
    return this.getUint32(TOTAL_DISKS, true);
  }
  set totalDisks(value: number) {
    this.setUint32(TOTAL_DISKS, value, true);
  }

  override get byteLength(): number {
    return Zip64EndOfCentralDirectoryLocator.SIZE;
  }
}
