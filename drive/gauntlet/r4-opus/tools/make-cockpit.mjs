// Generates art/cockpit.png + art/cockpit.json (cockpit overlay, wheel, lamps). Plain Node, no deps.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ART = join(dirname(fileURLToPath(import.meta.url)), '..', 'art');

// ---------- raster + PNG ----------
class C { constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a = 1) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const i = (y * this.w + x) * 4, d = this.d, sa = a, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return; for (let k = 0; k < 3; k++) d[i + k] = (c[k] * sa + d[i + k] * da * (1 - sa)) / oa; d[i + 3] = oa * 255; }
  add(x, y, c, a) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4;
    if (!this.d[i + 3]) return; for (let k = 0; k < 3; k++) this.d[i + k] += c[k] * a; }
  clear(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[(y * this.w + x) * 4 + 3] = 0; }
  alpha(x, y) { return this.d[(y * this.w + x) * 4 + 3]; }
  blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const i = (y * src.w + x) * 4, j = ((y + oy) * this.w + x + ox) * 4; for (let k = 0; k < 4; k++) this.d[j + k] = src.d[i + k]; } } }
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
function png(cv) { const raw = Buffer.alloc((cv.w * 4 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) { raw[y * (cv.w * 4 + 1)] = 0; Buffer.from(cv.d.buffer, y * cv.w * 4, cv.w * 4).copy(raw, y * (cv.w * 4 + 1) + 1); }
  const chunk = (t, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(t), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, cr]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(cv.w, 0); ih.writeUInt32BE(cv.h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]); }

// ---------- helpers ----------
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const R = a => a.map(hex);
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
function ramp(p, t, x, y) { t = cl(t) * (p.length - 1); const i = Math.floor(t); return p[Math.min(p.length - 1, i + (t - i > bay(x, y) ? 1 : 0))]; }
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function region(cv, x0, y0, x1, y1, fn) { for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { const r = fn(x, y); if (r) cv.set(x, y, r[0] ? r : r, 1); } }
function rrect(cv, x, y, w, h, rad, fn) { region(cv, x, y, x + w - 1, y + h - 1, (px, py) => { const dx = Math.max(x + rad - px, 0, px - (x + w - 1 - rad)), dy = Math.max(y + rad - py, 0, py - (y + h - 1 - rad)); return dx * dx + dy * dy <= rad * rad + 0.5 ? fn(px, py, (px - x) / w, (py - y) / h) : null; }); }
function circ(cv, cx, cy, r, fn) { region(cv, cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= r ? fn(x, y, d / r, Math.atan2(y - cy, x - cx)) : null; }); }
function line(cv, x0, y0, x1, y1, c, a = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) cv.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c, a); }
function inPoly(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) != (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; }
function poly(cv, p, fn) { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); region(cv, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (x, y) => inPoly(p, x + .5, y + .5) ? fn(x, y) : null); }
function glow(cv, cx, cy, r, c, a) { region(cv, cx - r, cy - r, cx + r, cy + r, (x, y) => { const d = Math.hypot(x - cx, y - cy) / r; if (d < 1) cv.add(x, y, c, a * (1 - d) * (1 - d)); return null; }); }
// 3x5 digits
const F = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111' };
function text(cv, s, x, y, c, a = 1) { for (const ch of String(s)) { const g = F[ch]; if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') cv.set(x + i % 3, y + (i / 3 | 0), c, a); x += 4; } }

// ---------- palettes ----------
const PAL = {
  night: { pl: R(['#06040c', '#0b0716', '#120b21', '#1a102e', '#22163c', '#2c1c4b', '#3a265e', '#4b3274']), fab: R(['#08060e', '#0e0a17', '#151020', '#1c162b']),
    chrome: R(['#120c1e', '#251a38', '#3e2e58', '#5f4c80', '#8a76a8']), face: R(['#050307', '#0a0610', '#110a18', '#1a0f1e']), tick: hex('#ffa040'), num: hex('#ffc070'), red: hex('#ff3a28'),
    lcd: hex('#06120f'), lit: 1, glass: R(['#05040a', '#0b0a16', '#151628', '#232a40']) },
  day: { pl: R(['#1e171c', '#2c2229', '#3a2e36', '#4a3c44', '#5c4c53', '#706066', '#86747a', '#a08d90', '#bba8a6']), fab: R(['#3c3236', '#4a3f43', '#584c50', '#665a5c']),
    chrome: R(['#2a2428', '#4c4448', '#7c7274', '#b0a6a4', '#e8e0d8']), face: R(['#0c0a0c', '#151215', '#1e1a1e', '#2a2428']), tick: hex('#e8dcc0'), num: hex('#f4ead0'), red: hex('#c83a30'),
    lcd: hex('#06120f'), lit: 0, glass: R(['#1a2030', '#2a3448', '#3e4c64', '#5a6c88']) } };

const POINTS = { speedo: { x: 250, y: 290, r: 34 }, tacho: { x: 330, y: 290, r: 28 }, screen: { x: 420, y: 258, w: 88, h: 26 }, blinkL: { x: 271, y: 244 }, blinkR: { x: 295, y: 244 }, beam: { x: 283, y: 258 }, wheel: { x: 250, y: 362 } };

// ---------- dashboard ----------
function dash(mode) {
  const P = PAL[mode], cv = new C(640, 360), pl = P.pl, N = pl.length;
  const plast = (x, y, t) => ramp(pl, t + (hash(x, y) - .5) * .06, x, y);
  // roof liner
  region(cv, 0, 0, 639, 22, (x, y) => ramp(P.fab, .9 - y / 26 + (hash(x >> 1, y) - .5) * .25, x, y));
  for (let x = 0; x < 640; x++) { cv.set(x, 21, pl[3]); cv.set(x, 22, pl[1]); }
  // dome light + sun visors seams
  rrect(cv, 300, 1, 40, 6, 2, (x, y) => ramp(P.chrome, .7 - (y - 1) / 8, x, y));
  for (const vx of [60, 440]) { rrect(cv, vx, 2, 140, 17, 4, (x, y, u, v) => ramp(P.fab, .95 - v * .7 + (hash(x, y) - .5) * .2, x, y)); for (let x = vx + 6; x < vx + 134; x += 3) cv.set(x, 16, P.fab[0]); }
  // mirror stem + mirror
  region(cv, 314, 0, 326, 14, (x, y) => ramp(pl, .3 + (x - 314) / 18, x, y));
  rrect(cv, 260, 10, 120, 30, 7, (x, y, u, v) => plast(x, y, .55 - v * .4 + (u < .05 || u > .95 ? -.1 : 0)));
  rrect(cv, 264, 14, 112, 22, 5, (x, y, u, v) => { let t = .15 + v * .2 + (u - v * .3 > .55 && u - v * .3 < .62 ? .5 : 0) + (u - v * .3 > .66 && u - v * .3 < .68 ? .3 : 0); return ramp(P.glass, t, x, y); });
  if (P.lit) { for (let x = 270; x < 300; x++) cv.add(x, 32, hex('#ff3cac'), .25); for (let x = 340; x < 370; x++) cv.add(x, 18, hex('#30e8ff'), .25); }
  // A-pillars
  for (const s of [0, 1]) { const m = x => s ? 639 - x : x;
    poly(cv, [[m(0), 22], [m(104), 22], [m(44), 228], [m(0), 228]].map(q => q), (x, y) => { const X = s ? 639 - x : x, edge = 104 - (y - 22) * 60 / 206; const u = X / edge; return plast(x, y, .2 + u * .45 + (u > .9 ? .25 : 0) - y / 900); });
    for (let y = 22; y < 228; y++) { const e = Math.round(104 - (y - 22) * 60 / 206); cv.set(m(e), y, pl[N - 1]); cv.set(m(e - 1), y, pl[N - 3]); }
    // grab handle bolts
    for (const by of [60, 110]) { const bx = Math.round(104 - (by - 22) * 60 / 206) - 14; circ(cv, m(bx), by, 2, (x, y, d) => ramp(P.chrome, 1 - d, x, y)); } }
  // dashboard body; top edge y=225, cluster hood bump
  const top = x => { let t = 225; if (x > 196 && x < 384) t -= Math.round(12 * Math.sin(Math.PI * (x - 196) / 188) ** .6); return t; };
  region(cv, 0, 205, 639, 359, (x, y) => { const t0 = top(x); if (y < t0) return null; const v = (y - t0) / (360 - t0);
    return plast(x, y, .72 - v * .55 - (y - t0 < 2 ? -.2 : 0) + (y - t0 > 5 && y - t0 < 8 ? -.15 : 0)); });
  // top edge reflections
  for (let x = 0; x < 640; x++) { const t0 = top(x);
    if (P.lit) { const k = x / 640, c = [255 * (1 - k) + 48 * k, 60 * (1 - k) + 232 * k, 172 * (1 - k) + 255 * k]; for (let d = 0; d < 4; d++) if (bay(x, d) < .55 - d * .13) cv.add(x, t0 + d, c, .35 - d * .07); }
    else { cv.set(x, t0, pl[N - 1]); if ((x > 120 && x < 170) || (x > 470 && x < 490)) for (let d = 0; d < 3; d++) cv.set(x, t0 + d, hex('#fff4e0'), .8 - d * .25); } }
  // seam lines
  for (let x = 0; x < 640; x++) cv.set(x, 342, pl[1]);
  // cluster recess
  rrect(cv, 200, 240, 180, 98, 14, (x, y, u, v) => plast(x, y, .12 - v * .1 + (v < .06 ? .25 : 0)));
  rrect(cv, 204, 246, 172, 88, 12, (x, y, u, v) => ramp(P.face, .5 - v * .4, x, y));
  // dials
  const dial = (cx, cy, r, max, step, lab, red) => {
    circ(cv, cx, cy, r + 3, (x, y, d, a) => ramp(P.chrome, .5 - Math.sin(a) * .4 + (d > .96 ? -.3 : 0), x, y));
    circ(cv, cx, cy, r, (x, y, d) => ramp(P.face, .2 + d * .6 + (P.lit ? 0 : (x - cx < -r * .3 && y - cy < -r * .3 && d > .6 ? .4 : 0)), x, y));
    if (P.lit) { region(cv, cx - r, cy - r, cx + r, cy + r, (x, y) => { const d = Math.hypot(x - cx, y - cy) / r; if (d < 1 && d > .5) cv.add(x, y, P.tick, .12 * (d - .5) * 2 * (bay(x, y) < .6 ? 1 : .6)); return null; }); }
    const A0 = 225, SW = 270, n = max / step;
    for (let i = 0; i <= n * 4; i++) { const a = (A0 - SW * i / (n * 4)) * Math.PI / 180, maj = i % 4 === 0, r0 = r - (maj ? 7 : 4), isRed = red && i / 4 >= red;
      const c = isRed ? P.red : P.tick; for (let k = r0; k <= r - 2; k++) cv.set(cx + Math.cos(a) * k, cy - Math.sin(a) * k, c);
      if (maj) { const s = String((i / 4) * lab), tw = s.length * 4 - 1, rr = r - 13; text(cv, s, Math.round(cx + Math.cos(a) * rr - tw / 2), Math.round(cy - Math.sin(a) * rr - 2), isRed ? P.red : P.num); } }
    if (P.lit) glow(cv, cx, cy, r + 8, P.tick, .18);
    circ(cv, cx, cy, 4, (x, y, d) => ramp(P.chrome, 1 - d, x, y));
  };
  dial(250, 290, 34, 240, 40, 40, 0);
  dial(330, 290, 28, 8, 1, 1, 6.5);
  // tiny fuel/temp bars right of tacho
  for (let i = 0; i < 8; i++) { cv.set(364, 272 + i * 4, P.tick, P.lit ? (i < 5 ? 1 : .25) : .5); cv.set(365, 272 + i * 4, P.tick, P.lit ? (i < 5 ? 1 : .25) : .5); cv.set(214, 272 + i * 4, i > 5 ? P.red : P.tick, P.lit ? .8 : .5); }
  // lamp sockets (blinkers, beam) and warning lamps
  for (const p of [POINTS.blinkL, POINTS.blinkR, POINTS.beam]) rrect(cv, p.x, p.y, 14, 12, 2, (x, y, u, v) => ramp(P.face, .3 + v * .3, x, y));
  const blinkShape = (dir) => (x, y) => { const X = dir < 0 ? 13 - x : x; return (Math.abs(y - 5.5) < 2 && X >= 2 && X <= 8) || (X >= 8 && X <= 12 && Math.abs(y - 5.5) <= 12 - X) ; };
  for (const [p, d] of [[POINTS.blinkL, -1], [POINTS.blinkR, 1]]) { const f = blinkShape(d); for (let y = 0; y < 12; y++) for (let x = 0; x < 14; x++) if (f(x, y)) cv.set(p.x + x, p.y + y, hex('#163a1c')); }
  const wl = ['#ff3a28', '#ffb020', '#ff3a28', '#30c0ff', '#ffb020'];
  wl.forEach((c, i) => rrect(cv, 232 + i * 11, 324, 8, 5, 1, (x, y) => P.lit ? hex(c).map(v => v * .35) : hex('#1a1416')));
  // left vent + switch bank
  const vent = (x0, y0, w, h) => { rrect(cv, x0, y0, w, h, 3, (x, y, u, v) => plast(x, y, .1 + (v < .1 ? .3 : 0))); for (let y = y0 + 3; y < y0 + h - 2; y += 3) for (let x = x0 + 3; x < x0 + w - 3; x++) { cv.set(x, y, pl[Math.min(N - 1, 5)]); cv.set(x, y + 1, pl[0]); } region(cv, x0 + w / 2 - 1, y0 + 2, x0 + w / 2, y0 + h - 3, (x, y) => pl[N - 2]); };
  vent(118, 246, 64, 24); vent(560, 246, 64, 24);
  for (let i = 0; i < 4; i++) { rrect(cv, 122 + i * 15, 282, 11, 16, 2, (x, y, u, v) => plast(x, y, .55 - v * .5 + (v < .15 ? .3 : 0))); if (P.lit) cv.set(127 + i * 15, 286, P.tick, .9); else cv.set(127 + i * 15, 286, P.tick, .6); }
  circ(cv, 150, 318, 9, (x, y, d, a) => ramp(P.chrome, .6 - Math.sin(a) * .35 - d * .2 + ((Math.round(a * 8 / Math.PI) & 1) && d > .8 ? -.2 : 0), x, y));
  // centre console
  rrect(cv, 395, 232, 130, 128, 8, (x, y, u, v) => plast(x, y, .62 - v * .45 + (u < .03 ? .2 : 0) + (u > .97 ? -.2 : 0)));
  vent(402, 236, 54, 18); vent(464, 236, 54, 18);
  rrect(cv, 416, 255, 96, 32, 3, (x, y, u, v) => ramp(P.chrome, .5 - v * .45, x, y));
  region(cv, 420, 258, 507, 283, (x, y) => P.lcd);
  for (let x = 420; x < 508; x++) cv.set(x, 258, hex('#0c2420'));
  // radio buttons
  for (let i = 0; i < 4; i++) { const bx = 408 + i * 28; rrect(cv, bx, 291, 22, 10, 2, (x, y, u, v) => plast(x, y, .8 - v * .7 + (v < .15 ? .2 : 0))); rrect(cv, bx, 300, 22, 2, 0, () => pl[0]); text(cv, i + 1, bx + 10, 293, P.lit ? P.tick : hex('#e8dcc0'), P.lit ? .8 : .6); }
  // cassette deck
  rrect(cv, 404, 306, 116, 22, 3, (x, y, u, v) => plast(x, y, .3 - v * .2));
  region(cv, 412, 312, 490, 316, (x, y) => ramp(P.face, (y - 312) / 6, x, y)); for (let x = 412; x <= 490; x++) cv.set(x, 317, pl[N - 3]);
  for (let i = 0; i < 4; i++) rrect(cv, 412 + i * 20, 320, 16, 5, 1, (x, y, u, v) => plast(x, y, .7 - v * .5));
  circ(cv, 506, 316, 7, (x, y, d, a) => ramp(P.chrome, .6 - Math.sin(a) * .35 - d * .2, x, y));
  if (P.lit) for (let i = 0; i < 4; i++) cv.add(420 + i * 20, 322, P.tick, .8);
  // passenger side glovebox seam
  for (let x = 540; x < 620; x++) cv.set(x, 300, pl[0]); for (let y = 300; y < 342; y++) cv.set(540, y, pl[0]);
  rrect(cv, 570, 304, 24, 6, 2, (x, y, u, v) => ramp(P.chrome, .7 - v * .6, x, y));
  // gear stick: boot + knob
  rrect(cv, 440, 346, 60, 14, 5, (x, y, u, v) => ramp(pl, .25 + Math.sin(u * Math.PI) * .3 + (Math.sin((y + (x - 470) * (x - 470) / 40) * 1.1) > .6 ? .15 : 0), x, y));
  for (let y = 348; y < 360; y += 3) { cv.set(469, y, P.chrome[2]); cv.set(471, y + 1, P.chrome[2]); }
  region(cv, 467, 340, 473, 348, (x, y) => ramp(P.chrome, .2 + (x - 467) / 8, x, y));
  circ(cv, 470, 336, 9, (x, y, d, a) => { const lx = (x - 466) / 10, ly = (y - 331) / 10; return ramp(pl, .9 - Math.hypot(lx, ly) * .9, x, y); });
  text(cv, "5", 469, 333, P.lit ? P.tick : P.chrome[4], .7);
  // doors (far edges): panel, window switches, speaker grille
  for (const s of [0, 1]) { const m = x => s ? 639 - x : x;
    poly(cv, [[m(0), 200], [m(36), 226], [m(56), 360], [m(0), 360]], (x, y) => { const X = s ? 639 - x : x; return plast(x, y, .3 + X / 160 - (y - 200) / 500); });
    region(cv, 0, 230, 639, 238, (x, y) => { const X = s ? 639 - x : x; return X < 34 + (y - 226) / 6 ? plast(x, y, .6 - (y - 230) / 14) : null; });
    for (let i = 0; i < 2; i++) rrect(cv, m(6 + i * 12) - (s ? 8 : 0), 240, 9, 6, 1, (x, y, u, v) => plast(x, y, .8 - v * .6));
    for (let gy = 300; gy < 352; gy += 4) for (let gx = 6; gx < 46; gx += 4) if (Math.hypot(gx - 24, gy - 326) < 20) { cv.set(m(gx), gy, pl[0]); cv.set(m(gx + 1), gy + 1, pl[3]); } }
  // windscreen: everything above dash between pillars is transparent
  for (let y = 23; y < 230; y++) for (let x = 0; x < 640; x++) { const X = Math.min(x, 639 - x), e = 104 - (y - 22) * 60 / 206;
    if (X > e && y < top(x) && !(y < 41 && x >= 258 && x <= 382) && !(y < 23)) cv.clear(x, y); }
  return cv;
}

// ---------- wheel + gloved hands ----------
const LEATHER = R(['#07050a', '#0e0b12', '#16121b', '#1f1a26', '#2a2333', '#372e42', '#473c54', '#5c4f6a']);
const GLOVE = R(['#060406', '#0e090c', '#181014', '#22181c', '#2e2026', '#3c2a30', '#4e383e']);
const SKIN = R(['#4a2420', '#6e3a2c', '#8e5038', '#b06a48', '#cc8660', '#e0a47c', '#f0c09a']);
const JACKET = R(['#0a0816', '#120f26', '#1c1838', '#28234c', '#353062', '#463f7a']);
const CHR = R(['#1a1424', '#3a3048', '#6a5e7c', '#a89cb8', '#e8e0f0']);
function wheel(angDeg) {
  const cv = new C(300, 150), cx = 150, cy = 142, Rin = 118, Rout = 134, Rm = 126, ang = angDeg * Math.PI / 180;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const shade = (lx, ly) => {
    const d = Math.hypot(lx, ly);
    // hands (mirrored): rim point at 32 deg
    const ax = Math.abs(lx), HA = 32 * Math.PI / 180;
    const ux = Math.cos(HA), uy = -Math.sin(HA), vx = -uy, vy = ux; // u radial out, v tangent (toward bottom for right hand)
    const hx = ax - ux * Rm, hy = ly - uy * Rm, n = (hx * ux + hy * uy) / 1.35, t = -(hx * vx + hy * vy) / 1.35; // 1.35 = hand scale // t>0 = toward top of wheel
    // sleeve (drawn first = lowest priority, but we return first match so order below is top-most first)
    // thumb on inner side pointing up the rim
    { const tt = t - 20, nn = n + 4; if (tt > -10 && tt < 10 && Math.abs(nn) < 5 - Math.max(0, tt - 5) * .6) { if (tt > 4) return ['s', .35 + (nn < 0 ? .3 : 0) + (tt > 7 ? .2 : 0)]; return ['g', .4 + (nn < -1 ? .2 : 0) - (Math.abs(nn) > 3.5 ? .25 : 0)]; } }
    // fingers wrap from n=+6 down to n=-17
    if (t > -15 && t < 15 && n < 8 && n > -18) { const fi = Math.floor((t + 15) / 7.5), ft = (t + 15) - fi * 7.5, edge = Math.abs(ft - 3.75) / 3.75;
      const tipLen = 17 - Math.abs(fi - 1.5) * 1.6; if (n > -tipLen) {
        if (edge > .86) return ['g', .02];
        const cyl = 1 - edge * edge;
        if (n < -tipLen + 6) return ['s', .2 + cyl * .65 - (n < -tipLen + 1.5 ? .25 : 0)]; // fingertips
        return ['g', .15 + cyl * .5 + (n > 2 ? .15 : 0) + (Math.abs(n + 7) < 1 ? -.15 : 0)]; } }
    // back of glove
    { const e = (t / 17) ** 2 + ((n - 11) / 11) ** 2; if (e < 1) {
      const fi = Math.floor((t + 15) / 7.5), ft = (t + 15) - fi * 7.5; // knuckle holes
      if (fi >= 0 && fi < 4 && Math.abs(ft - 3.75) < 2.2 && Math.abs(n - 5) < 2) return ['s', .55 + (n < 5 ? .2 : 0)];
      if (Math.abs(n - 13) < .6 && Math.abs(t) < 11 && ((t | 0) & 1)) return ['g', .7]; // stitch line
      return ['g', .2 + (1 - e) * .45 - (n - 11) / 40 + (t > 0 ? .1 : 0)]; } }
    // cuff + jacket sleeve going down-outward
    { const sx = ax - (ux * (Rm + 18)), sy = ly - (uy * (Rm + 18)); const dx = .35, dy = .94, along = sx * dx + sy * dy, across = sx * dy - sy * dx;
      if (along > -8 && Math.abs(across) < 13 + along * .25) { if (along < 2) return ['g', .55 - Math.abs(across) / 40 + (along < -5 ? .2 : 0)]; return ['j', .5 - across / (30 + along * .5) * .6 + (Math.abs(across - 4) < .7 && along > 8 ? .3 : 0) - (along < 5 ? .25 : 0)]; } }
    // rim
    if (d >= Rin && d <= Rout) { const u = (d - Rin) / (Rout - Rin), lit = Math.sin(u * Math.PI) * .6 + (1 - u) * .2 - ly / Rout * .15;
      const phi = Math.atan2(ly, lx), arc = phi * Rm; let tone = .05 + lit;
      if (Math.abs(d - Rm) < .8 && ((Math.floor(arc / 3) & 1) === 0)) return ['c', .7];
      if (Math.abs(d - Rm) < 2 && Math.abs(d - Rm) > .8) tone -= .1;
      if (u < .08 || u > .94) tone -= .2; return ['l', tone]; }
    // spokes: horizontal-ish at bottom, slight up angle
    { const sy = ly + Math.abs(lx) * .12; if (d < Rin + 2 && d > 30 && sy > -16 && sy < 8) return ['l', .25 + (sy < -12 ? .35 : 0) + (sy > 4 ? -.15 : 0) + (d > Rin - 6 ? -.1 : 0)]; }
    // hub
    if (d < 36) { const emb = Math.abs(lx) + Math.abs(ly + 20) * 1.4 < 9; if (emb) { const stripe = Math.abs(lx + (ly + 20) * .6) < 1.5; return ['c', stripe ? .2 : .55 + (ly + 20 < 0 ? .3 : 0)]; }
      if (d > 33) return ['c', .45 - ly / 80]; return ['l', .35 - d / 120 + (ly < -26 ? .1 : 0)]; }
    return null;
  };
  const pals = { l: LEATHER, g: GLOVE, s: SKIN, j: JACKET, c: CHR };
  for (let y = 0; y < 150; y++) for (let x = 0; x < 300; x++) { let a = 0; const dx = x + .5 - cx, dy = y + .5 - cy;
    const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca; const r = shade(lx, ly); if (r) cv.set(x, y, ramp(pals[r[0]], r[1], x, y)); }
  // outline pass: darken opaque pixels next to transparent ones
  const o = new Uint8Array(300 * 150); for (let y = 0; y < 150; y++) for (let x = 0; x < 300; x++) if (cv.alpha(x, y)) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < 300 && Y < 150 && !cv.alpha(X, Y)) o[y * 300 + x] = 1; }
  for (let i = 0; i < o.length; i++) if (o[i]) cv.set(i % 300, i / 300 | 0, hex('#040208'), .85);
  return cv;
}

function lamp(kind) { const cv = new C(14, 12);
  if (kind === 'beam') { for (let y = 0; y < 12; y++) for (let x = 0; x < 14; x++) { const inD = (x - 5) ** 2 / 16 + (y - 5.5) ** 2 / 25 < 1 && x <= 6; const ray = x >= 8 && x <= 12 && (y === 2 || y === 4 || y === 7 || y === 9) && x % 2 === 0 || (x >= 8 && x <= 12 && [2, 4, 7, 9].includes(y)); if (inD || ray) cv.set(x, y, ramp(R(['#1050c0', '#3088ff', '#90c8ff', '#e0f0ff']), inD ? 1 - Math.hypot(x - 3, y - 4) / 6 : .6, x, y)); } return cv; }
  const dir = kind === 'blink_l' ? -1 : 1, G = R(['#108020', '#30d040', '#80ff80', '#e0ffe0']);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 14; x++) { const X = dir < 0 ? 13 - x : x; if ((Math.abs(y - 5.5) < 2 && X >= 2 && X <= 8) || (X >= 8 && X <= 12 && Math.abs(y - 5.5) <= 12 - X)) cv.set(x, y, ramp(G, .9 - Math.abs(y - 5.5) / 7 - (X > 11 ? .3 : 0), x, y)); }
  return cv; }

// ---------- pack ----------
const sheet = new C(640, 360 * 2 + 300), frames = {};
const put = (name, cv, x, y, ax = 0, ay = 0) => { sheet.blit(cv, x, y); frames[name] = { x, y, w: cv.w, h: cv.h, ax, ay }; };
put('dash_night', dash('night'), 0, 0); put('dash_day', dash('day'), 0, 360);
put('wheel', wheel(0), 0, 720, 150, 150); put('wheel_l', wheel(-12), 300, 720, 150, 150); put('wheel_r', wheel(12), 0, 870, 150, 150);
put('blink_l', lamp('blink_l'), 310, 880); put('blink_r', lamp('blink_r'), 330, 880); put('beam', lamp('beam'), 350, 880);
// self-check: windscreen centre must be transparent, dash must be opaque
for (const f of ['dash_night', 'dash_day']) { const o = frames[f].y; if (sheet.alpha(320, o + 120) !== 0 || sheet.alpha(320, o + 300) !== 255) throw new Error('alpha check failed ' + f); }
mkdirSync(ART, { recursive: true });
const buf = png(sheet); writeFileSync(join(ART, 'cockpit.png'), buf);
writeFileSync(join(ART, 'cockpit.json'), JSON.stringify({ image: 'cockpit.png', frames, anims: {}, points: POINTS }, null, 1));
console.log('cockpit.png', buf.length, 'bytes');
