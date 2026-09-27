import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c >>> 0;
}
const crc32 = data => {
  let c = 0xffffffff;
  for (const byte of data) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (name, data) => {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, crc]);
};
const distanceToSegment = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
};
const insideRounded = (x, y, s, r) => {
  const cx = Math.max(r, Math.min(s - r, x)), cy = Math.max(r, Math.min(s - r, y));
  return Math.hypot(x - cx, y - cy) <= r;
};
const colorAt = (x, y, s) => {
  if (!insideRounded(x, y, s, s * .22)) return [0, 0, 0, 0];
  const bg = [25, 78, 63, 255];
  const cx = s * .43, cy = s * .41, radius = s * .235;
  const d = Math.hypot(x - cx, y - cy);
  const handle = distanceToSegment(x, y, s * .59, s * .57, s * .79, s * .77);
  if (handle < s * .065) return [224, 244, 229, 255];
  if (d < radius) {
    if (d > radius - s * .062) return [224, 244, 229, 255];
    if (Math.hypot(x - s * .37, y - s * .34) < s * .052) return [178, 232, 205, 255];
    return [46, 132, 103, 255];
  }
  return bg;
};
async function makeIcon(size) {
  const scale = 4, large = size * scale, rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sum = [0, 0, 0, 0];
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const c = colorAt(x * scale + sx + .5, y * scale + sy + .5, large);
      for (let i = 0; i < 4; i++) sum[i] += c[i];
    }
    const offset = (y * size + x) * 4;
    for (let i = 0; i < 4; i++) rgba[offset + i] = Math.round(sum[i] / (scale * scale));
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1); raw[row] = 0;
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  await writeFile(`public/icons/icon${size}.png`, png);
}
await mkdir('public/icons', { recursive: true });
await Promise.all([16, 32, 48, 128].map(makeIcon));
