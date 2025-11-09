import { EXTRA_FIELD } from "../constants/offsets";
import { ExtraField } from "./index";

export class UnixUidGidExtraField<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends ExtraField<BufType> {
  static readonly ID = 0x7875;

  constructor(buffer: BufType, byteOffset: number) {
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
