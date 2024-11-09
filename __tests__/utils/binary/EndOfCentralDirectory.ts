import { END_OF_CENTRAL_DIR } from "./constants/offsets.js";

const {
  SIGNATURE: SIGNATURE_OFFSET,
  DISK_NUMBER,
  DISK_WITH_CD_START,
  ENTRIES_ON_DISK,
  TOTAL_ENTRIES,
  SIZE,
  OFFSET,
  COMMENT_LENGTH,
  COMMENT_START,
} = END_OF_CENTRAL_DIR;

export class EndOfCentralDirectory extends DataView {
  static readonly SIGNATURE = 0x06054b50;
  static readonly SIZE = 22;

  static create(): EndOfCentralDirectory {
    const buffer = new ArrayBuffer(EndOfCentralDirectory.SIZE);
    const view = new DataView(buffer);
    view.setUint32(SIGNATURE_OFFSET, EndOfCentralDirectory.SIGNATURE, true);
    return new EndOfCentralDirectory(buffer);
  }

  static find(buffer: ArrayBuffer): EndOfCentralDirectory {
    // TODO: Implement using sliding window from the end of the buffer
    // Note: Since this implementation does not allow for comments, we can use a simple approach
    const eocd = new EndOfCentralDirectory(
      buffer,
      buffer.byteLength - EndOfCentralDirectory.SIZE,
    );
    if (eocd.signature !== EndOfCentralDirectory.SIGNATURE) {
      throw new Error("EndOfCentralDirectory signature not found");
    }
    return eocd;
  }

  constructor(buffer: ArrayBuffer, byteOffset: number = 0) {
    super(buffer, byteOffset);
  }

  get signature(): number {
    return this.getUint32(SIGNATURE_OFFSET, true);
  }

  get diskNumber(): number {
    return this.getUint16(DISK_NUMBER, true);
  }
  set diskNumber(value: number) {
    this.setUint16(DISK_NUMBER, value, true);
  }

  get centralDirectoryDisk(): number {
    return this.getUint16(DISK_WITH_CD_START, true);
  }
  set centralDirectoryDisk(value: number) {
    this.setUint16(DISK_WITH_CD_START, value, true);
  }

  get entriesOnDisk(): number {
    return this.getUint16(ENTRIES_ON_DISK, true);
  }
  set entriesOnDisk(value: number) {
    this.setUint16(ENTRIES_ON_DISK, value, true);
  }

  get totalEntries(): number {
    return this.getUint16(TOTAL_ENTRIES, true);
  }
  set totalEntries(value: number) {
    this.setUint16(TOTAL_ENTRIES, value, true);
  }

  get centralDirectorySize(): number {
    return this.getUint32(SIZE, true);
  }
  set centralDirectorySize(value: number) {
    this.setUint32(SIZE, value, true);
  }

  get centralDirectoryOffset(): number {
    return this.getUint32(OFFSET, true);
  }
  set centralDirectoryOffset(value: number) {
    this.setUint32(OFFSET, value, true);
  }

  get commentLength(): number {
    return this.getUint16(COMMENT_LENGTH, true);
  }
  set commentLength(value: number) {
    this.setUint16(COMMENT_LENGTH, value, true);
  }

  get comment(): string {
    const bytes = new Uint8Array(
      this.buffer,
      this.byteOffset + COMMENT_START,
      this.commentLength,
    );
    return new TextDecoder().decode(bytes);
  }

  set comment(value: string) {
    const bytes = new TextEncoder().encode(value);
    const view = new Uint8Array(this.buffer, this.byteOffset + COMMENT_START);
    view.set(bytes);
    this.commentLength = bytes.byteLength;
  }

  override get byteLength(): number {
    return EndOfCentralDirectory.SIZE + this.commentLength;
  }
}
