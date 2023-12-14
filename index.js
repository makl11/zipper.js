import { crc32 } from "crc";

/**
 * @export
 * @class ZipEntry
 */
export class ZipEntry {
  /** @type {string} */ name;
  /** @type {Uint8Array | ReadableStream} */ data;
  /** @type {number} */ size;
  /** @type {Date} */ lastModified;

  constructor(name, data, size, lastModified) {
    this.name = name
    this.data = data
    this.size = size
    this.lastModified = lastModified
  }
}

/**
 * A simple zip file packer. \
 * Does *not* support ZIP64 (>4GB) (_yet_!) \
 * Does *not* support compression or encryption. Only unencrypted STORE is supported.
 * @export
 * @class Zipper
 */
class Zipper {
  /**
   * @type {TextEncoder}
   * @memberof Zipper
   */
  #textEnc = new TextEncoder();

  /**
   * @type {ZipEntry[]}
   * @memberof Zipper
   */
  #queue = [];

  /**
   * Encodes a number (int) as bytes
   *
   * @param {number} num integer only, decimals get rounded with @func {Number.toFixed}!
   * @param {4 | 2} byteCount Number of bytes to encode
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  #encodeNumber(num, byteCount = 4) {
    num = num.toFixed();
    const out = new Uint8Array(byteCount);
    while (--byteCount >= 0) {
      out[byteCount] = num >> (byteCount * 8);
    }
    return out;
  }

  /**
   * @param {Date} date
   * @return {number}
   * @memberof Zipper
   */
  #dateToDOSTime(date) {
    const year = date.getUTCFullYear();

    if (year < 1980) {
      return 2162688; // 1980-1-1 00:00:00
    }

    if (year >= 2044) {
      return 2141175677; // 2043-12-31 23:59:58
    }

    return (
      ((year - 1980) << 25) |
      ((date.getUTCMonth() + 1) << 21) |
      (date.getUTCDate() << 16) |
      (date.getUTCHours() << 11) |
      (date.getUTCMinutes() << 5) |
      (date.getUTCSeconds() / 2)
    );
  }

  /**
   * Generate Local File Header
   *
   * @generator
   * @param {ZipEntry} entry
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  #generateLocalFileHeader(entry, crc = 0) {
    return new Uint8Array([
      // Local file header signature = 0x04034b50 ("PK\3\4")
      0x50, 0x4b, 0x03, 0x04,
      // Version needed to extract (minimum) = 0x14 -> 2.0
      0x14, 0x00,
      // General purpose bit flag
      (entry.data instanceof ReadableStream ? 0x08 : 0x00), 0x00,
      // Compression method = 0 -> None / STORE
      0x00, 0x00,
      // File last modification time and date
      ...this.#encodeNumber(this.#dateToDOSTime(entry.lastModified)),
      // CRC-32 of uncompressed data
      ...this.#encodeNumber(crc),
      // Compressed size (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(entry.data instanceof ReadableStream ? 0 : entry.size),
      // Uncompressed size (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(entry.data instanceof ReadableStream ? 0 : entry.size),
      // File name length
      ...this.#encodeNumber(entry.name.length, 2),
      // Extra field length
      0x00, 0x00,
      // File name
      ...this.#textEnc.encode(entry.name),
      // Extra field
      ...[]
    ])
  }

  /**
   * Generate a data descriptor
   *
   * @param {number} crc
   * @param {number} size
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  #generateDataDescriptor(crc, size) {
    return new Uint8Array([
      // Data descriptor signature = 0x08074b50 ("PK\7\8")
      0x50, 0x4b, 0x07, 0x08,
      // CRC-32 of uncompressed data
      ...this.#encodeNumber(crc),
      // Compressed size (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(size),
      // Uncompressed size (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(size),
    ]);
  }

  /**
   * Generate Central Directory File Header
   *
   * @param {ZipEntry} entry
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  #generateCentralDirectoryFileHeader(entry, relativeOffset, crc) {
    return new Uint8Array([
      // Central directory file header signature = 0x02014b50 ("PK\1\2")
      0x50, 0x4b, 0x01, 0x02,
      // Version made by = 0x2d -> 4.5, 0xFF -> Unknown
      0x2d, 0xFF,
      // Version needed to extract (minimum) = 0x14 -> 2.0 (change to 4.5 for ZIP64)
      0x14, 0x00,
      // General purpose bit flag 
      // TODO: Set Bit 11 to use UTF-8 Filenames
      (entry.data instanceof ReadableStream ? 0x08 : 0x00), 0x00,
      // Compression method = 0 -> None / STORE
      0x00, 0x00,
      // File last modification time and date
      ...this.#encodeNumber(this.#dateToDOSTime(entry.lastModified)),
      // CRC-32 of uncompressed data
      ...this.#encodeNumber(crc),
      // Compressed size (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(entry.size),
      // Uncompressed size (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(entry.size),
      // File name length
      ...this.#encodeNumber(entry.name.length, 2),
      // Extra field length
      0x00, 0x00,
      // File comment length
      0x00, 0x00,
      // Disk number where file starts (or 0xffff for ZIP64)
      0x00, 0x00,
      // Internal file attributes
      0x00, 0x00,
      // External file attributes
      0x00, 0x00, 0x00, 0x00,
      // Relative offset of local file header (or 0xffffffff for ZIP64). This is
      // the number of bytes between the start of the first disk on which the
      // file occurs, and the start of the local file header. This allows
      // software reading the central directory to locate the position of the
      // file inside the ZIP file.
      ...this.#encodeNumber(relativeOffset),
      // File name
      ...this.#textEnc.encode(entry.name),
      // Extra field
      ...[],
      // File comment
      ...[],
    ])
  }

  /**
   * Generate End of Central Directory Record
   *
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  #generateEndOfCentralDirectoryRecord() {
    return new Uint8Array([
      // End of central directory signature = 0x06054b50 ("PK\5\6")
      0x50, 0x4b, 0x05, 0x06,
      // Number of this disk (or 0xffff for ZIP64) = 0
      0x00, 0x00,
      // Disk where central directory starts (or 0xffff for ZIP64) = 0
      0x00, 0x00,
      // Number of central directory records on this disk (or 0xffff for ZIP64)
      ...this.#encodeNumber(this.#queue.length, 2),
      // Total number of central directory records (or 0xffff for ZIP64)
      ...this.#encodeNumber(this.#queue.length, 2),
      // Size of central directory (bytes) (or 0xffffffff for ZIP64) = TODO
      ...this.#encodeNumber(this.#centralDirSize),
      // Offset of start of central directory, relative to start of archive
      // (or 0xffffffff for ZIP64)
      ...this.#encodeNumber(this.#centralDirStartOffset),
      // Comment length (n)
      0x00, 0x00,
      // Comment
      ...[]
    ])
  }

  #centralDirSize = 0;
  #centralDirStartOffset = 0;

  /**
   * Generate zip binary data
   *
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  async *#generateZipData() {
    const relativeLFHeaderOffsets = {}
    const crc32Cache = {}

    for (const entry of this.#queue) {
      relativeLFHeaderOffsets[entry.name] = this.#centralDirStartOffset

      if (entry.data instanceof ReadableStream) {
        const header = this.#generateLocalFileHeader(entry);
        this.#centralDirStartOffset += header.byteLength;
        yield header;
        let crc;
        let size = 0;
        for await (const chunk of entry.data) {
          crc = crc32(chunk, crc);
          size += chunk.byteLength;
          this.#centralDirStartOffset += chunk.byteLength;
          yield chunk;
        }
        crc32Cache[entry.name] = crc
        this.#centralDirStartOffset += 16; // size of data descriptor
        yield this.#generateDataDescriptor(crc, size);
      } else {
        crc32Cache[entry.name] = crc32(entry.data)
        const header = this.#generateLocalFileHeader(entry, crc32Cache[entry.name]);
        this.#centralDirStartOffset += header.byteLength;
        yield header;
        this.#centralDirStartOffset += entry.size;
        yield entry.data;
      }
    }

    for (const entry of this.#queue) {
      const cdfh = this.#generateCentralDirectoryFileHeader(
        entry,
        relativeLFHeaderOffsets[entry.name],
        crc32Cache[entry.name],
      );
      this.#centralDirSize += cdfh.byteLength;
      yield cdfh;
    }

    yield this.#generateEndOfCentralDirectoryRecord();
  }

  /**
   * Add a zip entry
   *
   * @param {ZipEntry} entry
   * @returns {Zipper} the current instance to allow fluent calls
   * @memberof Zipper
   */
  add({ name, data, size, lastModified }) {
    this.#queue.push(new ZipEntry(name, data, size, lastModified));
    return this;
  }

  /**
   * Predict the size of the final zip file. \
   * Only works because the zip is neither encrypted nor compressed!
   *
   * @return {number}
   * @memberof Zipper
   */
  predictSize() {
    return this.#queue.reduce((totalSize, { size, name, data }) => {
      totalSize += 30 + name.length; // local file header
      totalSize += size; // file data
      if (data instanceof ReadableStream) {
        totalSize += 16; // data descriptor
      }
      totalSize += 46 + name.length; // central directory file header
      return totalSize;
    }, 22); // end of central directory record
  }

  /**
   * Start streaming the zip content
   *
   * @return {ReadableStream}
   * @memberof Zipper
   */
  stream() {
    const gen = this.#generateZipData.bind(this);
    return new ReadableStream({
      type: "bytes",
      async start(controller) {
        try {
          for await (const chunk of gen()) controller.enqueue(chunk);
          controller.close();
        } catch (error) {
          controller.error(error);
          throw error;
        }
      },
      cancel(reason) {
        console.error("Zipper canceled. Reason:", reason);
      },
    });
  }
}

export default Zipper;
