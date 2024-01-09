import { crc32 } from "crc";

/**
 * @typedef {Object} ZipEntry 
 * A file entry to be stored in the zip archive
 * @property {string} name
 * The name of the file inside the zip archive (including path) e.g. `foo/bar.txt`. \
 * The path separator is always `/` (forward slash) and is not affected by the OS. \
 * The root directory is `/`. \
 * The name must not contain a drive or device letter, or a leading slash.
 * @property {Uint8Array | ReadableStream<Uint8Array>} data 
 * The data to be added to the zip archive.
 * @property {number} size 
 * The size of the data in bytes. Must **always** be set to allow the zipper to predict the final zip size.
 * @property {Date} lastModified 
 * The last modified date of the file.
 * @export
 */

/**
 * A simple zip file packer. \
 * Does and will *not* support compression or encryption. Only unencrypted STORE is supported.
 * @export
 * @class Zipper
 */
class Zipper {
  /**
   * @type {TextEncoder}
   * @memberof Zipper
   * @private
   * @readonly
   */
  textEnc = new TextEncoder();

  /**
   * @type {ZipEntry[]}
   * @memberof Zipper
   * @private
   * @readonly
   */
  queue = [];

  /**
   * @type {number}
   * @memberof Zipper
   * @private
   */
  centralDirSize = 0;

  /**
   * @type {number}
   * @memberof Zipper
   * @private
   */
  centralDirStartOffset = 0;

  /**
   * @type {number}
   * @memberof Zipper
   * @private
   */
  bytesWritten = 0;

  /**
   * Encodes a number (int) as bytes in little endian order
   *
   * @param {number} num integer only, decimals get rounded with `Math.ceil`
   * @param {number} [byteCount=4] Number of bytes to encode
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  encodeNumber(num, byteCount = 4) {
    const out = new Uint8Array(byteCount);
    const bigNum = BigInt(Math.ceil(num));
    while (--byteCount >= 0) {
      out[byteCount] = Number(bigNum >> BigInt(byteCount * 8));
    }
    return out;
  }

  /**
   * @param {Date} date
   * @return {number}
   * @memberof Zipper
   * @private
   */
  dateToDOSTime(date) {
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
   * @param {ZipEntry} entry
   * @param {number} [crc=0]
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  generateLocalFileHeader(entry, crc = 0) {
    const useZip64 = entry.size > 0xffffffff;
    const size = entry.data instanceof ReadableStream ? 0 : entry.size;
    return new Uint8Array([
      // Local file header signature = 0x04034b50 ("PK\3\4")
      0x50, 0x4b, 0x03, 0x04,
      // Version needed to extract (minimum) = 0x14 -> 2.0
      (useZip64 ? 0x2d : 0x14), 0x00,
      // General purpose bit flag
      (entry.data instanceof ReadableStream ? 0x08 : 0x00), 0x00,
      // Compression method = 0 -> None / STORE
      0x00, 0x00,
      // File last modification time and date
      ...this.encodeNumber(this.dateToDOSTime(entry.lastModified)),
      // CRC-32 of uncompressed data
      ...this.encodeNumber(crc),
      // Compressed size
      ...this.encodeNumber(useZip64 ? 0xffffffff : size),
      // Uncompressed size
      ...this.encodeNumber(useZip64 ? 0xffffffff : size),
      // File name length
      ...this.encodeNumber(entry.name.length, 2),
      // Extra field length
      ...(useZip64 ? [0x14, 0x00] : [0x00, 0x00]),
      // File name
      ...this.textEnc.encode(entry.name),
      // Extra field
      ...(useZip64 ? [
        // Extra field header ID for ZIP64
        0x01, 0x00,
        // Extra field data size
        0x10, 0x00,
        // Original uncompressed file size
        ...this.encodeNumber(entry.data instanceof ReadableStream ? 0xffffffff : size, 8),
        // Compressed size
        ...this.encodeNumber(entry.data instanceof ReadableStream ? 0xffffffff : size, 8),
      ] : []),
    ])
  }

  /**
   * @param {number} crc
   * @param {number} size
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  generateDataDescriptor(crc, size) {
    return new Uint8Array([
      // Data descriptor signature = 0x08074b50 ("PK\7\8")
      0x50, 0x4b, 0x07, 0x08,
      // CRC-32 of uncompressed data
      ...this.encodeNumber(crc),
      // Compressed size
      ...this.encodeNumber(size, size > 0xffffffff ? 8 : 4),
      // Uncompressed size
      ...this.encodeNumber(size, size > 0xffffffff ? 8 : 4),
    ]);
  }

  /**
   * @param {ZipEntry} entry
   * @param {number} relativeOffset
   * @param {number} crc
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  generateCentralDirectoryFileHeader(entry, relativeOffset, crc) {
    const useZip64 = entry.size > 0xffffffff || relativeOffset > 0xffffffff;
    return new Uint8Array([
      // Central directory file header signature = 0x02014b50 ("PK\1\2")
      0x50, 0x4b, 0x01, 0x02,
      // Version made by = 0x2d -> 4.5, 0xFF -> Unknown
      0x2d, 0xFF,
      // Version needed to extract (minimum) = 0x14 -> 2.0 or 0x2d -> 4.5 for ZIP64
      (useZip64 ? 0x2d : 0x14), 0x00,
      // General purpose bit flag 
      // TODO: Set Bit 11 to use UTF-8 Filenames
      (entry.data instanceof ReadableStream ? 0x08 : 0x00), 0x00,
      // Compression method = 0 -> None / STORE
      0x00, 0x00,
      // File last modification time and date
      ...this.encodeNumber(this.dateToDOSTime(entry.lastModified)),
      // CRC-32 of uncompressed data
      ...this.encodeNumber(crc),
      // Compressed size
      ...this.encodeNumber(useZip64 ? 0xffffffff : entry.size),
      // Uncompressed size
      ...this.encodeNumber(useZip64 ? 0xffffffff : entry.size),
      // File name length
      ...this.encodeNumber(entry.name.length, 2),
      // Extra field length
      ...(useZip64 ? [0x1C, 0x00] : [0x00, 0x00]),
      // File comment length
      0x00, 0x00,
      // Disk number where file starts (or 0xffff for ZIP64)
      0x00, 0x00,
      // Internal file attributes
      0x00, 0x00,
      // External file attributes
      0x00, 0x00, 0x00, 0x00,
      // Relative offset of local file header
      ...this.encodeNumber(useZip64 ? 0xffffffff : relativeOffset),
      // File name
      ...this.textEnc.encode(entry.name),
      // Extra field
      ...(useZip64 ? [
        // Extra field header ID for ZIP64
        0x01, 0x00,
        // Extra field data size
        0x18, 0x00,
        // Original uncompressed file size
        ...this.encodeNumber(entry.size, 8),
        // Compressed size
        ...this.encodeNumber(entry.size, 8),
        // Relative offset of local header
        ...this.encodeNumber(relativeOffset, 8),
      ] : []),
      // File comment
      ...[],
    ])
  }

  /**
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  generateZip64EndOfCentralDirectoryRecord() {
    return new Uint8Array([
      // ZIP64 end of central directory signature = 0x06064b50 ("PK\6\6")
      0x50, 0x4b, 0x06, 0x06,
      // Size of ZIP64 end of central directory record
      ...this.encodeNumber(44, 8),
      // Version made by
      0x2d, 0xff,
      // Version needed to extract
      0x2d, 0x00,
      // Number of this disk = 0
      0x00, 0x00, 0x00, 0x00,
      // Disk where ZIP64 end of central directory starts = 0
      0x00, 0x00, 0x00, 0x00,
      // Number of central directory records on this disk
      ...this.encodeNumber(this.queue.length, 8),
      // Total number of central directory records
      ...this.encodeNumber(this.queue.length, 8),
      // Size of central directory (bytes)
      ...this.encodeNumber(this.centralDirSize, 8),
      // Offset of start of central directory, relative to start of archive
      ...this.encodeNumber(this.centralDirStartOffset, 8),
      // ZIP64 extensible data sector
      ...[],
    ]);
  }

  /**
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  generateZip64EndOfCentralDirectoryLocator() {
    return new Uint8Array([
      // ZIP64 end of central directory locator signature = 0x07064b50 ("PK\6\7")
      0x50, 0x4b, 0x06, 0x07,
      // Disk where ZIP64 end of central directory starts = 0
      0x00, 0x00, 0x00, 0x00,
      // Offset of ZIP64 end of central directory record
      ...this.encodeNumber(this.centralDirStartOffset + this.centralDirSize, 8),
      // Total number of disks = 1
      0x01, 0x00, 0x00, 0x00
    ]);
  }

  /**
   * @param {boolean} [useZip64=false]
   * @returns {Uint8Array}
   * @memberof Zipper
   * @private
   */
  generateEndOfCentralDirectoryRecord(useZip64 = false) {
    return new Uint8Array([
      // End of central directory signature = 0x06054b50 ("PK\5\6")
      0x50, 0x4b, 0x05, 0x06,
      // Number of this disk = 0
      0x00, 0x00,
      // Disk where central directory starts = 0
      0x00, 0x00,
      // Number of central directory records on this disk
      ...this.encodeNumber(useZip64 ? 0xffff : this.queue.length, 2),
      // Total number of central directory records
      ...this.encodeNumber(useZip64 ? 0xffff : this.queue.length, 2),
      // Size of central directory (bytes)
      ...this.encodeNumber(useZip64 ? 0xffffffff : this.centralDirSize),
      // Offset of start of central directory, relative to start of archive
      ...this.encodeNumber(useZip64 ? 0xffffffff : this.centralDirStartOffset),
      // Comment length (n)
      0x00, 0x00,
      // Comment
      ...[]
    ])
  }

  /**
   * @async
   * @generator
   * @yields {Uint8Array}
   * @returns {AsyncGenerator<Uint8Array>}
   * @memberof Zipper
   * @private
   */
  async *generateZipData() {
    let useZip64Archive = this.queue.length > 0xffff
    /** @type {{[name: string]: number}} */
    const relativeLFHeaderOffsets = {}
    /** @type {{[name: string]: number}} */
    const crc32Cache = {}

    for (const entry of this.queue) {
      relativeLFHeaderOffsets[entry.name] = this.bytesWritten
      useZip64Archive |= entry.size > 0xffffffff

      if (entry.data instanceof ReadableStream) {
        const header = this.generateLocalFileHeader(entry);
        this.bytesWritten += header.byteLength;
        yield header;
        let crc;
        let size = 0;
        for await (const chunk of entry.data) {
          crc = crc32(chunk, crc);
          size += chunk.byteLength;
          yield chunk;
        }
        this.bytesWritten += size;
        crc32Cache[entry.name] = crc
        this.bytesWritten += (entry.size > 0xffffffff ? 24 : 16); // size of data descriptor
        yield this.generateDataDescriptor(crc, size);
      } else {
        crc32Cache[entry.name] = crc32(entry.data)
        const header = this.generateLocalFileHeader(entry, crc32Cache[entry.name]);
        this.bytesWritten += header.byteLength;
        yield header;
        this.bytesWritten += entry.size;
        yield entry.data;
      }
    }

    this.centralDirStartOffset = this.bytesWritten;
    for (const entry of this.queue) {
      useZip64Archive |= relativeLFHeaderOffsets[entry.name] > 0xffffffff
      const cdfh = this.generateCentralDirectoryFileHeader(
        entry,
        relativeLFHeaderOffsets[entry.name],
        crc32Cache[entry.name],
      );
      this.bytesWritten += cdfh.byteLength;
      yield cdfh;
    }
    this.centralDirSize = this.bytesWritten - this.centralDirStartOffset;

    useZip64Archive |= this.centralDirStartOffset > 0xffffffff || this.centralDirSize > 0xffffffff

    if (useZip64Archive) {
      yield this.generateZip64EndOfCentralDirectoryRecord();
      yield this.generateZip64EndOfCentralDirectoryLocator();
    }

    yield this.generateEndOfCentralDirectoryRecord(useZip64Archive);
  }

  /**
   * Queue an entry to be zipped later on when streaming the zip file content.
   *
   * @param {ZipEntry} entry
   * @returns {Zipper} the current instance to allow fluent calls
   * @memberof Zipper
   */
  add(entry) {
    // TODO: Validate entry
    this.queue.push(entry);
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
    let isZip64 = this.queue.length > 0xffff;
    const entriesTotalSize = this.queue.reduce((totalSize, { size, name, data }) => {
      totalSize += 30 + name.length; // local file header
      if (size > 0xffffffff) totalSize += 20; //  local file header zip64 extra field
      if (data instanceof ReadableStream) {
        totalSize += size > 0xffffffff ? 24 : 16; // data descriptor
      }
      totalSize += 46 + name.length; // central directory file header
      if (size > 0xffffffff || totalSize > 0xffffffff) totalSize += 28; // central directory file header zip64 extra field
      totalSize += size; // file data
      isZip64 |= size > 0xffffffff || totalSize > 0xffffffff;
      return totalSize;
    }, 0);
    return (
      22 + // end of central directory record
      (isZip64 ? 56 : 0) + // zip64 end of central directory record
      (isZip64 ? 20 : 0) + // zip64 end of central directory locator
      entriesTotalSize
    )
  }

  /**
   * Start streaming the zip content
   *
   * @return {ReadableStream}
   * @memberof Zipper
   */
  stream() {
    const gen = this.generateZipData.bind(this);
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
