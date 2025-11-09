import { ZIP64_END_OF_CENTRAL_DIR } from "./constants/offsets";
import { ZIP_VERSION } from "./constants/versions";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  RECORD_SIZE,
  VERSION_MADE_BY,
  VERSION_NEEDED,
  DISK_NUMBER,
  DISK_WITH_CD_START,
  ENTRIES_ON_DISK,
  TOTAL_ENTRIES,
  CENTRAL_DIRECTORY_SIZE,
  CENTRAL_DIRECTORY_OFFSET,
  COMMENT_START,
} = ZIP64_END_OF_CENTRAL_DIR;

export class Zip64EndOfCentralDirectoryRecord<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends DataView<BufType> {
  static readonly SIGNATURE = 0x06064b50;
  static readonly SIZE = 56;

  static create(): Zip64EndOfCentralDirectoryRecord {
    const buffer = new ArrayBuffer(Zip64EndOfCentralDirectoryRecord.SIZE);
    const view = new DataView(buffer);
    view.setUint32(
      SIGNATURE_OFFSET,
      Zip64EndOfCentralDirectoryRecord.SIGNATURE,
      true,
    );
    const eocd64 = new Zip64EndOfCentralDirectoryRecord(buffer);
    eocd64.recordSize = RECORD_SIZE;
    return eocd64;
  }

  constructor(buffer: BufType, byteOffset: number = 0) {
    super(buffer, byteOffset);
  }

  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get recordSize(): number {
    const value = this.getBigUint64(RECORD_SIZE, true);
    // Technically this limit is incorrect but bigint values are inconvenient
    // and Number.MAX_SAFE_INTEGER = 9007199254740991 bytes or ~9 Petabyte
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }
  set recordSize(value: number) {
    this.setBigUint64(RECORD_SIZE, BigInt(value), true);
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

  get diskNumber(): number {
    return this.getUint32(DISK_NUMBER, true);
  }
  set diskNumber(value: number) {
    this.setUint32(DISK_NUMBER, value, true);
  }

  get centralDirectoryDisk(): number {
    return this.getUint32(DISK_WITH_CD_START, true);
  }
  set centralDirectoryDisk(value: number) {
    this.setUint32(DISK_WITH_CD_START, value, true);
  }

  get entriesOnDisk(): number {
    const value = this.getBigUint64(ENTRIES_ON_DISK, true);
    // Technically this limit is incorrect but bigint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }
  set entriesOnDisk(value: number) {
    this.setBigUint64(ENTRIES_ON_DISK, BigInt(value), true);
  }

  get totalEntries(): number {
    const value = this.getBigUint64(TOTAL_ENTRIES, true);
    // Technically this limit is incorrect but bigint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }
  set totalEntries(value: number) {
    this.setBigUint64(TOTAL_ENTRIES, BigInt(value), true);
  }

  get centralDirectorySize(): number {
    const value = this.getBigUint64(CENTRAL_DIRECTORY_SIZE, true);
    // Technically this limit is incorrect but bigint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }
  set centralDirectorySize(value: number) {
    this.setBigUint64(CENTRAL_DIRECTORY_SIZE, BigInt(value), true);
  }

  get centralDirectoryOffset(): number {
    const value = this.getBigUint64(CENTRAL_DIRECTORY_OFFSET, true);
    // Technically this limit is incorrect but bigint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }
  set centralDirectoryOffset(value: number) {
    this.setBigUint64(CENTRAL_DIRECTORY_OFFSET, BigInt(value), true);
  }

  get comment(): string {
    const bytes = new Uint8Array(
      this.buffer,
      this.byteOffset + COMMENT_START,
      this.byteLength - COMMENT_START,
    );
    return new TextDecoder().decode(bytes);
  }

  set comment(value: string) {
    const bytes = new TextEncoder().encode(value);
    const view = new Uint8Array(this.buffer, this.byteOffset + COMMENT_START);
    view.set(bytes);
    this.recordSize =
      Zip64EndOfCentralDirectoryRecord.SIZE - 12 + bytes.byteLength;
  }

  override get byteLength(): number {
    return this.recordSize + 12;
  }
}
