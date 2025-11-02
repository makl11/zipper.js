import { ZIP64_END_OF_CENTRAL_DIR_LOCATOR } from "./constants/offsets.js";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  DISK_NUMBER,
  CD_OFFSET,
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

  get zip64EOCDRDisk(): number {
    return this.getUint32(DISK_NUMBER, true);
  }
  set zip64EOCDRDisk(value: number) {
    this.setUint32(DISK_NUMBER, value, true);
  }

  get zip64EOCDROffset(): bigint {
    return this.getBigUint64(CD_OFFSET, true);
  }
  set zip64EOCDROffset(value: bigint) {
    this.setBigUint64(CD_OFFSET, value, true);
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
