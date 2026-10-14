/**
 * Generates valid PNG icons for ZenFlow using Node built-in zlib & fs.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePng(width, height, getPixelRgba) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineLength + 1) * height);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (scanlineLength + 1);
    rawData[scanlineOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pixelOffset = scanlineOffset + 1 + x * bytesPerPixel;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, body, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function renderZenFlowIcon(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;

  // Background rounded rectangle
  const cx = 0.5;
  const cy = 0.5;
  const rBg = 0.44;

  // Deep dark modern slate background (#090D16 -> #1E293B)
  const distCenter = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
  let bgR = Math.floor(9 + (30 - 9) * (1 - distCenter));
  let bgG = Math.floor(13 + (41 - 13) * (1 - distCenter));
  let bgB = Math.floor(22 + (59 - 22) * (1 - distCenter));

  // Check corner rounding
  const cornerR = 0.22;
  const innerX = Math.abs(nx - 0.5) - (0.5 - cornerR);
  const innerY = Math.abs(ny - 0.5) - (0.5 - cornerR);
  if (innerX > 0 && innerY > 0) {
    const d = Math.sqrt(innerX * innerX + innerY * innerY);
    if (d > cornerR) return [0, 0, 0, 0]; // outside rounded corner
  }

  // Cyan Node at (0.3, 0.3)
  const dCyan1 = Math.sqrt((nx - 0.3) ** 2 + (ny - 0.3) ** 2);
  if (dCyan1 < 0.08) return [0, 199, 190, 255]; // #00C7BE
  if (dCyan1 < 0.11) return [0, 199, 190, 120];

  // Cyan Node at (0.5, 0.5)
  const dCyan2 = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
  if (dCyan2 < 0.08) return [0, 199, 190, 255];
  if (dCyan2 < 0.11) return [0, 199, 190, 120];

  // Pink Node at (0.7, 0.3)
  const dPink1 = Math.sqrt((nx - 0.7) ** 2 + (ny - 0.3) ** 2);
  if (dPink1 < 0.08) return [255, 45, 85, 255]; // #FF2D55
  if (dPink1 < 0.11) return [255, 45, 85, 120];

  // Pink Node at (0.7, 0.7)
  const dPink2 = Math.sqrt((nx - 0.7) ** 2 + (ny - 0.7) ** 2);
  if (dPink2 < 0.08) return [255, 45, 85, 255];
  if (dPink2 < 0.11) return [255, 45, 85, 120];

  // Amber Node at (0.3, 0.7)
  const dAmber = Math.sqrt((nx - 0.3) ** 2 + (ny - 0.7) ** 2);
  if (dAmber < 0.08) return [255, 204, 0, 255]; // #FFCC00
  if (dAmber < 0.11) return [255, 204, 0, 120];

  // Pipe segments:
  // Cyan L-pipe: (0.3, 0.3) -> (0.3, 0.5) -> (0.5, 0.5)
  const onCyanV = Math.abs(nx - 0.3) < 0.045 && ny >= 0.3 && ny <= 0.5;
  const onCyanH = Math.abs(ny - 0.5) < 0.045 && nx >= 0.3 && nx <= 0.5;
  if (onCyanV || onCyanH) return [0, 199, 190, 255];

  // Pink vertical pipe: (0.7, 0.3) -> (0.7, 0.7)
  const onPinkV = Math.abs(nx - 0.7) < 0.045 && ny >= 0.3 && ny <= 0.7;
  if (onPinkV) return [255, 45, 85, 255];

  // Amber horizontal pipe: (0.3, 0.7) -> (0.5, 0.7)
  const onAmberH = Math.abs(ny - 0.7) < 0.045 && nx >= 0.3 && nx <= 0.5;
  if (onAmberH) return [255, 204, 0, 255];

  return [bgR, bgG, bgB, 255];
}

const srcDir = path.join(__dirname, '..', 'src');

console.log('Generating icon-192.png...');
const icon192 = makePng(192, 192, renderZenFlowIcon);
fs.writeFileSync(path.join(srcDir, 'icon-192.png'), icon192);

console.log('Generating icon-512.png...');
const icon512 = makePng(512, 512, renderZenFlowIcon);
fs.writeFileSync(path.join(srcDir, 'icon-512.png'), icon512);

console.log('Icons generated successfully.');
