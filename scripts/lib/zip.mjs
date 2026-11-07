/**
 * Минимальный писатель ZIP без внешних зависимостей (deflate через node:zlib).
 * Используется scripts/build-downloads.mjs для сборки valley-next.zip и valley-php.zip.
 */
import { deflateRawSync } from "node:zlib";

const TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[i] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) crc = (crc >>> 8) ^ TABLE[(crc ^ buffer[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function dosTime(date) {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xffff;
  const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { time, day };
}

export class ZipWriter {
  constructor() {
    this.chunks = [];
    this.entries = [];
    this.offset = 0;
  }

  add(name, data, { compress = true, date = new Date() } = {}) {
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    const stored = compress && raw.length > 0 ? deflateRawSync(raw, { level: 9 }) : raw;
    const method = stored.length < raw.length ? 8 : 0;
    const payload = method === 8 ? stored : raw;
    const { time, day } = dosTime(date);
    const nameBuffer = Buffer.from(name, "utf8");
    const checksum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);

    this.chunks.push(local, nameBuffer, payload);
    this.entries.push({ nameBuffer, checksum, method, time, day, size: raw.length, compressed: payload.length, offset: this.offset });
    this.offset += local.length + nameBuffer.length + payload.length;
  }

  addDirectory(name, date = new Date()) {
    const suffix = name.endsWith("/") ? name : `${name}/`;
    const { time, day } = dosTime(date);
    const nameBuffer = Buffer.from(suffix, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(0, 18);
    local.writeUInt32LE(0, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    this.chunks.push(local, nameBuffer);
    this.entries.push({ nameBuffer, checksum: 0, method: 0, time, day, size: 0, compressed: 0, offset: this.offset, dir: true });
    this.offset += local.length + nameBuffer.length;
  }

  buffer() {
    const central = [];
    let centralSize = 0;
    for (const entry of this.entries) {
      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(0x031e, 4);
      header.writeUInt16LE(20, 6);
      header.writeUInt16LE(0x0800, 8);
      header.writeUInt16LE(entry.method, 10);
      header.writeUInt16LE(entry.time, 12);
      header.writeUInt16LE(entry.day, 14);
      header.writeUInt32LE(entry.checksum, 16);
      header.writeUInt32LE(entry.compressed, 20);
      header.writeUInt32LE(entry.size, 24);
      header.writeUInt16LE(entry.nameBuffer.length, 28);
      header.writeUInt16LE(0, 30);
      header.writeUInt16LE(0, 32);
      header.writeUInt16LE(0, 34);
      header.writeUInt16LE(0, 36);
      header.writeUInt32LE(((entry.dir ? 0o40755 : 0o100644) * 0x10000) >>> 0, 38);
      header.writeUInt32LE(entry.offset, 42);
      central.push(header, entry.nameBuffer);
      centralSize += header.length + entry.nameBuffer.length;
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(this.offset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...this.chunks, ...central, end]);
  }
}
