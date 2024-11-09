import { FEATURES_VERSION, ZIP_VERSION } from "./constants/versions.js";
import { ZIP64_END_OF_CENTRAL_DIR } from "./constants/offsets.js";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  RECORD_SIZE,
  VERSION_MADE_BY,
  VERSION_NEEDED,
  DISK_NUMBER,
  DISK_WITH_CD_START,
  ENTRIES_ON_DISK,
  TOTAL_ENTRIES,
  CD_SIZE,
  CD_OFFSET,
} = ZIP64_END_OF_CENTRAL_DIR;

export class Zip64EndOfCentralDirectory extends DataView {
  static readonly SIGNATURE = 0x06064b50;
  static readonly SIZE = 56;

  static create(): Zip64EndOfCentralDirectory {
    const buffer = new ArrayBuffer(Zip64EndOfCentralDirectory.SIZE);
    const view = new DataView(buffer);
    view.setUint32(
      SIGNATURE_OFFSET,
      Zip64EndOfCentralDirectory.SIGNATURE,
      true,
    );
    return new Zip64EndOfCentralDirectory(buffer);
  }

  constructor(buffer: ArrayBuffer, byteOffset: number = 0) {
    super(buffer, byteOffset);
  }

  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get recordSize(): bigint {
    return this.getBigUint64(RECORD_SIZE, true);
  }
  set recordSize(value: bigint) {
    this.setBigUint64(RECORD_SIZE, value, true);
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

  get entriesOnDisk(): bigint {
    return this.getBigUint64(ENTRIES_ON_DISK, true);
  }
  set entriesOnDisk(value: bigint) {
    this.setBigUint64(ENTRIES_ON_DISK, value, true);
  }

  get totalEntries(): bigint {
    return this.getBigUint64(TOTAL_ENTRIES, true);
  }
  set totalEntries(value: bigint) {
    this.setBigUint64(TOTAL_ENTRIES, value, true);
  }

  get centralDirectorySize(): bigint {
    return this.getBigUint64(CD_SIZE, true);
  }
  set centralDirectorySize(value: bigint) {
    this.setBigUint64(CD_SIZE, value, true);
  }

  get centralDirectoryOffset(): bigint {
    return this.getBigUint64(CD_OFFSET, true);
  }
  set centralDirectoryOffset(value: bigint) {
    this.setBigUint64(CD_OFFSET, value, true);
  }

  override get byteLength(): number {
    return Zip64EndOfCentralDirectory.SIZE;
  }
}
