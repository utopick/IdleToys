// Procedural roadside scenery sheet: node tools/make-scenery.mjs -> art/scenery.png + art/scenery.json
import { writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'art');
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y, t) => t > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; // true -> second colour
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)).concat(a[3] ?? 255);
const sh = (c, f) => [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(c[i] * f)))).concat(c[3] ?? 255);

function canvas(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  const c = { w, h, d };
  c.set = (x, y, col, a = 255) => {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4, al = (col[3] ?? 255) * a / 255 / 255, ob = d[i + 3] / 255;
    const oa = al + ob * (1 - al); if (oa <= 0) return;
    for (let k = 0; k < 3; k++) d[i + k] = (col[k] * al + d[i + k] * ob * (1 - al)) / oa;
    d[i + 3] = oa * 255;
  };
  c.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3];
  c.rect = (x, y, rw, rh, col) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) c.set(x + i, y + j, col); };
  // vertical-gradient rect with ordered dither between shades
  c.grad = (x, y, rw, rh, top, bot, horiz = 0) => {
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
      const t = horiz ? i / Math.max(1, rw - 1) : j / Math.max(1, rh - 1);
      const steps = 5, s = t * steps, lo = Math.floor(s);
      const k = dith(x + i, y + j, s - lo) ? lo + 1 : lo;
      c.set(x + i, y + j, mix(top, bot, Math.min(1, k / steps)));
    }
  };
  c.disc = (cx, cy, r, col, a = 255) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) c.set(cx + i, cy + j, col, a); };
  c.glow = (cx, cy, r, col, peak = 200) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const q = Math.sqrt(i * i + j * j) / r; if (q < 1) c.set(cx + i, cy + j, col, peak * (1 - q) ** 2); } };
  c.line = (x0, y0, x1, y1, col, wd = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; for (let a = 0; a < wd; a++) for (let b = 0; b < wd; b++) c.set(Math.round(x - wd / 2 + a), Math.round(y - wd / 2 + b), col); }
  };
  return c;
}
// dark 1px outline around opaque pixels, helps read when scaled down
function outline(c, col) {
  const m = []; for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (!c.get(x, y) && (c.get(x - 1, y) > 128 || c.get(x + 1, y) > 128 || c.get(x, y - 1) > 128 || c.get(x, y + 1) > 128)) m.push([x, y]);
  for (const [x, y] of m) c.set(x, y, col, 170);
}

const frames = {}; // name -> {c, extra}
const add = (name, c, extra) => (frames[name] = { c, extra });
const LIT = [[255, 214, 120], [255, 190, 90], [255, 236, 170], [120, 230, 255], [255, 120, 200], [255, 246, 220]];

// ---------- towers ----------
const TOWER_KINDS = ['glass', 'glassStep', 'round', 'apart', 'billboard', 'glassStep', 'apart', 'glass'];
for (let t = 0; t < 8; t++) {
  const kind = TOWER_KINDS[t];
  const w = ri(40, 90) & ~1, h = ri(110, 220);
  const c = canvas(w, h), L = canvas(w, h);
  const glass = kind.startsWith('glass') || kind === 'round' || kind === 'billboard';
  const base = glass ? [[120, 140, 165], [95, 120, 150], [140, 150, 160], [110, 130, 140]][t % 4] : [[170, 140, 115], [185, 170, 140], [150, 120, 105]][t % 3];
  // silhouette: list of [x0,x1,yTop] tiers
  const tiers = [[0, w, kind === 'billboard' ? 34 : 10]];
  if (kind === 'glassStep') { tiers.push([Math.round(w * .15), Math.round(w * .85), 4 + ri(0, 4) - 12]); tiers[0][2] = 18; tiers[1][2] = 6; tiers.push([Math.round(w * .3), Math.round(w * .7), 0]); }
  if (kind === 'round') tiers[0][2] = Math.round(w / 2);
  const side = Math.max(4, Math.round(w * .22)); // darker right face
  for (const [x0, x1, yt] of tiers) {
    c.grad(x0, yt, x1 - x0 - side, h - yt, sh(base, 1.15), sh(base, .8));
    c.grad(x1 - side, yt, side, h - yt, sh(base, .7), sh(base, .5));
    c.rect(x0, yt, x1 - x0, 1, sh(base, 1.35)); c.rect(x0, yt + 1, x1 - x0, 1, sh(base, 1.2));
  }
  if (kind === 'round') { // dome cap
    const r = w / 2; for (let y = 0; y < r; y++) for (let x = 0; x < w; x++) { const dx = (x + .5 - r) / r, dy = (r - y - .5) / r; if (dx * dx + dy * dy <= 1) { const l = .75 + .5 * (-dx * .6 + dy * .5); c.set(x, y, sh(base, dith(x, y, (l * 6) % 1) ? Math.ceil(l * 6) / 6 : Math.floor(l * 6) / 6)); } }
    c.rect(w / 2 - 1, 0, 2, 1, [230, 235, 240]);
  }
  // windows
  const ww = glass ? 2 : 3, wh = glass ? 2 : 3, gx = glass ? 4 : 6, gy = glass ? 4 : 6;
  const winDark = glass ? [40, 60, 85] : [55, 50, 55];
  const top0 = tiers.reduce((m, q) => Math.max(m, q[2]), 0);
  for (let y = 6; y < h - 10; y += gy) for (let x = 3; x < w - 3; x += gx) {
    if (c.get(x, y - 3) < 255 || c.get(x + ww, y - 3) < 255) continue; // keep a margin under each roof edge
    if (kind === 'round' && y < w / 2 + 4) continue;
    const onSide = x >= w - side;
    const reflect = glass && ((x + y * 0.7) % 23 < 6);
    let col = sh(winDark, onSide ? .7 : 1);
    if (reflect) col = mix(col, [190, 210, 230], .45);
    c.rect(x, y, ww, wh, col);
    c.set(x, y, sh(col, 1.5)); // glint
    if (!glass) { c.rect(x - 1, y + wh, ww + 2, 1, sh(base, 1.3)); } // sill
    if (rnd() < .3 && y > top0) { const lc = LIT[ri(0, rnd() < .8 ? 2 : 5)]; L.rect(x, y, ww, wh, sh(lc, onSide ? .8 : 1)); L.set(x, y, [255, 255, 240]); }
  }
  if (kind === 'apart') for (let y = 12; y < h - 14; y += 12) c.rect(2, y + 4, w - side - 2, 1, sh(base, .6)); // balcony bands
  // ground floor lobby
  c.grad(2, h - 9, w - 4, 9, [60, 70, 80], [30, 35, 45]); c.rect(0, h - 10, w, 1, sh(base, 1.4));
  for (let x = 4; x < w - 4; x += 6) c.rect(x, h - 8, 1, 8, sh(base, .9));
  L.grad(3, h - 8, w - 6, 7, [255, 230, 170, 200], [255, 200, 120, 120]);
  // roof details
  const roofY = tiers[tiers.length - 1][2], cx = Math.round(w / 2);
  if (kind !== 'round') {
    c.rect(cx - 4, roofY - 4, 8, 4, sh(base, .6)); c.rect(cx - 4, roofY - 4, 8, 1, sh(base, .9)); // machine room
    const ah = ri(8, 26); c.line(cx + 1, roofY - 4, cx + 1, roofY - 4 - ah, [150, 150, 155]); c.line(cx + 2, roofY - 4, cx + 2, roofY - 4 - ah, [90, 90, 95]);
    L.glow(cx + 1, roofY - 4 - ah, 4, [255, 40, 30], 255); L.set(cx + 1, roofY - 4 - ah, [255, 120, 100]);
  }
  L.glow(1, tiers[0][2] + 1, 3, [255, 40, 30], 230); L.glow(w - 2, tiers[0][2] + 1, 3, [255, 40, 30], 230);
  if (kind === 'billboard') { // frame on top with blank panel
    c.rect(4, 4, w - 8, 22, [70, 70, 75]); c.grad(6, 6, w - 12, 18, [210, 205, 190], [160, 150, 140]);
    for (let x = 8; x < w - 8; x += 10) c.line(x, 26, x, 34, [80, 80, 85]);
    L.rect(6, 6, w - 12, 18, [255, 250, 230, 70]); for (let x = 8; x < w - 8; x += 10) L.glow(x, 6, 4, [255, 240, 200], 180);
  }
  if (t % 3 === 1 || kind === 'billboard') { // abstract neon glyph panel
    const nc = [[255, 80, 200], [80, 230, 255], [255, 160, 60]][t % 3], px = 3, py = Math.round(h * .45);
    c.rect(px, py, 7, 26, [40, 40, 50]);
    for (let g = 0; g < 4; g++) { const gy0 = py + 2 + g * 6, shape = ri(0, 3);
      const pts = [[[1, 0], [4, 0], [4, 4], [1, 4]], [[1, 0], [4, 4]], [[1, 2], [4, 2], [2, 0], [2, 4]], [[1, 4], [2, 0], [4, 4]]][shape];
      for (let k = 0; k < pts.length - 1; k++) { c.line(px + 1 + pts[k][0], gy0 + pts[k][1], px + 1 + pts[k + 1][0], gy0 + pts[k + 1][1], sh(nc, .5)); L.line(px + 1 + pts[k][0], gy0 + pts[k][1], px + 1 + pts[k + 1][0], gy0 + pts[k + 1][1], nc); }
    }
    L.glow(px + 3, py + 13, 14, nc, 70);
  }
  add('tower' + t, c); add('tower' + t + '_lit', L);
}

// ---------- palms ----------
function palm(name, w, h, bend) {
  const c = canvas(w, h), bx = Math.round(w / 2 - bend / 2), topY = 26, tx = bx + bend;
  const pt = s => [bx + bend * s * s, h - 1 - (h - 1 - topY) * s];
  for (let s = 0; s <= 1; s += 1 / (h * 1.5)) {
    const [x, y] = pt(s), wd = 5 - 2.5 * s, ring = Math.floor(y / 3) % 2;
    for (let i = -wd; i <= wd; i++) { const l = 1.1 - (i + wd) / (2 * wd) * .6; c.set(x + i, y, sh(ring ? [150, 115, 80] : [125, 95, 65], l)); }
  }
  const greens = [[40, 90, 35], [55, 115, 40], [75, 140, 50], [100, 165, 60], [130, 185, 75]];
  const nF = 13;
  for (let f = 0; f < nF; f++) {
    const ang = -Math.PI + (f + .5) / nF * Math.PI + (rnd() - .5) * .3, len = ri(18, w / 2 - Math.abs(bend) / 2 - 3), droop = .9 + rnd() * .6;
    let px = tx, py = topY, vx = Math.cos(ang), vy = Math.sin(ang) * .9 - .2;
    for (let s = 0; s < len; s++) {
      vy += droop * .11; const m = Math.hypot(vx, vy); vx /= m; vy /= m; px += vx; py += vy;
      const lw = Math.round(7 * Math.sin(Math.PI * s / len)) + 1;
      for (let k = -lw; k <= lw; k++) { if (k && (s + Math.abs(k)) % 3 === 0) continue; // leaflets hang down from the rib, gaps make them feathery
        const lx = px + k * .3 * -vy, ly = py + Math.abs(k) * .9;
        const gi = Math.max(0, Math.min(4, 3 - Math.round(Math.abs(k) / lw * 2) + (f % 2) - (s > len * .7 ? 1 : 0) + (k < 0 ? 1 : 0)));
        c.set(lx, ly, greens[gi]);
      }
      c.set(px, py, [150, 170, 80]);
    }
  }
  for (let i = 0; i < 4; i++) c.disc(tx - 3 + i * 2, topY + 3, 2, sh([110, 80, 40], .8 + i * .1)); // coconuts
  outline(c, [20, 35, 20]);
  add(name, c);
}
palm('palm0', 56, 120, 10); palm('palm1', 48, 104, -6); palm('palm2', 64, 130, 16);

// ---------- pines ----------
function pine(name, w, h, snow) {
  const c = canvas(w, h), cx = w / 2, trunkH = Math.round(h * .12);
  c.grad(cx - 3, h - trunkH - 4, 6, trunkH + 4, [120, 85, 55], [70, 50, 35], 1);
  const tiers = 6, tops = [];
  for (let t = 0; t < tiers; t++) {
    const yT = Math.round(t * (h - trunkH) / (tiers + 1)), yB = Math.round(yT + (h - trunkH) * 0.34), hw = (w / 2 - 1) * (0.35 + 0.65 * (t + 1) / tiers);
    tops.push([yT, yB, hw]);
    for (let y = yT; y < yB; y++) { const q = (y - yT) / (yB - yT), half = hw * q;
      for (let x = Math.floor(cx - half); x <= cx + half; x++) {
        const u = (x - cx + half) / (2 * half + .01); // 0 left (lit) .. 1 right
        const l = 1.2 - u * .7 - q * .25 + (Math.sin(x * 1.7 + y * 2.3) > .6 ? .15 : 0);
        const lv = Math.max(0, Math.min(4, l * 3)); const k = dith(x, y, lv % 1) ? Math.ceil(lv) : Math.floor(lv);
        c.set(x, y, [[20, 45, 30], [28, 62, 38], [38, 82, 46], [52, 102, 55], [70, 122, 66]][Math.min(4, k)]);
      }
      if (snow && q > 0) { // snow on the top of each branch layer
        for (let x = Math.floor(cx - half); x <= cx + half; x++) { const edge = (y - yT) < 3 + Math.abs(Math.sin(x * .9)) * 2 || (y === yB - 1 && rnd() < .6);
          if (edge && rnd() < .85) c.set(x, y, x < cx ? [245, 248, 255] : [200, 210, 230]); }
      }
    }
  }
  if (snow) for (const [yT, yB, hw] of tops) for (let y = yT; y < yB; y++) { // second pass so lower tiers don't cover it
    const q = (y - yT) / (yB - yT), half = hw * q, lump = (x) => Math.sin(x * 1.3 + yT) > -.2;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const edge = Math.abs(x - cx) > half - 2 - (q > .8 ? 2 : 0), shelf = y >= yB - 3 && y <= yB - 2 && lump(x);
      if ((edge && y < yB - 1 && (x + y) % 3) || shelf) c.set(x, y, x < cx ? (y % 2 ? [255, 255, 255] : [235, 240, 250]) : [195, 205, 228]);
    }
  }
  outline(c, [10, 25, 18]); add(name, c);
}
const ps = seed; pine('pine0', 40, 90, 0); pine('pine1', 48, 110, 0); seed = ps; pine('pine0_snow', 40, 90, 1); pine('pine1_snow', 48, 110, 1);

// ---------- lamp ----------
{ const w = 40, h = 120, c = canvas(w, h), L = canvas(w, h), px = 32;
  c.grad(px - 2, 14, 4, h - 14, [190, 195, 200], [110, 115, 120], 1); c.rect(px - 4, h - 6, 8, 6, [90, 95, 100]); c.rect(px - 4, h - 6, 8, 1, [150, 155, 160]);
  for (let x = 6; x <= px; x++) { const y = 14 - Math.round(4 * Math.sin((x - 6) / (px - 6) * Math.PI / 2)); c.set(x, y + 4, [190, 195, 200]); c.set(x, y + 5, [120, 125, 130]); }
  c.rect(2, 9, 14, 4, [80, 85, 90]); c.rect(2, 9, 14, 1, [160, 165, 170]); c.rect(3, 13, 12, 2, [220, 225, 200]); // head + lens
  L.glow(9, 14, 9, [255, 220, 150], 255); L.rect(3, 13, 12, 2, [255, 250, 220]);
  for (let y = 15; y < h; y++) { const s = (y - 15) / (h - 15), hw = 6 + s * 14; for (let x = 0; x < w; x++) { const d = Math.abs(x - 9) / hw; if (d < 1) L.set(x, y, [255, 210, 140], 60 * (1 - d) * (1 - s)); } }
  add('lamp', c); add('lamp_lit', L); }

// ---------- sign ----------
{ const w = 120, h = 70, c = canvas(w, h);
  for (const x of [22, 94]) c.grad(x, 40, 4, 30, [170, 175, 180], [100, 105, 110], 1);
  c.rect(0, 0, w, 46, [235, 240, 235]); c.grad(2, 2, w - 4, 42, [30, 125, 70], [15, 90, 50]); c.rect(0, 46, w, 1, [70, 80, 75]);
  c.rect(3, 3, w - 6, 1, [255, 255, 255]); c.rect(3, 42, w - 6, 1, [255, 255, 255]); c.rect(3, 3, 1, 40, [255, 255, 255]); c.rect(w - 4, 3, 1, 40, [255, 255, 255]);
  for (const x of [6, w - 7]) for (const y of [6, 39]) c.set(x, y, [200, 210, 200]); // rivets
  add('sign', c, { face: { x: 6, y: 6, w: w - 12, h: 34 } }); }

// ---------- rail ----------
{ const w = 64, h = 16, c = canvas(w, h);
  c.grad(28, 6, 6, 10, [120, 120, 125], [70, 70, 75], 1);
  const band = [[150, 155, 160], [215, 220, 225], [245, 248, 250], [180, 185, 190], [120, 125, 130], [175, 180, 185], [225, 228, 232], [140, 145, 150], [90, 95, 100]];
  band.forEach((col, j) => { for (let x = 0; x < w; x++) c.set(x, 2 + j, sh(col, dith(x, j, .2) ? .95 : 1)); });
  for (const x of [30, 31]) { c.set(x, 5, [60, 60, 60]); c.set(x, 8, [60, 60, 60]); }
  add('rail', c); }

// ---------- cafe ----------
{ const w = 140, h = 80, c = canvas(w, h), L = canvas(w, h);
  c.grad(4, 22, w - 8, h - 22, [225, 215, 195], [175, 165, 150]); c.rect(4, h - 4, w - 8, 4, [110, 100, 95]);
  c.grad(0, 14, w, 8, [150, 70, 60], [110, 50, 45]); c.rect(0, 14, w, 1, [190, 110, 95]); // roof
  for (let x = 4; x < w - 4; x++) for (let y = 30; y < 38; y++) { const red = Math.floor((x - 4) / 6) % 2; c.set(x, y, red ? sh([210, 60, 55], 1.05 - (y - 30) * .05) : sh([245, 240, 230], 1 - (y - 30) * .04)); }
  for (let x = 4; x < w - 4; x += 6) c.disc(x + 3, 38, 2, Math.floor((x - 4) / 6) % 2 ? [190, 50, 45] : [230, 225, 215]); // scalloped edge
  for (let i = 0; i < 4; i++) { const x = 10 + i * 30; if (i === 2) continue; c.grad(x, 44, 22, 22, [70, 95, 110], [35, 50, 65]); c.rect(x, 44, 22, 1, [150, 175, 190]); c.line(x + 3, 46, x + 9, 60, [120, 150, 170]);
    L.grad(x, 44, 22, 22, [255, 225, 150], [255, 185, 100]); L.glow(x + 11, 55, 18, [255, 200, 120], 60); }
  c.grad(72, 46, 14, 30, [120, 80, 55], [80, 55, 40]); c.rect(74, 48, 10, 12, [80, 110, 125]); L.rect(74, 48, 10, 12, [255, 220, 150]);
  // neon cup sign on the roof
  c.rect(52, 0, 36, 14, [50, 45, 50]); const cupC = [80, 230, 255], k = [255, 90, 200];
  const cup = [[60, 4, 60, 11], [60, 11, 72, 11], [72, 11, 72, 4], [72, 5, 76, 7], [76, 7, 72, 9], [64, 1, 63, 3], [68, 1, 67, 3], [80, 5, 85, 5], [80, 9, 85, 9]];
  cup.forEach(([a, b, d, e], i) => { const col = i > 6 ? k : cupC; c.line(a, b, d, e, sh(col, .45)); L.line(a, b, d, e, col); });
  L.glow(70, 7, 20, cupC, 70);
  add('cafe', c); add('cafe_lit', L); }

// ---------- fuel ----------
{ const w = 160, h = 80, c = canvas(w, h), L = canvas(w, h);
  c.grad(108, 34, 48, h - 34, [220, 220, 215], [170, 170, 165]); c.grad(112, 44, 30, 20, [70, 95, 110], [35, 50, 65]); L.grad(112, 44, 30, 20, [255, 240, 200], [255, 210, 150]); // kiosk
  for (const x of [14, 90]) c.grad(x, 14, 5, h - 14, [200, 200, 205], [130, 130, 135], 1);
  c.grad(0, 4, w - 50, 10, [240, 240, 240], [190, 190, 195]); c.rect(0, 9, w - 50, 2, [40, 120, 200]); c.rect(0, 14, w - 50, 2, [90, 90, 95]); // canopy
  for (let x = 6; x < w - 56; x += 12) L.rect(x, 15, 6, 1, [255, 255, 240]), L.glow(x + 3, 18, 10, [230, 245, 255], 90);
  for (const x of [34, 64]) { c.rect(x - 1, h - 4, 14, 4, [120, 120, 120]);
    c.grad(x, h - 30, 12, 26, [235, 60, 50], [160, 35, 30], 1); c.rect(x + 2, h - 27, 8, 5, [40, 50, 45]); c.rect(x + 1, h - 16, 1, 8, [40, 40, 40]);
    L.rect(x + 2, h - 27, 8, 5, [140, 255, 180]); }
  c.rect(0, h - 2, w, 2, [100, 100, 105]);
  add('fuel', c); add('fuel_lit', L); }

// ---------- hills (tileable 640 wide) ----------
{ const w = 640, h = 60, c = canvas(w, h);
  const ridge = (x, k, a) => a.reduce((s, [n, amp, ph]) => s + amp * Math.sin(2 * Math.PI * n * x / w + ph + k), 0);
  const layers = [ { base: 14, a: [[2, 10, 0], [5, 6, 1], [11, 3, 2], [23, 1.5, 3]], col: [150, 165, 185] },
                   { base: 30, a: [[3, 8, 2], [7, 4, 0], [17, 2, 1], [31, 1, 4]], col: [110, 135, 120] },
                   { base: 44, a: [[4, 5, 1], [9, 3, 3], [21, 1.5, 0]], col: [80, 110, 80] } ];
  layers.forEach(({ base, a, col }, li) => { for (let x = 0; x < w; x++) { const top = Math.round(base + ridge(x, li, a)), slope = ridge(x + 1, li, a) - ridge(x, li, a);
    for (let y = Math.max(0, top); y < h; y++) { const d = (y - top) / (h - top + 1); let l = 1 + (slope < 0 ? .12 : -.1) - d * .3; if (y === top) l += .15;
      const lv = l * 5, k = dith(x, y, lv % 1) ? Math.ceil(lv) : Math.floor(lv); c.set(x, y, sh(col, k / 5)); } } });
  add('hills', c); }

// ---------- clutter ----------
function blob(name, w, h, cols, bumps) {
  const c = canvas(w, h), cx = w / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ang = Math.atan2(h - y, x - cx), r = 1 + bumps * (Math.sin(ang * 7 + 1) * .5 + Math.sin(ang * 13) * .3);
    const dx = (x - cx) / (w / 2), dy = (h - y) / h; if (dx * dx + dy * dy > r * r * .95 || y >= h) continue;
    const l = (1 - dx) * .4 + dy * .6 + (Math.sin(x * 2.1) * Math.cos(y * 1.7) > .5 ? .2 : 0); const lv = Math.max(0, Math.min(cols.length - 1, l * (cols.length - 1)));
    c.set(x, y, cols[dith(x, y, lv % 1) ? Math.ceil(lv) : Math.floor(lv)]);
  }
  outline(c, [25, 25, 25]); add(name, c);
}
blob('rock0', 32, 22, [[70, 65, 60], [100, 95, 88], [130, 124, 115], [165, 160, 150], [195, 190, 180]], .08);
blob('bush0', 28, 20, [[25, 55, 25], [40, 80, 35], [60, 105, 45], [85, 130, 60], [115, 155, 75]], .12);
blob('bush1', 40, 24, [[35, 55, 20], [55, 80, 30], [80, 105, 40], [110, 130, 55], [140, 155, 70]], .15);

// ---------- pack (shelves, tallest first) ----------
const names = Object.keys(frames).sort((a, b) => frames[b].c.h - frames[a].c.h || a.localeCompare(b));
const SW = 1024, G = 2; let x = 0, y = 0, rowH = 0; const pos = {};
for (const n of names) { const { w, h } = frames[n].c; if (x + w > SW) { x = 0; y += rowH + G; rowH = 0; } pos[n] = [x, y]; x += w + G; rowH = Math.max(rowH, h); }
const SH = y + rowH, sheet = new Uint8Array(SW * SH * 4), json = { image: 'scenery.png', frames: {}, anims: {} };
for (const n of Object.keys(frames).sort()) { const { c, extra } = frames[n], [px, py] = pos[n];
  for (let j = 0; j < c.h; j++) sheet.set(c.d.subarray(j * c.w * 4, (j + 1) * c.w * 4), ((py + j) * SW + px) * 4);
  json.frames[n] = { x: px, y: py, w: c.w, h: c.h, ax: c.w / 2, ay: c.h, ...extra }; }

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let j = 0; j < h; j++) { raw[j * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, j * w * 4, w * 4).copy(raw, j * (w * 4 + 1) + 1); }
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, cr]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync(join(OUT, 'scenery.png'), png(SW, SH, sheet));
writeFileSync(join(OUT, 'scenery.json'), JSON.stringify(json, null, 1));
// self-check: every frame inside the sheet and no overlaps
const fr = Object.values(json.frames);
for (const a of fr) { if (a.x + a.w > SW || a.y + a.h > SH) throw new Error('frame out of sheet');
  for (const b of fr) if (a !== b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) throw new Error('overlap'); }
console.log(`scenery.png ${SW}x${SH}, ${fr.length} frames`);
