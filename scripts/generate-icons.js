import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, bgColor, drawDetails) {
  // Simple uncompressed/deflated raw RGBA PNG generator
  const buffer = Buffer.alloc(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const color = drawDetails(x, y, width, height, bgColor);
      buffer[idx] = color[0];
      buffer[idx + 1] = color[1];
      buffer[idx + 2] = color[2];
      buffer[idx + 3] = color[3];
    }
  }

  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter: None
    buffer.copy(rawData, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, len + 8));
  chunk.writeUInt32BE(crc, len + 8);
  return chunk;
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Pixel painter: Dark slate background (#0f172a) with Amber road arrow / helmet silhouette (#f59e0b)
function painter(x, y, w, h, isMaskable) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Safe margin for maskable
  const scale = isMaskable ? 0.75 : 0.88;
  const ndx = dx / scale;
  const ndy = dy / scale;

  // Background: slate-900 (15, 23, 42)
  let r = 15, g = 23, b = 42, a = 255;

  // Outer ring / shield border (slate-700: 51, 65, 85)
  if (dist > 0.85 * scale && dist < 0.96 * scale) {
    return [51, 65, 85, 255];
  }

  // Motorcycle / Arrow road glyph in center
  // Upward chevron/arrow (motorcycle helmet visor & highway marker)
  const insideChevron = (ndy > -0.5 && ndy < 0.5 && Math.abs(ndx) < (0.6 - (ndy + 0.5) * 0.4));
  const visorLine = (Math.abs(ndy - 0.05) < 0.12 && Math.abs(ndx) < 0.45);
  const centerDot = (Math.sqrt(ndx * ndx + (ndy + 0.4) * (ndy + 0.4)) < 0.18);

  if (centerDot || visorLine || (insideChevron && Math.abs(ndy - 0.25) < 0.18)) {
    // Amber-500: 245, 158, 11
    return [245, 158, 11, 255];
  }

  // Accent road lines
  if (Math.abs(ndx) < 0.06 && ndy > 0.35 && ndy < 0.75) {
    return [255, 255, 255, 230];
  }

  return [r, g, b, a];
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, null, (x, y, w, h) => painter(x, y, w, h, false)));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, null, (x, y, w, h) => painter(x, y, w, h, false)));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, null, (x, y, w, h) => painter(x, y, w, h, true)));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, null, (x, y, w, h) => painter(x, y, w, h, false)));
console.log('Icons created successfully.');
