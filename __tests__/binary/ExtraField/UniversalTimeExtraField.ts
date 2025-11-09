import { EXTRA_FIELD } from "../constants/offsets";
import { ExtraField } from "./index";

export class UniversalTimeExtraField<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends ExtraField<BufType> {
  static readonly ID = 0x5455;
  static readonly FLAGS = {
    MTIME: 0x01,
    ATIME: 0x02,
    CTIME: 0x04,
  } as const;

  constructor(buffer: BufType, byteOffset: number) {
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

    const initData = new Uint8Array(ExtraField.BASE_SIZE + size);
    initData.set([0x55, 0x54, size, 0x00]); // ID and size
    const field = new UniversalTimeExtraField(initData.buffer, 0);
    field.flags = flags;
    if (mtime) field.modificationTime = mtime;
    if (atime) field.accessTime = atime;
    if (ctime) field.creationTime = ctime;
    return field;
  }
}
