/*
  TODO: Make all properties optional, according to spec: The order of the fields
        in the zip64 extended information record is fixed, but the fields MUST
        only appear if the corresponding Local or Central directory record field
        is set to 0xFFFF or 0xFFFFFFFF.
*/

import { ZIP64_EXTRA_FIELD } from "../constants/offsets";
import { ExtraField } from "./index";

/** @see https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT#:~:text=4.5.3%20%2DZip64%20Extended%20Information%20Extra%20Field%20(0x0001) */
export class Zip64ExtraField<
  BufType extends ArrayBufferLike = ArrayBufferLike,
> extends ExtraField<BufType> {
  static readonly ID = 0x0001;
  static readonly DATA_SIZE_LFH = 16; // Local file header
  static readonly DATA_SIZE_CDH = 28; // Central directory header
  private readonly isLFH: boolean;

  constructor(buffer: BufType, byteOffset: number) {
    super(buffer, byteOffset);
    if (this.id !== Zip64ExtraField.ID) {
      throw new Error("Invalid ZIP64 extra field");
    }
    this.isLFH =
      this.byteLength === ExtraField.BASE_SIZE + Zip64ExtraField.DATA_SIZE_LFH;
    if (
      !this.isLFH &&
      this.byteLength !== ExtraField.BASE_SIZE + Zip64ExtraField.DATA_SIZE_CDH
    ) {
      throw new Error("Invalid ZIP64 extra field size");
    }
  }

  get uncompressedSize(): number {
    const value = this.view.getBigUint64(ZIP64_EXTRA_FIELD.ORIGINAL_SIZE, true);
    // Technically this limit is incorrect but bitint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }

  set uncompressedSize(value: number) {
    this.view.setBigUint64(
      ZIP64_EXTRA_FIELD.ORIGINAL_SIZE,
      BigInt(value),
      true,
    );
  }

  get compressedSize(): number {
    const value = this.view.getBigUint64(
      ZIP64_EXTRA_FIELD.COMPRESSED_SIZE,
      true,
    );
    // Technically this limit is incorrect but bitint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }

  set compressedSize(value: number) {
    this.view.setBigUint64(
      ZIP64_EXTRA_FIELD.COMPRESSED_SIZE,
      BigInt(value),
      true,
    );
  }

  get relativeHeaderOffset(): number | null {
    if (this.isLFH) {
      console.warn(
        "ZIP64 relative header offset is not supported for local file headers",
      );
      return null;
    }
    const value = this.view.getBigUint64(
      ZIP64_EXTRA_FIELD.RELATIVE_HEADER_OFFSET,
      true,
    );
    // Technically this limit is incorrect but bitint values are inconvenient
    if (value >= Number.MAX_SAFE_INTEGER) return NaN;
    return Number(value);
  }

  set relativeHeaderOffset(value: number) {
    if (this.isLFH) {
      console.warn(
        "ZIP64 relative header offset is not supported for local file headers",
      );
      return;
    }
    this.view.setBigUint64(
      ZIP64_EXTRA_FIELD.RELATIVE_HEADER_OFFSET,
      BigInt(value),
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
    originalSize?: number,
    compressedSize?: number,
  ): Zip64ExtraField {
    const initData = new Uint8Array(
      ExtraField.BASE_SIZE + Zip64ExtraField.DATA_SIZE_LFH,
    );
    initData.set([0x01, 0x00, Zip64ExtraField.DATA_SIZE_LFH, 0x00]);
    const field = new Zip64ExtraField(initData.buffer, 0);
    if (originalSize !== undefined) field.uncompressedSize = originalSize;
    if (compressedSize !== undefined) field.compressedSize = compressedSize;
    return field;
  }

  static createCDH(
    originalSize?: number,
    compressedSize?: number,
    relativeHeaderOffset?: number,
    diskStartNumber?: number,
  ): Zip64ExtraField {
    const initData = new Uint8Array(
      ExtraField.BASE_SIZE + Zip64ExtraField.DATA_SIZE_CDH,
    );
    initData.set([0x01, 0x00, Zip64ExtraField.DATA_SIZE_CDH, 0x00]);
    const field = new Zip64ExtraField(initData.buffer, 0);
    if (originalSize !== undefined) field.uncompressedSize = originalSize;
    if (compressedSize !== undefined) field.compressedSize = compressedSize;
    if (relativeHeaderOffset !== undefined)
      field.relativeHeaderOffset = relativeHeaderOffset;
    if (diskStartNumber !== undefined) field.diskStartNumber = diskStartNumber;
    return field;
  }
}
