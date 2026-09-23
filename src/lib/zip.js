// Minimal ZIP reader (central-directory parser) for browser and Node.
// Pure ESM, zero dependencies: stored (0) + deflate (8) via DecompressionStream.
// Contract: readZip(ArrayBuffer|Uint8Array) -> Promise<Map<string, Uint8Array>>

export class UnsupportedFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

function decodeName(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new UnsupportedFormatError('deflate-raw not supported in this environment');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZip(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Locate EOCD (max 65535-byte comment + 22-byte record).
  let eocd = -1;
  const start = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= start; i--) {
    // Accept only a structurally valid EOCD: its comment length must reach EOF.
    if (dv.getUint32(i, true) === EOCD_SIG && i + 22 + dv.getUint16(i + 20, true) === bytes.length) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new UnsupportedFormatError('Not a ZIP: end of central directory not found');

  const totalEntries = dv.getUint16(eocd + 10, true);
  const cdSize = dv.getUint32(eocd + 12, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new UnsupportedFormatError('ZIP64 archives are not supported');
  }
  if (cdOffset + cdSize > bytes.length) {
    throw new UnsupportedFormatError('Corrupt ZIP: central directory out of range');
  }

  const files = new Map();
  let off = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (off + 46 > bytes.length) throw new UnsupportedFormatError('Corrupt ZIP: truncated central directory');
    if (dv.getUint32(off, true) !== CD_SIG) throw new UnsupportedFormatError('Corrupt ZIP: bad central directory signature');

    const flags = dv.getUint16(off + 8, true);
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const usize = dv.getUint32(off + 24, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const localOffset = dv.getUint32(off + 42, true);

    if (flags & 0x1) throw new UnsupportedFormatError('Encrypted ZIP entries are not supported');
    if (csize === 0xffffffff || usize === 0xffffffff || localOffset === 0xffffffff) {
      throw new UnsupportedFormatError('ZIP64 archives are not supported');
    }
    if (method !== 0 && method !== 8) {
      throw new UnsupportedFormatError(`Unsupported compression method ${method} (only stored/deflate)`);
    }
    if (localOffset + 30 > bytes.length || dv.getUint32(localOffset, true) !== LFH_SIG) {
      throw new UnsupportedFormatError('Corrupt ZIP: bad local file header');
    }
    const localNameLen = dv.getUint16(localOffset + 26, true);
    const localExtraLen = dv.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + csize > bytes.length) throw new UnsupportedFormatError('Corrupt ZIP: truncated entry data');

    const name = decodeName(bytes.subarray(off + 46, off + 46 + nameLen));
    const raw = bytes.subarray(dataStart, dataStart + csize);
    files.set(name, method === 8 ? await inflateRaw(raw) : new Uint8Array(raw));

    off += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
