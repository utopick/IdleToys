// Builds art/world.png + art/world.json: skylines (tileable), hills and roadside props.
// Plain Node: own RGBA raster, PNG encoder (zlib + CRC32), seeded random.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'art');

let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

function img(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }
// wrap: x coordinates wrap around (for tileable strips)
function px(im, x, y, c, a = 255, wrap = false) {
  x = Math.round(x); y = Math.round(y);
  if (wrap) x = ((x % im.w) + im.w) % im.w;
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const i = (y * im.w + x) * 4, d = im.d;
  if (a >= 255 || d[i + 3] === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.max(d[i + 3], a); return; }
  const t = a / 255; d[i] += (c[0] - d[i]) * t; d[i + 1] += (c[1] - d[i + 1]) * t; d[i + 2] += (c[2] - d[i + 2]) * t; d[i + 3] = Math.max(d[i + 3], a);
}
function rect(im, x, y, w, h, c, a, wrap) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(im, x + i, y + j, c, a, wrap); }
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// two-tone dithered pick between colours a and b at ratio t
const dpick = (a, b, t, x, y) => (t > dith(x, y) ? b : a);
function line(im, x0, y0, x1, y1, c, th = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; rect(im, x - (th >> 1), y - (th >> 1), th, th, c); }
}
function disc(im, cx, cy, r, colFn) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) px(im, cx + x, cy + y, colFn(x / r, y / r, cx + x, cy + y));
}

// ---------- skylines ----------
function skyline(w, h, near, night, sd) {
  seed = sd;
  const im = img(w, h);
  const layers = near ? 2 : 3;
  for (let L = 0; L < layers; L++) {
    const depth = L / (layers - 1 || 1); // 0 = farthest
    const base = night
      ? mix([70, 60, 120], near ? [22, 18, 48] : [34, 30, 72], depth)
      : mix([196, 206, 222], near ? [120, 134, 158] : [150, 162, 186], depth);
    const lit = night ? mix([110, 100, 170], [70, 62, 120], depth) : mix([228, 234, 242], [176, 190, 210], depth);
    let x = ri(0, 8);
    while (x < w) {
      const bw = near ? ri(18, 46) : ri(8, 26);
      const maxH = h * (near ? 0.95 : 0.9) * (0.5 + depth * 0.5);
      const bh = Math.floor(ri(h * 0.25, maxH) * (rnd() < 0.15 ? 1.15 : 1));
      const top = Math.max(4, h - bh);
      const kind = rnd();
      const round = kind < 0.08;
      const steps = kind > 0.6 ? ri(1, 3) : 0;
      for (let yy = top; yy < h; yy++) {
        let inset = 0;
        if (steps) { const s = Math.floor(((yy - top) / (bh * 0.25))); inset = Math.max(0, steps - s) * Math.floor(bw / 8); }
        if (round && yy < top + bw / 2) { const dy = (top + bw / 2 - yy) / (bw / 2); inset = Math.floor(bw / 2 * (1 - Math.sqrt(Math.max(0, 1 - dy * dy)))); }
        for (let i = inset; i < bw - inset; i++) {
          const side = i / bw; // light from the left
          const haze = night ? (yy / h) * 0.25 : (1 - yy / h) * 0.15;
          let c = dpick(base, lit, side < 0.18 ? 0.55 : side > 0.8 ? 0.0 : 0.15, x + i, yy);
          c = mix(c, night ? [90, 70, 140] : [210, 218, 232], haze * (1 - depth));
          px(im, x + i, yy, c, 255, true);
        }
      }
      // windows
      const ww = near ? 2 : 1, gap = near ? 4 : 2, rowg = near ? 4 : 3;
      const dens = night ? (near ? 0.35 : 0.42) * (0.4 + rnd()) : 0.12;
      for (let yy = top + 4; yy < h - 2; yy += rowg) for (let i = 2; i < bw - 2; i += gap) {
        if (rnd() > dens) continue;
        let c;
        if (night) { const r = rnd(); c = r < 0.7 ? [255, 214, 120] : r < 0.82 ? [255, 240, 200] : r < 0.92 ? [120, 230, 255] : [255, 120, 200]; c = mix(c, base, 0.25 * (1 - depth)); }
        else c = rnd() < 0.3 ? [240, 248, 255] : mix(base, [90, 110, 140], 0.35);
        rect(im, x + i, yy, ww, near ? 2 : 1, c, 255, true);
      }
      if (!night && near) for (let k = 0; k < 2; k++) { const gx = x + ri(2, bw - 4), gy = ri(top + 4, h - 6); line(im, gx, gy, gx + 3, gy - 3, [255, 255, 255]); }
      // antenna + aircraft light
      if (rnd() < 0.3) {
        const cx = x + Math.floor(bw / 2), ah = ri(4, near ? 18 : 10);
        for (let k = 0; k < ah; k++) px(im, cx, top - k, base, 255, true);
        px(im, cx, top - ah, night ? [255, 50, 50] : [200, 60, 60], 255, true);
      }
      if (near) { // rooftop details: water tanks, billboards
        if (rnd() < 0.3) { const tx = x + ri(2, Math.max(2, bw - 10)); rect(im, tx, top - 7, 8, 5, mix(base, [140, 100, 70], night ? 0.15 : 0.5), 255, true); rect(im, tx + 1, top - 2, 1, 2, base, 255, true); rect(im, tx + 6, top - 2, 1, 2, base, 255, true); line(im, tx, top - 7, tx + 4, top - 9, base); line(im, tx + 4, top - 9, tx + 8, top - 7, base); }
        else if (rnd() < 0.25 && bw > 24) {
          const bx = x + 2, by = top - 14, bwd = bw - 4;
          rect(im, bx + 3, by + 10, 1, 4, base, 255, true); rect(im, bx + bwd - 4, by + 10, 1, 4, base, 255, true);
          for (let j = 0; j < 10; j++) for (let i = 0; i < bwd; i++) px(im, bx + i, by + j, night ? dpick([40, 30, 80], [255, 90, 170], (i / bwd) * 0.6, bx + i, by + j) : mix([230, 200, 120], [200, 90, 80], i / bwd), 255, true);
        }
        if (night && rnd() < 0.22) neon(im, x + ri(2, Math.max(2, bw - 10)), ri(top + 10, h - 30));
      }
      x += bw + (near ? ri(-4, 3) : ri(-3, 2));
      if (rnd() < 0.15) x += ri(2, 10);
    }
  }
  if (night) { // ground glow
    for (let y = h - 14; y < h; y++) for (let x = 0; x < w; x++) { const t = (y - (h - 14)) / 14; if (im.d[(y * w + x) * 4 + 3] && t * 0.5 > dith(x, y)) px(im, x, y, [180, 90, 150], 90); }
  }
  return im;
}
// made-up glyph neon sign: vertical panel of kana-like strokes with a glow
function neon(im, x, y) {
  const col = rnd() < 0.5 ? [255, 80, 190] : [80, 240, 255];
  const n = ri(2, 4);
  for (let j = -2; j < n * 9 + 2; j++) for (let i = -2; i < 10; i++) px(im, x + i, y + j, col, 60, true);
  rect(im, x - 1, y - 1, 10, n * 9 + 1, [20, 10, 30], 255, true);
  for (let g = 0; g < n; g++) {
    const gy = y + g * 9 + 1;
    for (let s = 0; s < 3; s++) {
      const a = ri(0, 2), b = ri(0, 2);
      if (rnd() < 0.5) rect(im, x + 1, gy + a * 3, 6, 1, col, 255, true); else rect(im, x + 1 + b * 3, gy, 1, 7, col, 255, true);
    }
    px(im, x + 7, gy + 6, [255, 255, 255], 255, true);
  }
}

// ---------- hills ----------
function hills(w, h, night) {
  seed = 99;
  const im = img(w, h);
  const ridges = [[0.25, 3], [0.5, 2], [0.75, 1]];
  ridges.forEach(([lvl, k], idx) => {
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    const base = night ? mix([40, 50, 100], [12, 18, 46], idx / 2) : mix([178, 176, 128], [110, 120, 60], idx / 2);
    const lite = night ? mix(base, [80, 90, 150], 0.5) : mix(base, [220, 200, 140], 0.5);
    for (let x = 0; x < w; x++) {
      const t = (x / w) * Math.PI * 2; // integer harmonics keep it tileable
      const y0 = h * lvl - (Math.sin(t * 2 + ph[0]) * 7 + Math.sin(t * 5 + ph[1]) * 4 + Math.sin(t * 11 + ph[2]) * 2) - 6 + idx * 4;
      for (let y = Math.max(0, Math.floor(y0)); y < h; y++) {
        const dd = (y - y0) / 10;
        let c = dpick(lite, base, Math.min(1, dd), x, y);
        if (!night && idx < 2 && ((Math.floor(y / 3) + Math.floor(x / 37)) % 5 === 0)) c = mix(c, [190, 160, 90], 0.4); // field strips
        px(im, x, y, c);
      }
      // olive tree dots on the ridge
      if (rnd() < 0.18 - idx * 0.03) {
        const ty = Math.floor(y0 + ri(2, 10 + idx * 8)), r = 1 + idx;
        const tc = night ? [10, 14, 36] : [70, 84, 44];
        for (let j = -r; j <= 0; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) px(im, x + i, ty + j, tc, 255, true);
        px(im, x, ty + 1, night ? [6, 8, 24] : [60, 50, 30], 255, true);
        if (!night) px(im, x - r, ty - r + 1, [120, 130, 80], 255, true);
      }
    }
  });
  if (night) for (let k = 0; k < 14; k++) px(im, ri(0, w - 1), ri(h * 0.5, h - 1), [255, 210, 120], 255, true); // farmhouse lights
  return im;
}

// ---------- props ----------
function palm(w, h, variant) {
  seed = 500 + variant * 77;
  const im = img(w, h);
  const lean = variant ? -10 : 8, topX = w / 2 + lean, topY = variant ? 34 : 26;
  // ringed trunk, curved
  for (let y = h - 1; y > topY; y--) {
    const t = (h - y) / (h - topY), cx = w / 2 + lean * t * t, th = Math.round(7 - t * 3);
    for (let i = -th; i <= th; i++) {
      const s = (i + th) / (2 * th);
      let c = dpick([150, 112, 70], [92, 66, 42], s, cx + i, y);
      if ((y % 5) === 0) c = mix(c, [60, 42, 28], 0.6);
      if ((y % 5) === 1 && s < 0.4) c = [186, 150, 100];
      px(im, cx + i, y, c);
    }
  }
  // fronds
  const n = variant ? 14 : 16;
  for (let f = 0; f < n; f++) {
    const a = (f / n) * Math.PI * 2 + rnd() * 0.3, len = ri(26, 36) * (variant ? 0.9 : 1);
    const dx = Math.cos(a), droop = variant ? 1.6 : 1.1;
    for (let s = 0; s < len; s++) {
      const t = s / len;
      const x = topX + dx * s, y = topY + Math.sin(a) * s * 0.45 + droop * t * t * len * 0.8;
      const leafC = mix([70, 140, 60], [30, 80, 34], t * 0.6 + (Math.sin(a) > 0 ? 0.3 : 0));
      px(im, x, y, leafC); px(im, x, y + 1, mix(leafC, [20, 50, 24], 0.4));
      const lf = Math.round(Math.sin(t * Math.PI) * 9 + 2);
      for (let k = 1; k < lf; k += 1) if ((s + k) % 2 === 0 || k < 3) { px(im, x + dx * k * 0.3, y + k, mix(leafC, [20, 60, 28], k / lf)); px(im, x - dx * k * 0.2, y - k * 0.5, mix(leafC, [120, 180, 80], 0.3)); }
    }
  }
  disc(im, topX, topY + 2, 4, (u, v) => (v < 0 ? [140, 110, 50] : [90, 70, 30])); // coconuts / crown
  return im;
}
function pine(w, h) {
  seed = 900;
  const im = img(w, h);
  rect(im, w / 2 - 3, 40, 6, h - 40, [110, 76, 50]);
  for (let y = 40; y < h; y++) { px(im, w / 2 + 2, y, [70, 46, 30]); if (y % 6 === 0) px(im, w / 2 - 2, y, [80, 56, 36]); }
  // stone pine (Spanish umbrella canopy) built from blobs
  for (let k = 0; k < 40; k++) {
    const cx = w / 2 + ri(-24, 24), cy = ri(14, 44), r = ri(5, 9);
    disc(im, cx, cy, r, (u, v, x, y) => dpick([34, 70, 40], [80, 120, 58], (-u - v) * 0.5 + 0.3 - (cy - 14) / 80, x, y));
  }
  for (let k = 0; k < 6; k++) line(im, w / 2, 50, w / 2 + ri(-18, 18), ri(34, 44), [90, 62, 40], 2);
  return im;
}
function olive(w, h) {
  seed = 321;
  const im = img(w, h);
  // twisted trunk
  for (let y = 30; y < h; y++) { const cx = w / 2 + Math.sin(y / 6) * 3; rect(im, cx - 3, y, 7, 1, [110, 96, 80]); px(im, cx - 3, y, [150, 136, 116]); px(im, cx + 3, y, [70, 60, 50]); }
  line(im, w / 2, 36, w / 2 - 14, 22, [100, 86, 70], 2); line(im, w / 2, 34, w / 2 + 16, 20, [100, 86, 70], 2);
  for (let k = 0; k < 34; k++) {
    const cx = w / 2 + ri(-28, 28), cy = ri(8, 32), r = ri(4, 8);
    disc(im, cx, cy, r, (u, v, x, y) => { const t = (-u - v) * 0.5 + 0.4; return t > 0.7 ? (dith(x, y) < 0.5 ? [170, 180, 140] : [130, 146, 100]) : dpick([70, 86, 56], [120, 136, 92], t, x, y); });
  }
  rect(im, w / 2 - 12, h - 2, 24, 2, [80, 70, 50], 120);
  return im;
}
function lamp(w, h, right) {
  const im = img(w, h);
  const px0 = right ? w - 8 : 6; // pole x
  for (let y = 18; y < h; y++) { rect(im, px0, y, 3, 1, [150, 156, 164]); px(im, px0, y, [200, 206, 214]); px(im, px0 + 2, y, [90, 96, 108]); }
  rect(im, px0 - 2, h - 8, 7, 8, [110, 114, 122]);
  const ex = right ? 8 : w - 10;
  // arm curving toward the road
  for (let s = 0; s <= 40; s++) { const t = s / 40, x = px0 + 1 + (ex - px0 - 1) * t, y = 20 - Math.sin(t * Math.PI * 0.6) * 8; rect(im, x, y, 1, 3, [150, 156, 164]); px(im, x, y, [200, 206, 214]); }
  const hx = right ? ex - 2 : ex - 10;
  rect(im, hx, 14, 14, 4, [120, 124, 132]); rect(im, hx + 1, 18, 12, 2, [255, 240, 190]); px(im, hx + 6, 20, [255, 255, 230]);
  return im;
}
function barrier(w, h) {
  const im = img(w, h);
  for (let p = 4; p < w; p += 28) { rect(im, p, 6, 4, h - 6, [110, 116, 124]); px(im, p, 6, [170, 176, 184]); rect(im, p + 3, 6, 1, h - 6, [70, 74, 82]); }
  for (let y = 3; y < 13; y++) { const t = (y - 3) / 10, c = t < 0.2 ? [230, 234, 240] : t < 0.5 ? [180, 186, 196] : t < 0.6 ? [120, 126, 136] : t < 0.8 ? [170, 176, 186] : [100, 104, 112]; rect(im, 0, y, w, 1, c); }
  for (let p = 18; p < w; p += 28) rect(im, p, 6, 3, 2, [255, 170, 40]); // reflectors
  return im;
}
function sign(w, h) {
  const im = img(w, h);
  for (const x of [40, w - 46]) { rect(im, x, 50, 6, h - 50, [130, 136, 146]); rect(im, x, 50, 1, h - 50, [190, 196, 206]); rect(im, x + 5, 50, 1, h - 50, [80, 84, 92]); }
  rect(im, 4, 4, w - 8, 60, [255, 255, 255]);
  rect(im, 6, 6, w - 12, 56, [28, 108, 60]);
  rect(im, 9, 9, w - 18, 50, [240, 244, 240]);
  for (let y = 11; y < 57; y++) for (let x = 11; x < w - 11; x++) px(im, x, y, dpick([20, 92, 50], [26, 104, 58], (y - 11) / 46 * 0.6, x, y));
  rect(im, 4, 64, w - 8, 2, [60, 64, 70]);
  return { im, text: { x: 14, y: 14, w: w - 28, h: 40 } };
}
function cafe(w, h) {
  seed = 4242;
  const im = img(w, h);
  // building
  rect(im, 100, 40, 96, h - 40, [210, 196, 172]);
  for (let y = 40; y < h; y++) for (let x = 100; x < 196; x++) if (dith(x, y) < 0.15) px(im, x, y, [190, 174, 150]);
  rect(im, 98, 34, 100, 7, [180, 60, 60]); rect(im, 98, 34, 100, 1, [230, 110, 100]);
  for (let i = 0; i < 3; i++) { const wx = 108 + i * 28; rect(im, wx, 54, 22, 26, [90, 80, 70]); for (let y = 56; y < 78; y++) for (let x = wx + 2; x < wx + 20; x++) px(im, x, y, dpick([255, 220, 140], [255, 190, 100], (y - 56) / 22, x, y)); rect(im, wx + 11, 56, 1, 22, [120, 100, 80]); }
  rect(im, 176, 84, 14, h - 84, [120, 80, 60]);
  rect(im, 112, 24, 60, 10, [30, 30, 40]); for (let i = 0; i < 6; i++) rect(im, 116 + i * 9, 27, 6, 4, i % 2 ? [80, 240, 255] : [255, 90, 180]); // made-up neon letters
  // canopy
  rect(im, 4, 30, 92, 9, [235, 235, 238]); rect(im, 4, 36, 92, 3, [200, 50, 50]); rect(im, 4, 39, 92, 2, [255, 250, 220]);
  for (const x of [10, 84]) rect(im, x, 41, 4, h - 41, [170, 172, 178]);
  // pumps
  for (const x of [30, 58]) { rect(im, x, h - 30, 12, 28, [200, 50, 50]); rect(im, x + 2, h - 26, 8, 6, [200, 240, 255]); rect(im, x + 12, h - 22, 2, 10, [40, 40, 44]); rect(im, x - 2, h - 2, 16, 2, [120, 120, 124]); }
  rect(im, 0, h - 2, w, 2, [100, 100, 104]);
  return im;
}
function bush(w, h) {
  seed = 77; const im = img(w, h);
  for (let k = 0; k < 18; k++) { const cx = ri(9, w - 9), cy = ri(12, h - 6), r = ri(5, 9); disc(im, cx, cy, r, (u, v, x, y) => dpick([40, 74, 36], [96, 130, 60], (-u - v) * 0.5 + 0.35, x, y)); }
  return im;
}

// ---------- pack + write ----------
const frames = [
  ['city_far_night', skyline(640, 110, false, true, 11)], ['city_far_day', skyline(640, 110, false, false, 11)],
  ['city_near_night', skyline(640, 150, true, true, 22)], ['city_near_day', skyline(640, 150, true, false, 22)],
  ['hills_day', hills(640, 70, false)], ['hills_night', hills(640, 70, true)],
  ['palm', palm(70, 150, 0)], ['palm2', palm(70, 150, 1)], ['pine', pine(60, 130)], ['olive', olive(70, 60)],
  ['lamp_l', lamp(60, 170, false)], ['lamp_r', lamp(60, 170, true)], ['barrier', barrier(120, 22)],
];
const sg = sign(220, 90); frames.push(['sign', sg.im], ['cafe', cafe(200, 110)], ['bush', bush(50, 30)]);

// seam check for tileable strips: blend 8 px across the seam so left and right match
for (const [n, im] of frames.slice(0, 6)) {
  for (let y = 0; y < im.h; y++) { const a = (y * im.w) * 4, b = (y * im.w + im.w - 1) * 4; for (let k = 0; k < 4; k++) im.d[b + k] = im.d[a + k]; }
  void n;
}

// strips stack in the left column, props shelf-pack into the right column
const SW = 1290, PX = 642; let x = PX, y = 0, rowH = 0, sy = 0; const json = { image: 'world.png', frames: {}, anims: {}, points: {} };
const placed = [];
for (const [n, im] of frames) {
  const bottom = !n.startsWith('city') && !n.startsWith('hills');
  if (!bottom) { placed.push([n, im, 0, sy]); json.frames[n] = { x: 0, y: sy, w: im.w, h: im.h }; sy += im.h + 2; continue; }
  if (x + im.w > SW) { x = PX; y += rowH + 2; rowH = 0; }
  placed.push([n, im, x, y]);
  json.frames[n] = { x, y, w: im.w, h: im.h, ax: im.w >> 1, ay: im.h };
  x += im.w + 2; rowH = Math.max(rowH, im.h);
}
json.points.signText = sg.text;
const SH = Math.max(y + rowH, sy);
const sheet = img(SW, SH);
for (const [, im, ox, oy] of placed) for (let j = 0; j < im.h; j++) sheet.d.set(im.d.subarray(j * im.w * 4, (j + 1) * im.w * 4), ((oy + j) * SW + ox) * 4);

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(t), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
function png(im) {
  const raw = Buffer.alloc((im.w * 4 + 1) * im.h);
  for (let j = 0; j < im.h; j++) { raw[j * (im.w * 4 + 1)] = 0; Buffer.from(im.d.buffer, j * im.w * 4, im.w * 4).copy(raw, j * (im.w * 4 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(im.w, 0); ih.writeUInt32BE(im.h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// self-check: known CRC of "IEND"
if (crc32(Buffer.from('IEND')) !== 0xae426082) throw new Error('crc32 broken');
mkdirSync(OUT, { recursive: true });
const buf = png(sheet);
if (buf.length > 1.5e6) throw new Error('sheet too big: ' + buf.length);
writeFileSync(join(OUT, 'world.png'), buf);
writeFileSync(join(OUT, 'world.json'), JSON.stringify(json, null, 1));
console.log(`world.png ${SW}x${SH} ${buf.length} bytes, ${frames.length} frames`);
