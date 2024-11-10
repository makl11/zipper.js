import { crc32 } from "crc";

/**
 * @typedef {Object} MetaData
 * A file entry to be stored in the zip archive
 * @property {string} name
 * The name of the file inside the zip archive (including path) e.g. `foo/bar.txt`. \
 * The path separator is always `/` (forward slash) and is not affected by the OS. \
 * The name must not contain a drive or device letter, or a leading slash.
 * @property {Date} [mTime]
 * The last modified date of the file.
 * @export
 */

/** @typedef {MetaData & { _type: "file" | "dir", data: Uint8Array | ReadableStream<Uint8Array> | undefined, size: number}} _ZipEntry */
/** @typedef {MetaData & { _type: "dir",  data?: null,                      size?: null   }} ZipDir        */
/** @typedef {MetaData & { _type: "file", data: Uint8Array,                 size?: null   }} ZipFileBuffer */
/** @typedef {MetaData & { _type: "file", data: ReadableStream<Uint8Array>, size:  number }} ZipFileStream */

/** @typedef {ZipDir | ZipFileBuffer | ZipFileStream} ZipEntry */

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
   * @readonly
   */
  textEnc = new TextEncoder();

  /**
   * @type {_ZipEntry[]}
   * @memberof Zipper
   * @readonly
   */
  queue = [];

  /**
   * @type {number}
   * @memberof Zipper
   */
  centralDirSize = 0;

  /**
   * @type {number}
   * @memberof Zipper
   */
  centralDirStartOffset = 0;

  /**
   * @type {number}
   * @memberof Zipper
   */
  bytesWritten = 0;

  /**
   * Encodes a number (int) as bytes in little endian order
   *
   * @param {number} num integer only, decimals get rounded with `Math.ceil`
   * @param {number} [byteCount=4] Number of bytes to encode
   * @returns {Uint8Array}
   * @memberof Zipper
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
   * @param {Date} [date]
   * @return {number}
   * @memberof Zipper
   */
  dateToDOSTime(date) {
    if (!date) return 0

    const year = date.getUTCFullYear()

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
   * @param {_ZipEntry} entry
   * @param {number} [crc=0]
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  generateLocalFileHeader(entry, crc = 0) {
    const size = entry._type === "file" ? entry.size : 0;
    const useZip64 = size > 0xffffffff;
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
      ...this.encodeNumber(this.dateToDOSTime(entry.mTime)),
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
   * @param {_ZipEntry} entry
   * @param {number} relativeOffset
   * @param {number} crc
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  generateCentralDirectoryHeader(entry, relativeOffset, crc) {
    const size = entry._type === "file" ? entry.size : 0;
    const useZip64 = size > 0xffffffff || relativeOffset > 0xffffffff;
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
      ...this.encodeNumber(this.dateToDOSTime(entry.mTime)),
      // CRC-32 of uncompressed data
      ...this.encodeNumber(crc),
      // Compressed size
      ...this.encodeNumber(useZip64 ? 0xffffffff : size),
      // Uncompressed size
      ...this.encodeNumber(useZip64 ? 0xffffffff : size),
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
        ...this.encodeNumber(size, 8),
        // Compressed size
        ...this.encodeNumber(size, 8),
        // Relative offset of local header
        ...this.encodeNumber(relativeOffset, 8),
      ] : []),
      // File comment
      ...[],
    ])
  }

  /**
   * @param {number} queueSize
   * @param {number} centralDirOffset
   * @param {number} centralDirSize
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  generateZip64EndOfCentralDirectoryRecord(queueSize, centralDirOffset, centralDirSize) {
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
      ...this.encodeNumber(queueSize, 8),
      // Total number of central directory records
      ...this.encodeNumber(queueSize, 8),
      // Size of central directory (bytes)
      ...this.encodeNumber(centralDirSize, 8),
      // Offset of start of central directory, relative to start of archive
      ...this.encodeNumber(centralDirOffset, 8),
      // ZIP64 extensible data sector
      ...[],
    ]);
  }

  /**
   * @param {number} centralDirOffset
   * @param {number} centralDirSize
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  generateZip64EndOfCentralDirectoryLocator(centralDirOffset, centralDirSize) {
    return new Uint8Array([
      // ZIP64 end of central directory locator signature = 0x07064b50 ("PK\6\7")
      0x50, 0x4b, 0x06, 0x07,
      // Disk where ZIP64 end of central directory starts = 0
      0x00, 0x00, 0x00, 0x00,
      // Offset of ZIP64 end of central directory record
      ...this.encodeNumber(centralDirOffset + centralDirSize, 8),
      // Total number of disks = 1
      0x01, 0x00, 0x00, 0x00
    ]);
  }

  /**
   * @param {number} queueSize
   * @param {number} centralDirOffset
   * @param {number} centralDirSize
   * @param {boolean} [useZip64=false]
   * @returns {Uint8Array}
   * @memberof Zipper
   */
  generateEndOfCentralDirectoryRecord(queueSize, centralDirOffset, centralDirSize, useZip64 = false) {
    return new Uint8Array([
      // End of central directory signature = 0x06054b50 ("PK\5\6")
      0x50, 0x4b, 0x05, 0x06,
      // Number of this disk = 0
      0x00, 0x00,
      // Disk where central directory starts = 0
      0x00, 0x00,
      // Number of central directory records on this disk
      ...this.encodeNumber(useZip64 ? 0xffff : queueSize, 2),
      // Total number of central directory records
      ...this.encodeNumber(useZip64 ? 0xffff : queueSize, 2),
      // Size of central directory (bytes)
      ...this.encodeNumber(useZip64 ? 0xffffffff : centralDirSize),
      // Offset of start of central directory, relative to start of archive
      ...this.encodeNumber(useZip64 ? 0xffffffff : centralDirOffset),
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
   * @returns {AsyncGenerator<Uint8Array, void, Uint8Array>}
   * @memberof Zipper
   */
  async *generateZipData() {
    let useZip64Archive = this.queue.length > 0xffff
    /** @type {{[name: string]: number}} */
    const relativeLFHeaderOffsets = {}
    /** @type {{[name: string]: number}} */
    const crc32Cache = {}

    for (const entry of this.queue) {
      relativeLFHeaderOffsets[entry.name] = this.bytesWritten
      const size = entry._type === "file" ? entry.size : 0;
      useZip64Archive = useZip64Archive || (entry._type === "file" && size > 0xffffffff)

      if (entry._type === "file" && entry.data instanceof ReadableStream) {
        const header = this.generateLocalFileHeader(entry);
        this.bytesWritten += header.byteLength;
        yield header;
        let crc;
        let size = 0;
        // @ts-expect-error async iterator is only available in firefox
        for await (const chunk of entry.data) {
          crc = crc32(chunk, crc);
          size += chunk.byteLength;
          yield chunk;
        }
        crc = crc ?? 0
        this.bytesWritten += size;
        crc32Cache[entry.name] = crc
        this.bytesWritten += (size > 0xffffffff ? 24 : 16); // size of data descriptor
        yield this.generateDataDescriptor(crc, size);
      } else if (entry._type === "file" && entry.data instanceof Uint8Array) {
        crc32Cache[entry.name] = crc32(entry.data)
        const header = this.generateLocalFileHeader(entry, crc32Cache[entry.name]);
        this.bytesWritten += header.byteLength;
        yield header;
        if (size > 0) {
          this.bytesWritten += size;
          yield entry.data;
        }
      } else {
        const header = this.generateLocalFileHeader(entry, crc32Cache[entry.name]);
        this.bytesWritten += header.byteLength;
        yield header;
      }
    }

    this.centralDirStartOffset = this.bytesWritten;
    for (const entry of this.queue) {
      useZip64Archive = useZip64Archive || relativeLFHeaderOffsets[entry.name] > 0xffffffff
      const cdfh = this.generateCentralDirectoryHeader(
        entry,
        relativeLFHeaderOffsets[entry.name],
        crc32Cache[entry.name],
      );
      this.bytesWritten += cdfh.byteLength;
      yield cdfh;
    }
    this.centralDirSize = this.bytesWritten - this.centralDirStartOffset;

    useZip64Archive = useZip64Archive || this.centralDirStartOffset > 0xffffffff || this.centralDirSize > 0xffffffff

    if (useZip64Archive) {
      yield this.generateZip64EndOfCentralDirectoryRecord(this.queue.length, this.centralDirStartOffset, this.centralDirSize);
      yield this.generateZip64EndOfCentralDirectoryLocator(this.centralDirStartOffset, this.centralDirSize);
    }

    yield this.generateEndOfCentralDirectoryRecord(this.queue.length, this.centralDirStartOffset, this.centralDirSize, useZip64Archive);
  }

  /**
   * Queue an entry to be zipped later on when streaming the zip file content.
   *
   * @overload
   * @param {MetaData} metadata
   * @returns {this}
   * @memberof Zipper
   *
   * @overload
   * @param {MetaData} metadata
   * @param {Uint8Array} data
   * @returns {this}
   * @memberof Zipper
   *
   * @overload
   * @param {MetaData} metadata
   * @param {ReadableStream<Uint8Array>} data
   * @param {number} size
   * @returns {this}
   * @memberof Zipper
   *
   * @param {MetaData} metadata
   * @param {Uint8Array | ReadableStream<Uint8Array>} [data]
   * @param {number} [size]
   * @returns {this}
   * @memberof Zipper
   */
  add({ name, mTime }, data, size) {
    if (!name) throw new Error("Path is required");

    /** @type {"file" | "dir"} */
    let _type;

    if (name.endsWith("/")) {
      if (data) throw new Error("Directory cannot have data");
      if (size !== undefined) throw new Error("Directory cannot have size");
      _type = "dir"
      size = 0
    }

    else if (data === undefined) throw new Error("Data is required");

    else if (data instanceof Uint8Array) {
      if (size !== undefined) {
        throw new Error("Size is not allowed for Uint8Array data");
      }
      _type = "file"
      size = data.byteLength
    }

    else if (data instanceof ReadableStream) {
      if (size === undefined) {
        throw new Error("Size is required for ReadableStream data");
      }
      _type = "file"
    }

    else throw new Error("Data must be a Uint8Array or ReadableStream");

    this.queue.push({
      _type,
      name,
      mTime,
      data,
      size,
    });

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
      totalSize += 30 + name.length /* + comment.length */; // local file header
      if (size > 0xffffffff) totalSize += 20; //  local file header zip64 extra field
      if (data instanceof ReadableStream) {
        totalSize += size > 0xffffffff ? 24 : 16; // data descriptor
      }
      totalSize += 46 + name.length /* + comment.length */; // central directory file header
      totalSize += size; // file data
      isZip64 = isZip64 || size > 0xffffffff || totalSize > 0xffffffff;
      return totalSize;
    }, 0);
    return (
      // Note: This implementation has no way to add comments
      22 /* + comment length */ + // end of central directory record
      (isZip64 ? 56 : 0) + // zip64 end of central directory record
      (isZip64 ? 20 : 0) + // zip64 end of central directory locator
      entriesTotalSize
    )
  }

  /**
   * Start streaming the zip content
   *
   * @return {ReadableStream<Uint8Array>}
   * @memberof Zipper
   */
  stream() {
    const generator = this.generateZipData()
    return new ReadableStream({
      type: "bytes",
      start(controller) { },
      async pull(controller) {
        try {
          const { value, done } = await generator.next()
          if (done) controller.close()
          if (value) controller.enqueue(value);
          else throw new Error("invalid chunk", { cause: value })
        } catch (error) {
          controller.error(error);
          throw error;
        }
      },
      cancel(reason) {
        throw new Error("Zipper was canceled by the output stream", {
          cause: reason,
        });
      },
    });
  }
}

export default Zipper;
