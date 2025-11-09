import { EXTRA_FIELD } from "../constants/offsets";

export class ExtraField<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends Uint8Array<BufType> {
  static readonly ID: number = 0x0000;
  static readonly BASE_SIZE: number = 4; // Size of fixed portion
  protected view: DataView;

  constructor(buffer: BufType, byteOffset: number) {
    const dataSize = new DataView(buffer, byteOffset).getUint16(
      EXTRA_FIELD.SIZE,
      true,
    );
    super(buffer, byteOffset, ExtraField.BASE_SIZE + dataSize);
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

  is(field: typeof ExtraField<BufType>): boolean {
    return this.id === field.ID;
  }

  as<T extends typeof ExtraField<BufType>>(field: T) {
    if (!this.is(field)) return null;
    const instance = new field(this.buffer, this.byteOffset);
    return instance as InstanceType<T>;
  }
}
