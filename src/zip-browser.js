import { inflateRaw, deflateRaw } from 'pako';

export class ZipFile {
  constructor(url) {
    this.url = url;
    this.etag = undefined;
    this.lastModified = undefined;
    this.centralDirectory = null;
    this.centralDirectoryOffset;
  }

  async open() {    
    this.centralDirectory = await this.loadCentralDirectory();
  }

  async close() {
  }

  async retrieveFile(name) {
    if (!this.centralDirectory) {
      throw new Error('File has not been opened yet');
    }
    const record = this.centralDirectory.find(r => r.name === name);
    if (!record) {
      throw new Error(`Cannot find file in archive: ${name}`);
    }
    const { localHeaderOffset, compressedSize, compression } = record;
    // look for the following file
    let next;
    for (const r of this.centralDirectory) {
      if (r.localHeaderOffset > localHeaderOffset) {
        if (!next || r.localHeaderOffset < next.localHeaderOffset) {
          next = r;
        }
      }
    }
    // fetch both the header and data (and possible the data descriptor)
    const endOffset = (next) ? next.localHeaderOffset : this.centralDirectoryOffset;
    const combinedSize = endOffset - localHeaderOffset;
    const combined = await this.fetch(combinedSize, localHeaderOffset);
    const header = combined.subarray(0, 30);
    const signature = readUInt32LE(header);
    if (signature !== 0x04034b50) {
      throw new Error('Invalid file header');
    }
    const nameLength = readUInt16LE(header, 26);
    const extraLength = readUInt16LE(header, 28);
    const dataOffset = 30 + nameLength + extraLength;
    const data = combined.subarray(dataOffset, dataOffset + compressedSize);
    if (data.length !== compressedSize) {
      throw new Error('Cannot read the correct number of bytes');
    }
    const uncompressedData = await decompressData(data, compression);
    return uncompressedData;
  }

  async extractFile(name) {
    for (let attempt = 1;; attempt++) {
      try {
        const data = await this.retrieveFile(name);
        return data;
      } catch (err) {
        if (err instanceof HTTPError && err.status === 412) {
          this.etag = undefined;
          this.lastModified = undefined;
          this.centralDirectory = null;
          if (attempt < 3) {
            this.centralDirectory = await this.loadCentralDirectory();
            continue;
          }
        }
        throw err;
      }  
    }
  }

  async extractTextFile(name, encoding = 'utf8') {
    const buffer = await this.extractFile(name);
    const decoder = new TextDecoder(encoding);
    return decoder.decode(buffer);
  }

  async extractJSONFile(name) {
    const text = await this.extractTextFile(name);
    return JSON.parse(text);
  }

  async findCentralDirectory() {
    const headerSize = 22;
    const maxCommentLength = 16;
    const offsetLimit = -headerSize - maxCommentLength;
    let offset = -headerSize;
    let found = false;
    let header;
    while (!found && offset >= offsetLimit) {
      header = await this.fetch(headerSize, offset);
      const signature = readUInt32LE(header);
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
      const count = readUInt16LE(header, 10);
      const size = readUInt32LE(header, 12);
      const offset = readUInt32LE(header, 16);
      return { count, size, offset };
    } else {
      throw new Error('Unable to find EOCD record');
    }
  }

  async loadCentralDirectory() {
    const records = [];
    const { size, offset } = await this.findCentralDirectory();
    const buffer = await this.fetch(size, offset);
    let index = 0;
    while (index < size) {
      const signature = readUInt32LE(buffer, index);
      if (signature !== 0x02014b50) {
        throw new Error('Invalid CD record');
      }
      const nameLength = readUInt16LE(buffer, index + 28);
      const extraLength = readUInt16LE(buffer, index + 30);
      const commentLength = readUInt16LE(buffer, index + 32)
      const headerSize = 46 + nameLength + extraLength + commentLength;
      const header = getArraySlice(buffer, index, headerSize);
      const flags = readUInt16LE(header, 8);
      const compression = readUInt16LE(header, 10);
      const compressedSize = readUInt32LE(header, 20);
      const uncompressedSize = readUInt32LE(header, 24);
      const name = extractName(header, 46, nameLength, flags);
      const localHeaderOffset = readUInt32LE(header, 42);
      records.push({
        name,
        nameLength,
        compression,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      });
      index += headerSize;
    }
    this.centralDirectoryOffset = offset;
    return records;
  }

  async fetch(size, offset) {
    const headers = { 'accept-encoding': 'identity' };
    if (offset < 0) {
      headers.range = `bytes=${offset}`;
    } else {
      headers.range = `bytes=${offset}-${offset + size - 1}`;
    }
    if (this.etag) {
      headers['if-match'] = this.etag;
    } else if (this.lastModified) {
      headers['if-unmodified-since'] = this.lastModified;
    }
    const res = await fetch(this.url, { headers });
    if (res.status !== 206) {
      throw new HTTPError(res);
    }
    this.etag = res.headers.get('etag');
    this.lastModified = res.headers.get('last-modified');
    const buffer = await res.arrayBuffer();
    let chunk = new Uint8Array(buffer);
    if (chunk.length !== size) {
      if (chunk.length > size) {
        chunk = chunk.subarray(0, size);
      } else {
        throw new Error('Size mismatch');
      }
    }
    return chunk;  
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
    for await (const chunkBuffer of stream) {
      let chunk = new Uint8Array(chunkBuffer);
      if (leftOver) {
        chunk = concatArrays(leftOver, chunk);
        leftOver = null;
      }
      let index = 0;
      while (index < chunk.length) {
        if (dataRemaining === 0) {
          // expecting a header of some sort
          try {
            const signature = readUInt32LE(chunk, index);
            if (signature === 0x04034b50) {
              // file record
              const nameLength = readUInt16LE(chunk, index + 26);
              const extraLength = readUInt16LE(chunk, index + 28);
              const headerSize = 30 + nameLength + extraLength;
              const header = getArraySlice(chunk, index, headerSize);
              const flags = readUInt16LE(header, 6);
              const compression = readUInt16LE(header, 8);
              const compressedSize = readUInt32LE(header, 18);
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
              const descriptor = getArraySlice(chunk, index, 16);
              if (!omitDataDescriptor) {
                currentOffset += 16;
                yield descriptor;
              }
              index += descriptor.length;
            } else if (signature === 0x02014b50) {
              // central directory record
              const nameLength = readUInt16LE(chunk, index + 28);
              const extraLength = readUInt16LE(chunk, index + 30);
              const commentLength = readUInt16LE(chunk, index + 32)
              const headerSize = 46 + nameLength + extraLength + commentLength;
              const header = getArraySlice(chunk, index, headerSize);
              const flags = readUInt16LE(header, 8);
              const name = extractName(header, 46, nameLength, flags);
              const localHeaderOffset = localHeaderOffsets[name];
              if (localHeaderOffset !== undefined) {
                // update local header position
                writeUInt32LE(header, localHeaderOffset, 42);
                const newAttributes = transformedFileAttributes[name];
                if (newAttributes) {
                  const { crc32, compressedSize, uncompressedSize } = newAttributes;
                  // update these as well
                  writeUInt16LE(header, flags & ~0x0008, 8);
                  writeUInt32LE(header, crc32, 16);
                  writeUInt32LE(header, compressedSize, 20);
                  writeUInt32LE(header, uncompressedSize, 24);
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
              const commentLength = readUInt16LE(chunk, index + 20)
              const headerSize = 22 + commentLength;
              const header = getArraySlice(chunk, index, headerSize);
              // update record
              writeUInt16LE(header, centralDirectoryRecordCount, 8);
              writeUInt16LE(header, centralDirectoryRecordCount, 10);
              writeUInt32LE(header, centralDirectorySize, 12);
              writeUInt32LE(header, centralDirectoryOffset, 16);
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
            const ddIndex = findArray(data, dataDescriptorSignature);
            let needMore = false;
            if (ddIndex !== -1) {
              if (ddIndex + 16 < data.length) {
                const header = getArraySlice(data, ddIndex, 16);
                const compressedSize = readUInt32LE(header, 8);
                if (dataRead + ddIndex === compressedSize) {
                  data = data.subarray(0, ddIndex);
                  dataRemaining = data.length;
                }
              } else {
                needMore = true;
              }
            } else {
              // in case the chunk ends in the middle of the data descriptor's signature
              if (data.length >= 3 && compareArrays(data.subarray(-3), dataDescriptorSignature.subarray(0, -1)) === 0) {
                needMore = true;
              } else if (data.length >= 2 && compareArrays(data.subarray(-2), dataDescriptorSignature.subarray(0, -2)) === 0) {
                needMore = true;
              } else if (data.length >= 1 && compareArrays(data.subarray(-1), dataDescriptorSignature.subarray(0, -3)) === 0) {
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
            if (!(transformedData instanceof Uint8Array) && transformedData !== null) {
              const encoder = new TextEncoder();
              transformedData = encoder.encode(`${transformedData}`);
            }
            if (transformedData) {
              const crc32 = calcuateCRC32(transformedData);
              const compressedData = await compressData(transformedData, compression);
              const compressedSize = compressedData.length;
              const uncompressedSize = transformedData.length;
              // remember these for the central directory
              transformedFileAttributes[name] = { crc32, compressedSize, uncompressedSize };
              localHeaderOffsets[name] = currentOffset;
              // update header
              writeUInt16LE(header, flags & ~0x0008, 6);
              writeUInt32LE(header, crc32, 14);
              writeUInt32LE(header, compressedSize, 18);
              writeUInt32LE(header, uncompressedSize, 22);
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
  return createStream(processStream());
}

export function createZip(items) {
  const processStream = async function*() {
    const zipVersion = 20;
    const lastModified = getDOSDatetime(new Date);
    const centralDirectory = [];
    const encoder = new TextEncoder();
    let currentOffset = 0;
    // local headers and data
    for await (const { name, data, comment, isFile = true, isText = false } of items) {
      // calculate CRC32 and compress data
      const crc32 = (data) ? calcuateCRC32(data) : 0;
      const compression = (data && data.length > 32) ? 8 : 0;
      const compressedData = (data) ? await compressData(data, compression) : null;
      // create local header
      const flags = 0x0800;
      const nameEncoded = encoder.encode(name);
      const commentEncoded = encoder.encode(comment ?? '');
      const extra = new Uint8Array(0);
      const compressedSize = (compressedData) ? compressedData.length : 0;
      const uncompressedSize = (data) ? data.length : 0;
      const internalAttributes = (isText) ? 0x0001 : 0x0000;
      const externalAttributes = (isFile) ? 0x0080 : 0x0010;
      const headerOffset = currentOffset;
      const headerSize = 30 + name.length + extra.length;
      const header = Buffer.alloc(headerSize);
      writeUInt32LE(header, 0x04034b50, 0);
      writeUInt16LE(header, zipVersion, 4);
      writeUInt16LE(header, flags, 6);
      writeUInt16LE(header, compression, 8);
      writeUInt32LE(header, lastModified, 10);
      writeUInt32LE(header, crc32, 14);
      writeUInt32LE(header, compressedSize, 18);
      writeUInt32LE(header, uncompressedSize, 22);
      writeUInt16LE(header, nameEncoded.length, 26);
      writeUInt16LE(header, extra.length, 28);
      header.set(nameEncoded, 30);
      // save info for central directory
      const record = {
        flags,
        compression,
        lastModified,
        crc32,
        compressedSize,
        uncompressedSize,
        internalAttributes,
        externalAttributes,
        headerOffset,
        nameEncoded,
        commentEncoded,
        extra,
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
        internalAttributes,
        externalAttributes,
        headerOffset,
        nameEncoded,
        commentEncoded,
        extra,
      } = record;
      const headerSize = 46 + nameEncoded.length + extra.length + commentEncoded.length;
      const header = new Uint8Array(headerSize);
      writeUInt32LE(header, 0x02014b50, 0);
      writeUInt16LE(header, zipVersion, 4);
      writeUInt16LE(header, zipVersion, 6);
      writeUInt16LE(header, flags, 8);
      writeUInt16LE(header, compression, 10);
      writeUInt32LE(header, lastModified, 12);
      writeUInt32LE(header, crc32, 16);
      writeUInt32LE(header, compressedSize, 20);
      writeUInt32LE(header, uncompressedSize, 24);
      writeUInt16LE(header, nameEncoded.length, 28);
      writeUInt16LE(header, extra.length, 30);
      writeUInt16LE(header, commentEncoded.length, 32);
      writeUInt16LE(header, internalAttributes, 36)
      writeUInt32LE(header, externalAttributes, 38);
      writeUInt32LE(header, headerOffset, 42);
      header.set(nameEncoded, 46);
      header.set(extra, 46 + nameEncoded.length);
      header.set(commentEncoded, 46 + nameEncoded.length + extra.length);
      currentOffset += header.length;
      yield header;
    }
    // end of central directory record
    const centralDirectorySize = currentOffset - centralDirectoryOffset;
    const header = new Uint8Array(22);
    writeUInt32LE(header, 0x06054b50, 0);
    writeUInt16LE(header, 0, 4);
    writeUInt16LE(header, 0, 6);
    writeUInt16LE(header, centralDirectory.length, 8);
    writeUInt16LE(header, centralDirectory.length, 10);
    writeUInt32LE(header, centralDirectorySize, 12);
    writeUInt32LE(header, centralDirectoryOffset, 16);
    writeUInt16LE(header, 0, 20);
    yield header;
  };
  return createStream(processStream());
}

function createStream(generator) {
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });  
}

function getArraySlice(buffer, index, length) {
  if (index + length <= buffer.length) {
    return buffer.subarray(index, index + length);
  } else {
    throw new RangeError(`The value of "length" is out of range.`)
  }
}

function concatArrays(a, b) {
  var c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

function compareArrays(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) {
      return -1;
    } else if (a[i] > b[i]) {
      return 1;
    }
  }
  return a.length - b.length;
}

function findArray(a, b) {
  let lastIndex = 0;
  for(;;) {
    const index = a.indexOf(b[0], lastIndex);
    if (index !== -1) {
      let match = true;
      for (let i = 1, j = index + 1; i < b.length && j < a.length; i++, j++) {
        if (a[j] !== b[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return index;
      } else {
        lastIndex = index + 1;
      }
    } else {
      break;
    }
  }
  return -1;
}

function readUInt16LE(buffer, offset = 0) {
  if (buffer.length < offset + 2) {
    throw new RangeError(`Attempt to access memory outside buffer bounds`);
  }
  return buffer[offset] | buffer[offset + 1] << 8;
}

function readUInt32LE(buffer, offset = 0) {
  if (buffer.length < offset + 4) {
    throw new RangeError(`Attempt to access memory outside buffer bounds`);
  }
  return buffer[offset] | buffer[offset + 1] << 8 | buffer[offset + 2] << 16 | buffer[offset + 3] << 24;
}

function writeUInt16LE(buffer, value, offset = 0) {
  if (buffer.length < offset + 2) {
    throw new RangeError(`Attempt to access memory outside buffer bounds`);
  }
  buffer[offset] = value & 0x000000FF;
  buffer[offset + 1] = (value & 0x0000FF00) >> 8;
}

function writeUInt32LE(buffer, value, offset = 0) {
  if (buffer.length < offset + 4) {
    throw new RangeError(`Attempt to access memory outside buffer bounds`);
  }
  buffer[offset] = value & 0x000000FF;
  buffer[offset + 1] = (value & 0x0000FF00) >> 8;
  buffer[offset + 2] = (value & 0x00FF0000) >> 16;
  buffer[offset + 3] = (value & 0xFF000000) >> 24;
}

function extractName(header, index, length, flags) {
  const raw = header.subarray(index, index + length);
  const encoding = (flags & 0x0800) ? 'utf8' : 'ascii';
  const decoder = new TextDecoder(encoding);
  return decoder.decode(raw);
}

export async function decompressData(buffer, type) {
  buffer = normalize(buffer);
  if (type === 8) {
    if (buffer.length === undefined) {
      throw new TypeError('Invalid input');
    }
    try {
      buffer = inflateRaw(buffer);
      if (buffer === undefined) {
        throw new Error('Decompression failure');
      }
    } catch (err) {
      if (typeof(err) === 'string') {
        err = new Error(err);
      }
      throw err;
    }
  }
  return buffer;
}

export async function compressData(buffer, type) { 
  buffer = normalize(buffer);
  if (type === 8) {
    if (buffer.length === undefined) {
      throw new TypeError('Invalid input');
    }
    buffer = deflateRaw(buffer);
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

function calcuateCRC32(buffer) {
  let crc = initializeCRC32();
  crc = updateCRC32(crc, buffer);
  return finalizeCRC32(crc);
}

let crcTable = null;

function initializeCRC32() {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0, c = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 0x01) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
  }
  return 0 ^ 0xFFFFFFFF;
}

function finalizeCRC32(crc) {
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function updateCRC32(crc, buffer) {
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return crc;
}

function getDOSDatetime(date) {
  return (date.getFullYear() - 1980) << 25
       | (date.getMonth() + 1)       << 21
       |  date.getDate()             << 16
       |  date.getHours()            << 11
       |  date.getMinutes()          <<  5
       | (date.getSeconds() >> 1);
}

class HTTPError extends Error { 
  constructor(res) {
    super(`HTTP ${res.status} - ${res.statusText}`);
    this.status = res.status;
    this.statusText = res.statusText;
  }
}

