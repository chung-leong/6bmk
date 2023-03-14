import { Readable } from 'stream';
import { open } from 'fs/promises';
import { inflateRaw, deflateRaw } from 'zlib';
import { calculateCRC32, getDOSDatetime } from './utils.js';

export class ZipFile {
  constructor(path) {
    this.path = path;
    this.file = null;
    this.centralDirectory = null;
  }

  async open() {    
    this.file = await open(this.path);
    try {
      this.centralDirectory = await this.loadCentralDirectory();
    } catch (err) {
      await this.close();
      throw err;
    }
  }

  async close() {
    await this.file.close();
    this.file = null;
  }

  async extractFile(name) {
    if (!this.centralDirectory) {
      throw new Error('File has not been opened yet');
    }
    const record = this.centralDirectory.find(r => r.name === name);
    if (!record) {
      throw new Error(`Cannot find file in archive: ${name}`);
    }
    const { localHeaderOffset, compressedSize, compression } = record;
    const header = Buffer.alloc(30);
    await this.file.read(header, 0, 30, localHeaderOffset);
    const signature = header.readUInt32LE();
    if (signature !== 0x04034b50) {
      throw new Error('Invalid file header');
    }
    const nameLength = header.readUInt16LE(26);
    const extraLength = header.readUInt16LE(28);
    const dataOffset = localHeaderOffset + 30 + nameLength + extraLength;
    const data = Buffer.alloc(compressedSize);
    const { bytesRead } = await this.file.read(data, 0, compressedSize, dataOffset);
    if (bytesRead !== compressedSize) {
      throw new Error('Cannot read the correct number of bytes');
    }
    const uncompressedData = await decompressData(data, compression);
    return uncompressedData;
  }

  async extractTextFile(name, encoding = 'utf8') {
    const buffer = await this.extractFile(name);
    return buffer.toString(encoding);
  }

  async extractJSONFile(name) {
    const text = await this.extractTextFile(name);
    return JSON.parse(text);
  }

  async findCentralDirectory() {
    const { size } = await this.file.stat();
    const headerSize = 22;
    const header = Buffer.alloc(headerSize);
    const maxCommentLength = 65535;
    const offsetLimit = Math.max(0, size - headerSize - maxCommentLength);
    let offset = size - headerSize;
    let found = false;
    while (!found && offset >= offsetLimit) {
      await this.file.read(header, 0, headerSize, offset);
      const signature = header.readUInt32LE();
      if (signature === 0x06054b50) {
        found = true;
      } else {
        // the byte sequence is 0x50 0x4b 0x05 0x06
        const firstByte = signature & 0x000000FF;
        switch (firstByte) {
          case 0x06: offset -= 3; break;
          case 0x05: offset -= 2; break;
          case 0x4b: offset -= 1; break;
          default: offset -= 4;
        }
      }
    }
    if (found) {
      const count = header.readInt16LE(10);
      const size = header.readUInt32LE(12);
      const offset = header.readUInt32LE(16);
      return { count, size, offset };
    } else {
      throw new Error('Unable to find EOCD record');
    }
  }

  async loadCentralDirectory() {
    const records = [];
    const { size, offset } = await this.findCentralDirectory();
    const buffer = Buffer.alloc(size);
    await this.file.read(buffer, 0, size, offset);
    let index = 0;
    while (index < size) {
      const signature = buffer.readUInt32LE(index);
      if (signature !== 0x02014b50) {
        throw new Error('Invalid CD record');
      }
      const nameLength = buffer.readUInt16LE(index + 28);
      const extraLength = buffer.readUInt16LE(index + 30);
      const commentLength = buffer.readUInt16LE(index + 32)
      const headerSize = 46 + nameLength + extraLength + commentLength;
      const header = getBufferSlice(buffer, index, headerSize);
      const flags = header.readUInt16LE(8);
      const compression = header.readUInt16LE(10);
      const compressedSize = header.readUInt32LE(20);
      const uncompressedSize = header.readUInt32LE(24);
      const name = extractName(header, 46, nameLength, flags);
      const localHeaderOffset = header.readUInt32LE(42);
      records.push({
        name,
        compression,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      });
      index += headerSize;
    }
    return records;
  }
}

export function modifyZip(stream, cb) {
  const processStream = async function*() {
    let leftOver = null;
    let extraction = null;
    let dataRead = 0;
    let dataRemaining = 0;
    let currentOffset = 0;
    let localHeaderOffsets = {};
    let centralDirectoryOffset = 0;
    let centralDirectorySize = 0;
    let centralDirectoryRecordCount = 0;
    let transformedFileAttributes = {};
    let omitDataDescriptor = false;
    let dataDescriptorSignature = null;
    for await (let chunk of stream) {
      if (leftOver) {
        chunk = Buffer.concat([ leftOver, chunk ]);
        leftOver = null;
      }
      let index = 0;
      while (index < chunk.length) {
        if (dataRemaining === 0) {
          // expecting a header of some sort
          try {
            const signature = chunk.readUInt32LE(index);
            if (signature === 0x04034b50) {
              // file record
              const nameLength = chunk.readUInt16LE(index + 26);
              const extraLength = chunk.readUInt16LE(index + 28);
              const headerSize = 30 + nameLength + extraLength;
              const header = getBufferSlice(chunk, index, headerSize);
              const flags = header.readUInt16LE(6);
              const compression = header.readUInt16LE(8);
              const compressedSize = header.readUInt32LE(18);
              const name = extractName(header, 30, nameLength, flags);
              const transform = cb(name) || null;
              if (transform instanceof Function) {
                // callback wants a look at the data
                extraction = { header, flags, name, compression, transform, extraLength, data: [] };
                omitDataDescriptor = true;
              } else {
                // just output the header
                localHeaderOffsets[name] = currentOffset;
                currentOffset += headerSize;
                omitDataDescriptor = false;
                yield header;
              }
              index += headerSize;
              if (flags & 0x0008) {
                if (!dataDescriptorSignature) {
                  dataDescriptorSignature = new Uint8Array([ 0x50, 0x4b, 0x07, 0x08 ]);
                }
                dataRemaining = Infinity;
              } else {
                dataRemaining = compressedSize;
              }
              dataRead = 0;
            } else if (signature === 0x08074b50) {
              // data descriptor
              const descriptor = getBufferSlice(chunk, index, 16);
              if (!omitDataDescriptor) {
                currentOffset += 16;
                yield descriptor;
              }
              index += descriptor.length;
            } else if (signature === 0x02014b50) {
              // central directory record
              const nameLength = chunk.readUInt16LE(index + 28);
              const extraLength = chunk.readUInt16LE(index + 30);
              const commentLength = chunk.readUInt16LE(index + 32)
              const headerSize = 46 + nameLength + extraLength + commentLength;
              const header = getBufferSlice(chunk, index, headerSize);
              const flags = header.readUInt16LE(8);
              const name = extractName(header, 46, nameLength, flags);
              const localHeaderOffset = localHeaderOffsets[name];
              if (localHeaderOffset !== undefined) {
                // update local header position
                header.writeUInt32LE(localHeaderOffset, 42);
                const newAttributes = transformedFileAttributes[name];
                if (newAttributes) {
                  const { crc32, compressedSize, uncompressedSize } = newAttributes;
                  // update these as well
                  header.writeUInt16LE(flags & ~0x0008, 8);
                  header.writeUInt32LE(crc32, 16);
                  header.writeUInt32LE(compressedSize, 20);
                  header.writeUInt32LE(uncompressedSize, 24);
                }
                if (centralDirectoryOffset === 0) {
                  centralDirectoryOffset = currentOffset;
                }
                centralDirectoryRecordCount++;
                centralDirectorySize += headerSize;
                currentOffset += headerSize;
                yield header;
              }
              index += headerSize;
            } else if (signature === 0x06054b50) {
              // end of central directory record
              const commentLength = chunk.readUInt16LE(index + 20)
              const headerSize = 22 + commentLength;
              const header = getBufferSlice(chunk, index, headerSize);
              // update record
              header.writeUInt16LE(centralDirectoryRecordCount, 8);
              header.writeUInt16LE(centralDirectoryRecordCount, 10);
              header.writeUInt32LE(centralDirectorySize, 12);
              header.writeUInt32LE(centralDirectoryOffset, 16);
              currentOffset += headerSize;
              yield header;
              index += headerSize;
            } else {
              stream.destroy();
              throw new Error(`Unknown signature ${signature.toString(16)}`);
            }
          } catch (err) {
            if (err instanceof RangeError) {
              // need more data before we can process the header
              leftOver = chunk.subarray(index);
              index += leftOver.length;
            } else {
              throw err;
            }
          }
        } else {
          // processing the data contents
          // get up to the number of bytes remaining from the chunk
          let data = chunk.subarray(index, index + dataRemaining);
          if (dataRemaining === Infinity) {
            // don't know the length, look for data descriptor
            const ddIndex = data.indexOf(dataDescriptorSignature);
            let needMore = false;
            if (ddIndex !== -1) {
              if (ddIndex + 16 < data.length) {
                const header = getBufferSlice(data, ddIndex, 16);
                const compressedSize = header.readUInt32LE(8);
                if (dataRead + ddIndex === compressedSize) {
                  data = data.subarray(0, ddIndex);
                  dataRemaining = data.length;
                }
              } else {
                needMore = true;
              }
            } else {
              // in case the chunk ends in the middle of the data descriptor's signature
              if (data.length >= 3 && Buffer.compare(data.subarray(-3), dataDescriptorSignature.subarray(0, -1)) === 0) {
                needMore = true;
              } else if (data.length >= 2 && Buffer.compare(data.subarray(-2), dataDescriptorSignature.subarray(0, -2)) === 0) {
                needMore = true;
              } else if (data.length >= 1 && Buffer.compare(data.subarray(-1), dataDescriptorSignature.subarray(0, -3)) === 0) {
                needMore = true;
              }
            }
            if (needMore) {
              leftOver = data;
              break;
            }
          }
          if (extraction) {
            // keep the data
            extraction.data.push(data);
          } else {
            // send the data to the output stream
            currentOffset += data.length;
            yield data;
          }
          index += data.length;
          dataRemaining -= data.length;
          dataRead += data.length;
          if (dataRemaining === 0 && extraction) {
            const { header, flags, name, compression, transform, data } = extraction;
            const uncompressedData = await decompressData(data, compression);
            let transformedData = await transform(uncompressedData);
            if (!(transformedData instanceof Buffer) && transformedData !== null) {
              transformedData = Buffer.from(`${transformedData}`);
            }
            if (transformedData) {
              const crc32 = calculateCRC32(transformedData);
              const compressedData = await compressData(transformedData, compression);
              const compressedSize = compressedData.length;
              const uncompressedSize = transformedData.length;
              // remember these for the central directory
              transformedFileAttributes[name] = { crc32, compressedSize, uncompressedSize };
              localHeaderOffsets[name] = currentOffset;
              // update header
              header.writeUInt16LE(flags & ~0x0008, 6);
              header.writeUInt32LE(crc32, 14);
              header.writeUInt32LE(compressedSize, 18);
              header.writeUInt32LE(uncompressedSize, 22);
              // output the header and transformed data
              currentOffset += header.length;
              yield header;
              currentOffset += compressedSize;
              yield compressedData;
            } 
            extraction = null;
          }
        }
      }
    }
  };
  return Readable.from(processStream());
}

export function createZip(items) {
  const processStream = async function*() {
    const zipVersion = 20;
    const lastModified = getDOSDatetime(new Date);
    const centralDirectory = [];
    let currentOffset = 0;
    // local headers and data
    for await (const { name, data, comment, isFile = true, isText = false } of items) {
      // calculate CRC32 and compress data
      const crc32 = (data) ? calculateCRC32(data) : 0;
      const compression = (data && data.length > 32) ? 8 : 0;
      const compressedData = (data) ? await compressData(data, compression) : null;
      // create local header
      const flags = 0x0800;
      const nameLength = Buffer.byteLength(name);
      const commentLength = (comment) ? Buffer.byteLength(comment) : 0;
      const extraLength = 0;
      const compressedSize = (compressedData) ? compressedData.length : 0;
      const uncompressedSize = (data) ? data.length : 0;
      const internalAttributes = (isText) ? 0x0001 : 0x0000;
      const externalAttributes = (isFile) ? 0x0080 : 0x0010;
      const headerOffset = currentOffset;
      const headerSize = 30 + nameLength + extraLength;
      const header = Buffer.alloc(headerSize);
      header.writeUInt32LE(0x04034b50, 0);
      header.writeUInt16LE(zipVersion, 4);
      header.writeUInt16LE(flags, 6);
      header.writeUInt16LE(compression, 8);
      header.writeUInt32LE(lastModified, 10);
      header.writeUInt32LE(crc32, 14);
      header.writeUInt32LE(compressedSize, 18);
      header.writeUInt32LE(uncompressedSize, 22);
      header.writeUInt16LE(nameLength, 26);
      header.writeUInt16LE(extraLength, 28);
      header.write(name, 30);
      // save info for central directory
      const record = {
        flags,
        compression,
        lastModified,
        crc32,
        compressedSize,
        uncompressedSize,
        nameLength,
        extraLength,
        commentLength,
        internalAttributes,
        externalAttributes,
        headerOffset,
        name,
        comment,
      };
      centralDirectory.push(record);
      // output data
      currentOffset += header.length;
      yield header;
      if (compressedData) {
        currentOffset += compressedData.length;
        yield compressedData;
      }
    }
    // central directory
    const centralDirectoryOffset = currentOffset;
    for (const record of centralDirectory) {
      const {
        flags,
        compression,
        lastModified,
        crc32,
        compressedSize,
        uncompressedSize,
        nameLength,
        extraLength,
        commentLength,
        internalAttributes,
        externalAttributes,
        headerOffset,
        name,
        comment,
      } = record;
      const headerSize = 46 + nameLength + extraLength + commentLength;
      const header = Buffer.alloc(headerSize);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(zipVersion, 4);
      header.writeUInt16LE(zipVersion, 6);
      header.writeUInt16LE(flags, 8);
      header.writeUInt16LE(compression, 10);
      header.writeUInt32LE(lastModified, 12);
      header.writeUInt32LE(crc32, 16);
      header.writeUInt32LE(compressedSize, 20);
      header.writeUInt32LE(uncompressedSize, 24);
      header.writeUInt16LE(nameLength, 28);
      header.writeUInt16LE(extraLength, 30);
      header.writeUInt16LE(commentLength, 32);
      header.writeUInt16LE(internalAttributes, 36)
      header.writeUInt32LE(externalAttributes, 38);
      header.writeUInt32LE(headerOffset, 42);
      header.write(name, 46);
      if (comment) {
        header.write(comment, 46 + nameLength + extraLength);
      }
      currentOffset += header.length;
      yield header;
    }
    // end of central directory record
    const centralDirectorySize = currentOffset - centralDirectoryOffset;
    const header = Buffer.alloc(22);
    header.writeUInt32LE(0x06054b50, 0);
    header.writeInt16LE(0, 4);
    header.writeInt16LE(0, 6);
    header.writeInt16LE(centralDirectory.length, 8);
    header.writeInt16LE(centralDirectory.length, 10);
    header.writeUInt32LE(centralDirectorySize, 12);
    header.writeUInt32LE(centralDirectoryOffset, 16);
    header.writeInt16LE(0, 20);
    yield header;
  };
  return Readable.from(processStream());
}

function getBufferSlice(buffer, index, length) {
  if (index + length <= buffer.length) {
    return buffer.subarray(index, index + length);
  } else {
    throw new RangeError(`The value of "length" is out of range.`)
  }
}

function extractName(header, index, length, flags) {
  const raw = header.subarray(index, index + length);
  const encoding = (flags & 0x0800) ? 'utf8' : 'ascii';
  return raw.toString(encoding);
}

export async function decompressData(buffer, type) {
  if (type === 8) {
    buffer = await new Promise((resolve, reject) => {
      inflateRaw(normalize(buffer), (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  return buffer;
}

export async function compressData(buffer, type) { 
  if (type === 8) {
    buffer = await new Promise((resolve, reject) => {
      deflateRaw(normalize(buffer), (err, data) => {
        // can't programmatically create a condition where deflateRaw would 
        // run into an error
        /* c8 ignore next 2 */
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  return buffer;
}

function normalize(buffer) {
  if (Array.isArray(buffer)) {
    if (buffer.length === 1) {
      return buffer[0];      
    } else {
      return Buffer.concat(buffer);
    }
  } else {
    return buffer;
  }
}
