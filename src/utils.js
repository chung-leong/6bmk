export function calculateCRC32(buffer) {
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
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ view[i]) & 0xff];
  }
  return crc;
}

export function getDOSDatetime(date) {
  return (date.getFullYear() - 1980) << 25
       | (date.getMonth() + 1)       << 21
       |  date.getDate()             << 16
       |  date.getHours()            << 11
       |  date.getMinutes()          <<  5
       | (date.getSeconds() >> 1);
}
