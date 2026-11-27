// Makes every sheet in ../art (PNG + JSON + index.json). Run: node tools/make-art.js
// Procedural, original pixel art: iso tiles 32x16, buildings, props, beings. No dependencies.
"use strict";
const fs = require("fs"), zlib = require("zlib"), path = require("path");
const OUT = path.join(__dirname, "..", "art");

// ---------- tiny PNG writer ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- seeded noise ----------
let S = 12345; const rnd = () => ((S = (S * 1664525 + 1013904223) >>> 0) / 4294967296);
const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 1442695041) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
const sh = (c, k) => [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

// ---------- a sheet: cells on a grid ----------
class Sheet {
  constructor(name, cw, ch, cols) { this.name = name; this.cw = cw; this.ch = ch; this.cols = cols; this.cells = []; this.frames = {}; this.anims = {}; }
  add(fname, ax, ay, draw) {
    const i = this.cells.length, buf = new Float32Array(this.cw * this.ch * 4);
    const set = (x, y, c, a = 255) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.cw || y >= this.ch) return; const o = (y * this.cw + x) * 4; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = a; };
    const get = (x, y) => { const o = (y * this.cw + x) * 4; return buf[o + 3] ? [buf[o], buf[o + 1], buf[o + 2]] : null; };
    draw(set, get);
    this.cells.push(buf);
    this.frames[fname] = { x: (i % this.cols) * this.cw, y: Math.floor(i / this.cols) * this.ch, w: this.cw, h: this.ch, ax, ay };
  }
  anim(n, frames, fps) { this.anims[n] = { frames, fps }; }
  save() {
    const rows = Math.ceil(this.cells.length / this.cols), W = this.cols * this.cw, H = rows * this.ch, px = Buffer.alloc(W * H * 4);
    this.cells.forEach((b, i) => { const ox = (i % this.cols) * this.cw, oy = Math.floor(i / this.cols) * this.ch;
      for (let y = 0; y < this.ch; y++) for (let x = 0; x < this.cw; x++) { const s = (y * this.cw + x) * 4, d = ((oy + y) * W + ox + x) * 4; for (let k = 0; k < 4; k++) px[d + k] = cl(b[s + k]); } });
    fs.writeFileSync(path.join(OUT, this.name + ".png"), png(W, H, px));
    fs.writeFileSync(path.join(OUT, this.name + ".json"), JSON.stringify({ image: this.name + ".png", frames: this.frames, anims: this.anims }));
  }
}
function tri(set, a, b, c, col) { // col(x,y) -> rgb or null
  const minx = Math.floor(Math.min(a[0], b[0], c[0])), maxx = Math.ceil(Math.max(a[0], b[0], c[0])), miny = Math.floor(Math.min(a[1], b[1], c[1])), maxy = Math.ceil(Math.max(a[1], b[1], c[1]));
  const e = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const ar = e(a, b, c[0], c[1]);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) { const px = x + 0.5, py = y + 0.5;
    const w0 = e(b, c, px, py) / ar, w1 = e(c, a, px, py) / ar, w2 = e(a, b, px, py) / ar;
    if (w0 >= -0.01 && w1 >= -0.01 && w2 >= -0.01) { const k = col(x, y); if (k) set(x, y, k); } }
}
const quad = (set, a, b, c, d, col) => { tri(set, a, b, c, col); tri(set, a, c, d, col); };
const inDiamond = (x, y, cx, cy, hw, hh) => Math.abs(x + 0.5 - cx) / hw + Math.abs(y + 0.5 - cy) / hh <= 1;

// ---------- materials ----------
const M = {
  grass: (x, y, k) => { const n = hash(x, y, k), g = [74, 122, 52]; let c = mix(g, [104, 150, 60], hash(x >> 2, y >> 1, k + 9)); if (n > 0.86) c = [130, 170, 70]; if (n < 0.1) c = [52, 92, 40]; if (n > 0.97) c = [210, 200, 120]; return c; },
  dirt: (x, y, k) => { const n = hash(x, y, k); let c = mix([122, 92, 58], [150, 116, 74], hash(x >> 1, y, k + 3)); if (n > 0.9) c = [96, 72, 46]; if (n < 0.05) c = [170, 150, 120]; return c; },
  road: (x, y, k) => { const bx = ((x + (y & 2 ? 2 : 0)) >> 2), by = y >> 1, e = (x + (y & 2 ? 2 : 0)) % 4 == 0 || y % 2 == 0; const b = mix([128, 116, 100], [160, 148, 128], hash(bx, by, k)); return e ? sh(b, 0.7) : sh(b, 0.95 + hash(x, y, k) * 0.12); },
  asphalt: (x, y, k) => { const n = hash(x, y, k); let c = mix([70, 72, 76], [88, 90, 92], hash(x >> 1, y, k)); if (Math.abs(((x * 0.6 + y * 1.3 + k * 7) % 11)) < 0.7 && hash(x >> 2, y >> 2, k) > 0.4) c = [40, 40, 44]; if (n > 0.9) c = M.grass(x, y, k); if (y == 7 && x % 8 < 3 && k % 2 == 0) c = [180, 170, 110]; return c; },
  water: (x, y, k) => { const w = Math.sin((x * 0.7 + y * 1.6 + k * 2.1)) + Math.sin(x * 0.23 - y * 0.9 + k * 1.3); let c = mix([36, 78, 118], [52, 104, 146], (w + 2) / 4); if (w > 1.5) c = [130, 180, 210]; return c; },
  sand: (x, y, k) => mix([196, 176, 126], [220, 204, 150], hash(x, y, k)),
  plaster: (u, v, k) => mix([214, 200, 172], [232, 222, 196], hash(u, v, k)),
  beam: [74, 50, 32],
  stone: (u, v, k) => { const row = Math.floor(v / 3), off = row % 2 ? 2 : 0, bx = Math.floor((u + off) / 5); const edge = v % 3 == 0 || (u + off) % 5 == 0; const b = mix([118, 112, 104], [152, 146, 132], hash(bx, row, k)); return edge ? sh(b, 0.66) : sh(b, 0.92 + hash(u, v, k) * 0.14); },
  brick: (u, v, k) => { const row = Math.floor(v / 2), off = row % 2 ? 2 : 0, edge = v % 2 == 0 || (u + off) % 4 == 0; const b = mix([140, 62, 44], [170, 84, 56], hash(Math.floor((u + off) / 4), row, k)); return edge ? [104, 92, 84] : b; },
  concrete: (u, v, k) => { let c = mix([128, 128, 124], [150, 148, 140], hash(u >> 1, v >> 2, k)); if (hash(u, v, k) > 0.93) c = [96, 96, 94]; if (hash(u, v >> 2, k + 1) > 0.8 && v > 0) c = sh(c, 0.85); return c; },
  arcane: (u, v, k) => { const row = Math.floor(v / 4), off = row % 2 ? 3 : 0, edge = v % 4 == 0 || (u + off) % 6 == 0; const b = mix([70, 66, 108], [96, 90, 140], hash(Math.floor((u + off) / 6), row, k)); return edge ? sh(b, 0.6) : b; },
  glass: (u, v, k) => { const f = v % 6 == 0 || u % 4 == 0; const b = mix([70, 120, 150], [150, 200, 220], Math.max(0, Math.sin((u - v) * 0.25)) ** 4); return f ? [200, 206, 210] : b; },
  thatch: (u, v, k) => { const n = hash(u, v >> 1, k); let c = mix([170, 132, 60], [214, 176, 92], hash(u, v >> 2, k + 4)); if (n > 0.8) c = [120, 90, 40]; if (v % 4 == 0 && n > 0.5) c = sh(c, 0.8); return c; },
  shingle: (u, v, k, base) => { const row = Math.floor(v / 2), off = row % 2 ? 2 : 0, edge = v % 2 == 0 || (u + off) % 4 == 0; const b = mix(base, sh(base, 1.25), hash(Math.floor((u + off) / 4), row, k)); return edge ? sh(base, 0.6) : b; },
};
const RED = [150, 64, 46], SLATE = [74, 82, 96], GREEN = [70, 120, 70], VIOLET = [120, 80, 170];

// ---------- terrain ----------
function tiles() {
  const s = new Sheet("terrain", 32, 16, 8);
  const T = (name, fn, k) => s.add(name, 16, 8, (set) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) if (inDiamond(x, y, 16, 8, 16.6, 8.3)) { let c = fn(x, y, k); if (!inDiamond(x, y, 16, 8, 15, 7.5) && y > 8) c = sh(c, 0.96); set(x, y, c); } });
  for (let k = 0; k < 4; k++) T("grass" + k, M.grass, k + 1);
  for (let k = 0; k < 2; k++) T("dirt" + k, M.dirt, k + 7);
  for (let k = 0; k < 2; k++) T("road" + k, M.road, k + 11);
  for (let k = 0; k < 3; k++) T("asph" + k, M.asphalt, k + 20);
  T("sand", M.sand, 3);
  for (let k = 0; k < 4; k++) T("water" + k, M.water, k * 1.57);
  const crop = (base, hi) => (x, y, k) => { const r = (x + y * 2) % 4; return r == 0 ? sh(M.dirt(x, y, k), 0.75) : mix(base, hi, hash(x, y, k)); };
  T("wheat", crop([196, 160, 64], [230, 200, 100]), 31);
  T("cabbage", crop([70, 130, 60], [120, 170, 80]), 32);
  T("flowers", (x, y, k) => { const n = hash(x, y, k); return n > 0.85 ? [[220, 80, 90], [240, 220, 100], [160, 120, 220]][Math.floor(hash(y, x, k) * 3)] : M.grass(x, y, k); }, 33);
  T("plaza", (x, y, k) => { const e = (x + y * 2) % 6 == 0 || (x - y * 2 + 64) % 6 == 0; return e ? [110, 104, 96] : mix([176, 168, 150], [196, 188, 170], hash(x, y, k)); }, 34);
  T("snow", (x, y, k) => mix([220, 226, 236], [246, 248, 252], hash(x, y, k)), 35);
  s.anim("water", ["water0", "water1", "water2", "water3"], 3);
  s.save(); return s;
}

// ---------- buildings: iso boxes with textured walls and roofs ----------
function building(s, name, o, lit) {
  s.add(name, 32, 92, (set, get) => {
    const cx = 32, by = 92 - 4, hw = o.hw, hh = hw / 2, H = o.H;
    const L = [cx - hw, by - hh], B = [cx, by], R = [cx + hw, by - hh], Tp = [cx, by - 2 * hh];
    const up = (p, d) => [p[0], p[1] - d];
    const wall = (side) => (x, y) => {
      const u = side ? x - cx : cx - x, v = Math.round(by - u / 2 - y);
      if (o.broken && v > H - 1 - Math.floor(hash(u >> 1, 3, o.k) * o.broken)) return null;
      let c = M[o.wall](u, v, o.k + side);
      if (o.wall == "plaster" && (u % 6 == 0 || v % 6 == 0 || v == 1)) c = M.beam;
      const win = o.win && u > 1 && u < hw * 2 - 1 && v > 2 && v < H - 2 && (u % o.win[0] >= 1 && u % o.win[0] <= 2) && (v % o.win[1] >= 2 && v % o.win[1] <= 4);
      if (win) { if (o.broken) c = hash(u, v, o.k) > 0.3 ? [24, 24, 28] : [70, 110, 160]; else c = lit && hash(u >> 2, v >> 3, o.k + side) > 0.3 ? (o.litc || [255, 196, 96]) : [40, 44, 56]; }
      if (o.door && !side && u >= hw - 2 && u <= hw && v < 6) c = lit ? [255, 170, 80] : [60, 40, 26];
      if (o.vines && hash(u >> 1, v >> 2, o.k + 5) > 0.8 + v / 300) c = mix([56, 100, 44], [90, 140, 60], hash(u, v, 9));
      const k = (side ? 0.72 : 0.95) * (0.86 + 0.14 * Math.min(1, v / 6)); // darker near the ground (ambient occlusion)
      return sh(c, k);
    };
    quad(set, L, B, up(B, H), up(L, H), wall(0));
    quad(set, B, R, up(R, H), up(B, H), wall(1));
    const oh = o.roof == "flat" || o.roof == "garden" || !o.roof ? 0 : 2; // overhang
    const tL = [L[0] - oh, L[1] - H + oh / 2], tB = [B[0], B[1] - H + oh], tR = [R[0] + oh, R[1] - H + oh / 2], tT = [Tp[0], Tp[1] - H - oh];
    const rmat = (side) => (x, y) => { const u = x - cx + 40, v = y; let c;
      if (o.roof == "thatch") c = M.thatch(u, v, o.k); else if (o.roof == "crystal") c = mix(VIOLET, [200, 170, 255], hash(u >> 1, v >> 1, o.k) * 0.6 + (side ? 0 : 0.3)); else if (o.roof == "dome") c = mix([120, 180, 200], [220, 240, 250], Math.max(0, Math.sin((u + v) * 0.3))); else c = M.shingle(u, v, o.k, o.rc || RED);
      return sh(c, side ? 0.78 : 1.02); };
    if (!o.roof || o.broken) { quad(set, up(L, H), up(B, H), up(R, H), up(Tp, H), (x, y) => o.broken ? null : sh(M.concrete(x, y, o.k), 1.1)); }
    else if (o.roof == "flat" || o.roof == "garden") { quad(set, tL, tB, tR, tT, (x, y) => o.roof == "garden" ? (hash(x, y, o.k) > 0.5 ? [80, 140, 70] : [60, 110, 56]) : [x % 3 ? 150 : 130, 150, 156]);
      if (o.roof == "garden") for (let i = 0; i < 6; i++) { const px = cx - 6 + hash(i, 1, o.k) * 12, py = Tp[1] - H + hh + (hash(i, 2, o.k) - 0.5) * hh; for (let a = 0; a < 7; a++) set(px + (a % 3) - 1, py - (a / 3 | 0), a < 3 ? [50, 100, 50] : [90, 160, 80]); } }
    else if (o.roof == "dome") { const r = hw, ccy = by - hh - H; for (let y = ccy - r; y <= ccy + 2; y++) for (let x = cx - r; x <= cx + r; x++) { const dx = (x - cx) / r, dy = (y - ccy) / (r * 0.9); if (dx * dx + dy * dy <= 1 && y <= ccy + hh * Math.sqrt(Math.max(0, 1 - dx * dx))) { const l = 0.6 + 0.5 * (-dx * 0.6 - dy * 0.8); let c = mix([60, 110, 140], [210, 240, 250], Math.max(0, Math.min(1, l))); if ((x + y) % 5 == 0 || (x - y + 99) % 5 == 0) c = sh(c, lit ? 1.4 : 0.8); if (lit && hash(x >> 1, y >> 1, 3) > 0.7) c = [255, 220, 140]; set(x, y, c); } } }
    else { const ap = [cx, by - hh - H - o.R];
      tri(set, tL, tT, ap, rmat(1)); tri(set, tT, tR, ap, rmat(0)); tri(set, tL, tB, ap, rmat(0)); tri(set, tB, tR, ap, rmat(1));
      for (let i = 0; i <= 8; i++) { set(tL[0] + (tB[0] - tL[0]) * i / 8, tL[1] + (tB[1] - tL[1]) * i / 8 + 1, [40, 30, 24]); set(tB[0] + (tR[0] - tB[0]) * i / 8, tB[1] + (tR[1] - tB[1]) * i / 8 + 1, [40, 30, 24]); } }
    if (o.chimney) { const x0 = cx + hw / 2, top = by - hh - H - (o.R || 0) - o.chimney; for (let y = top; y < by - hh - H + 2; y++) for (let x = x0; x < x0 + 4; x++) set(x, y, sh(M.brick(x, y, 3), x == x0 ? 1 : 0.75)); }
    if (o.spire) { for (let y = 0; y < o.spire; y++) for (let x = -1; x <= 1; x++) set(cx + x, by - hh - H - o.R - y, lit && y % 4 == 0 ? [200, 160, 255] : [150, 120, 210]); }
    if (o.wheel) for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283, r = 7; set(cx - hw - 1 + Math.cos(t) * 2, by - 8 + Math.sin(t) * r, [90, 64, 40]); if (a % 5 == 0) for (let q = 0; q < r; q++) set(cx - hw - 1 + Math.cos(t) * q * 0.3, by - 8 + Math.sin(t) * q, [110, 80, 50]); }
    // contact shadow outline
    for (let x = 0; x < 64; x++) for (let y = 1; y < 92; y++) if (!get(x, y) && get(x, y - 1) && y > 40) {} // (kept simple)
  });
}
function buildings() {
  const s = new Sheet("buildings", 64, 92, 8);
  const defs = {
    ruin0: { hw: 14, H: 46, wall: "concrete", win: [5, 7], broken: 14, vines: 1, k: 1 },
    ruin1: { hw: 12, H: 34, wall: "concrete", win: [4, 6], broken: 10, vines: 1, k: 2 },
    ruin2: { hw: 14, H: 20, wall: "concrete", win: [6, 8], broken: 12, vines: 1, k: 3 },
    ruin3: { hw: 10, H: 60, wall: "glass", win: 0, broken: 26, vines: 1, k: 4 },
    hut0: { hw: 9, H: 6, R: 11, wall: "plaster", roof: "thatch", door: 1, win: [7, 9], k: 5 },
    hut1: { hw: 10, H: 7, R: 12, wall: "stone", roof: "thatch", door: 1, win: [8, 9], chimney: 3, k: 6 },
    house0: { hw: 13, H: 12, R: 10, wall: "plaster", roof: "thatch", door: 1, win: [6, 10], k: 7 },
    house1: { hw: 13, H: 13, R: 9, wall: "plaster", roof: "shingle", rc: RED, door: 1, win: [6, 10], chimney: 4, k: 8 },
    house2: { hw: 12, H: 11, R: 9, wall: "stone", roof: "shingle", rc: SLATE, door: 1, win: [6, 10], k: 9 },
    temple: { hw: 14, H: 20, R: 18, wall: "stone", roof: "shingle", rc: SLATE, door: 1, win: [7, 12], spire: 10, k: 10 },
    mill: { hw: 9, H: 16, R: 10, wall: "stone", roof: "thatch", door: 1, win: [6, 12], wheel: 1, k: 11 },
    row0: { hw: 13, H: 22, R: 5, wall: "brick", roof: "shingle", rc: SLATE, door: 1, win: [4, 7], chimney: 6, k: 12 },
    factory: { hw: 15, H: 16, R: 6, wall: "brick", roof: "shingle", rc: [90, 90, 96], door: 1, win: [5, 8], chimney: 18, k: 13 },
    arc0: { hw: 12, H: 18, R: 14, wall: "arcane", roof: "crystal", door: 1, win: [5, 8], litc: [190, 140, 255], k: 14 },
    arc1: { hw: 10, H: 28, R: 18, wall: "arcane", roof: "crystal", door: 1, win: [5, 8], litc: [140, 220, 255], spire: 8, k: 15 },
    tower0: { hw: 13, H: 52, wall: "glass", roof: "garden", win: 0, k: 16 },
    tower1: { hw: 11, H: 40, wall: "concrete", roof: "garden", win: [3, 5], litc: [200, 240, 255], k: 17 },
    dome: { hw: 13, H: 4, wall: "concrete", roof: "dome", win: 0, k: 18 },
  };
  for (const [n, o] of Object.entries(defs)) { building(s, n, o, false); building(s, n + "_lit", o, true); }
  s.save(); return s;
}

// ---------- props: trees, stalls, wells, ruined cars ----------
function blob(set, cx, cy, r, base, k, light = [-0.6, -0.8]) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = (x * x + y * y) / (r * r); if (d > 1 - hash(x, y, k) * 0.25) continue;
    const l = 0.55 + 0.6 * (x * light[0] + y * light[1]) / r + (hash(x >> 1, y >> 1, k) - 0.5) * 0.35; const t = l + dith(x, y) * 0.25;
    const c = t > 1.05 ? sh(base, 1.45) : t > 0.75 ? sh(base, 1.15) : t > 0.45 ? base : t > 0.2 ? sh(base, 0.75) : sh(base, 0.55); set(cx + x, cy + y, c); }
}
function props() {
  const s = new Sheet("props", 32, 48, 8);
  const trunk = (set, x, y0, y1) => { for (let y = y0; y < y1; y++) { set(x, y, [92, 64, 40]); set(x + 1, y, [64, 44, 28]); } };
  const oak = (n, base, k) => s.add(n, 16, 45, (set) => { trunk(set, 15, 28, 45); for (let i = 0; i < 6; i++) blob(set, 16 + (hash(i, 1, k) - 0.5) * 14, 22 + (hash(i, 2, k) - 0.5) * 12 - i, 6 + Math.floor(hash(i, 3, k) * 4), base, k + i); });
  oak("oak0", [62, 112, 48], 1); oak("oak1", [76, 120, 44], 2); oak("oak2", [54, 100, 56], 3); oak("oak3", [90, 128, 50], 4);
  oak("autumn0", [196, 110, 40], 5); oak("autumn1", [176, 70, 40], 6); oak("autumn2", [210, 160, 50], 7);
  const pine = (n, base, k, h) => s.add(n, 16, 45, (set) => { trunk(set, 15, 38, 45); for (let y = 0; y < h; y++) { const w = (y % 7) * 0.9 + y * 0.22 + 1; for (let x = -w; x <= w; x++) { const l = 0.5 - x / w * 0.4 + (hash(x | 0, y, k) - 0.5) * 0.4; set(16 + x, 44 - h - 2 + y, l > 0.7 ? sh(base, 1.3) : l > 0.35 ? base : sh(base, 0.65)); } } });
  pine("pine0", [40, 86, 60], 8, 34); pine("pine1", [46, 94, 56], 9, 28); pine("pine2", [36, 78, 66], 10, 38);
  s.add("bush", 16, 45, (set) => { blob(set, 12, 40, 5, [70, 120, 50], 11); blob(set, 20, 41, 4, [60, 110, 50], 12); for (let i = 0; i < 4; i++) set(10 + i * 3, 38 + (i % 2), [220, 90, 100]); });
  s.add("rock", 16, 45, (set) => blob(set, 16, 41, 5, [120, 116, 110], 13));
  s.add("well", 16, 45, (set) => { for (let a = 0; a < 64; a++) { const t = a / 64 * 6.283; for (let r = 4; r < 7; r++) set(16 + Math.cos(t) * r, 40 + Math.sin(t) * r * 0.5, M.stone(a, r, 2)); } for (let y = 26; y < 40; y++) { set(10, y, [90, 64, 40]); set(22, y, [90, 64, 40]); } for (let x = 8; x <= 24; x++) { set(x, 26 - (8 - Math.abs(x - 16)) * 0.4, [150, 64, 46]); set(x, 27 - (8 - Math.abs(x - 16)) * 0.4, [110, 48, 36]); } for (let x = 14; x < 19; x++) set(x, 40, [30, 60, 90]); });
  const stall = (n, c1, c2) => s.add(n, 16, 45, (set) => { for (let y = 32; y < 44; y++) { set(6, y, [90, 64, 40]); set(26, y, [90, 64, 40]); } for (let x = 6; x <= 26; x++) for (let y = 37; y < 41; y++) set(x, y, y == 37 ? [150, 110, 70] : [110, 80, 50]); for (let x = 4; x <= 28; x++) for (let y = 0; y < 6; y++) set(x, 28 + y - (x - 4) * 0.12, ((x >> 2) % 2 ? c1 : c2).map((v) => v * (1 - y * 0.06))); for (let i = 0; i < 6; i++) blob(set, 9 + i * 3, 35, 1, [[220, 80, 60], [240, 200, 80], [120, 180, 70]][i % 3], i); });
  stall("stall0", [200, 60, 50], [236, 226, 210]); stall("stall1", [60, 120, 190], [236, 226, 210]); stall("stall2", [80, 150, 80], [240, 220, 120]);
  s.add("hay", 16, 45, (set) => blob(set, 16, 40, 6, [210, 176, 80], 14));
  s.add("fence", 16, 45, (set) => { for (let x = 0; x < 32; x++) { const y = 44 - x / 2; set(x, y - 4, [140, 104, 64]); set(x, y - 7, [120, 88, 56]); if (x % 6 == 0) for (let q = 0; q < 9; q++) set(x, y - q, [100, 72, 44]); } });
  const car = (n, base, k) => s.add(n, 16, 45, (set) => { const rust = (x, y) => hash(x, y, k) > 0.6 ? mix([130, 70, 40], [170, 96, 50], hash(y, x, k)) : base;
    quad(set, [4, 38], [18, 45], [28, 40], [14, 33], (x, y) => sh(rust(x, y), 1.1)); quad(set, [4, 38], [18, 45], [18, 48], [4, 41], (x, y) => sh(rust(x, y), 0.8)); quad(set, [18, 45], [28, 40], [28, 43], [18, 48], (x, y) => sh(rust(x, y), 0.6));
    quad(set, [9, 36], [18, 40.5], [22, 37], [13, 33], (x, y) => [40, 50, 60]); if (k % 2) blob(set, 12, 34, 4, [70, 120, 50], k + 3); });
  car("wreck0", [110, 120, 130], 21); car("wreck1", [140, 60, 50], 22);
  s.add("lamp", 16, 45, (set) => { for (let y = 22; y < 45; y++) set(16, y, [50, 50, 56]); for (let x = 14; x < 19; x++) set(x, 22, [50, 50, 56]); set(15, 23, [255, 220, 140]); set(16, 23, [255, 240, 180]); set(17, 23, [255, 220, 140]); });
  s.add("solar", 16, 45, (set) => { for (let y = 36; y < 45; y++) set(16, y, [80, 80, 86]); quad(set, [4, 34], [16, 40], [28, 34], [16, 28], (x, y) => (x + y) % 3 == 0 ? [140, 170, 200] : [30, 50, 100]); });
  s.add("monolith", 16, 45, (set) => { quad(set, [12, 44], [16, 46], [16, 18], [12, 16], (x, y) => [40, 40, 52]); quad(set, [16, 46], [20, 44], [20, 16], [16, 18], (x, y) => (y % 5 == 0 ? [120, 220, 255] : [26, 26, 36])); });
  for (let k = 0; k < 2; k++) s.add("grave" + k, 16, 45, (set) => { for (const [gx, gy] of [[9, 38], [21, 36], [15, 43]]) { const w = 4, h = 6 + k; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (y == 0 && (x == 0 || x == w - 1) && !k) continue; set(gx + x, gy - h + y, sh(M.stone(x, y, gx + k), x == 0 ? 1.15 : x == w - 1 ? 0.7 : 1)); } for (let x = -1; x <= w; x++) set(gx + x, gy, [70, 60, 40]); if (k) { set(gx + 1, gy - h - 2, [130, 126, 120]); set(gx + 1, gy - h - 1, [130, 126, 120]); set(gx, gy - h - 1, [130, 126, 120]); set(gx + 2, gy - h - 1, [130, 126, 120]); } } blob(set, 16, 44, 1, [220, 90, 100], 3); });
  s.save(); return s;
}

// ---------- beings: tiny, cute, many palettes ----------
function beings() {
  const s = new Sheet("beings", 12, 16, 16);
  const SKIN = [[250, 214, 180], [222, 170, 130], [170, 116, 80], [110, 72, 50], [236, 196, 150]];
  const HAIR = [[40, 30, 24], [120, 70, 30], [220, 190, 110], [180, 60, 30], [200, 200, 200], [30, 30, 40]];
  const CLOTH = [[150, 50, 50], [50, 90, 150], [70, 120, 60], [170, 140, 70], [110, 70, 130], [190, 190, 180], [60, 60, 70], [200, 110, 50]];
  S = 777; const people = [];
  for (let i = 0; i < 24; i++) {
    const sk = SKIN[i % 5], hr = HAIR[Math.floor(rnd() * 6)], cl1 = CLOTH[Math.floor(rnd() * 8)], cl2 = CLOTH[Math.floor(rnd() * 8)], hat = rnd() < 0.35 ? Math.floor(rnd() * 3) : -1, tall = rnd() < 0.5 ? 1 : 0, robe = rnd() < 0.3, beard = rnd() < 0.2, pack = rnd() < 0.25;
    for (let f = 0; f < 2; f++) s.add("p" + i + "_" + f, 6, 15, (set) => {
      const top = 3 - tall;
      for (let y = top + 4; y < 12; y++) for (let x = 4; x < 8; x++) set(x, y, sh(cl1, x == 4 ? 1.15 : x == 7 ? 0.75 : 1));
      if (robe) for (let x = 3; x < 9; x++) for (let y = 10; y < 14; y++) set(x, y, sh(cl1, x < 5 ? 1.1 : 0.8));
      else { set(4 + (f ? 0 : 1), 12, sh(cl2, 0.8)); set(4 + (f ? 0 : 1), 13, [40, 30, 24]); set(6 + (f ? 1 : 0), 12, sh(cl2, 0.8)); set(6 + (f ? 1 : 0), 13, [40, 30, 24]); for (let x = 4; x < 8; x++) set(x, 11, cl2); }
      set(3, top + 5 + f, sk); set(8, top + 6 - f, sk);
      for (let y = top; y < top + 4; y++) for (let x = 4; x < 8; x++) set(x, y, sh(sk, x == 7 ? 0.82 : 1));
      set(5, top + 2, [30, 24, 20]); set(7, top + 2, [30, 24, 20]);
      for (let x = 4; x < 8; x++) set(x, top, hr); set(4, top + 1, hr); set(8, top + 1, hr); set(8, top + 2, hr);
      if (beard) { set(5, top + 3, hr); set(6, top + 3, hr); set(6, top + 4, hr); }
      if (hat == 0) for (let x = 3; x < 9; x++) { set(x, top, [110, 80, 50]); if (x > 3 && x < 8) set(x, top - 1, [130, 96, 60]); }
      if (hat == 1) { set(5, top - 2, cl2); for (let x = 4; x < 8; x++) set(x, top - 1, cl2); for (let x = 3; x < 9; x++) set(x, top, sh(cl2, 0.8)); }
      if (hat == 2) for (let y = top - 1; y < top + 5; y++) { set(3, y, cl1); set(8, y, sh(cl1, 0.7)); if (y < top + 1) for (let x = 4; x < 8; x++) set(x, y, cl1); }
      if (pack) for (let y = top + 5; y < top + 9; y++) { set(2, y, [120, 86, 50]); }
    });
    people.push("p" + i);
    s.anim("p" + i, ["p" + i + "_0", "p" + i + "_1"], 4);
  }
  const quad4 = (n, body, legs, opts = {}) => { for (let f = 0; f < 2; f++) s.add(n + "_" + f, 6, 14, (set) => {
    const y0 = opts.y0 || 8; for (let y = y0; y < y0 + (opts.h || 4); y++) for (let x = 1; x < (opts.w || 10); x++) { const t = (y - y0) / (opts.h || 4); set(x, y, opts.wool ? (hash(x, y, f) > 0.4 ? [238, 234, 222] : [200, 196, 188]) : sh(body, 1.15 - t * 0.4)); }
    const hx = opts.w || 10; for (let y = y0 - 2; y < y0 + 2; y++) for (let x = hx - 1; x < hx + 2; x++) set(x, y, sh(opts.head || body, 0.9)); set(hx + 1, y0 - 1, [20, 20, 20]);
    if (opts.ears) { set(hx - 1, y0 - 3, body); set(hx + 1, y0 - 3, body); }
    if (opts.tail) set(0, y0 - 1 + f, body);
    const ly = y0 + (opts.h || 4); for (const lx of [2, 4, (opts.w || 10) - 3, (opts.w || 10) - 1]) { set(lx + ((lx + f) % 2), ly, legs); set(lx + ((lx + f) % 2), ly + 1, legs); }
  }); s.anim(n, [n + "_0", n + "_1"], 4); };
  quad4("sheep", null, [50, 40, 40], { wool: 1, head: [60, 50, 50] });
  quad4("cow", [120, 80, 50], [70, 50, 30], { w: 11, h: 5, y0: 7 });
  quad4("dog", [150, 100, 60], [100, 70, 40], { w: 7, h: 2, y0: 10, ears: 1, tail: 1 });
  quad4("cat", [70, 70, 76], [50, 50, 56], { w: 6, h: 2, y0: 10, ears: 1, tail: 1 });
  quad4("wolf", [110, 110, 120], [70, 70, 80], { w: 9, h: 3, y0: 8, ears: 1, tail: 1 });
  quad4("horse", [100, 64, 40], [60, 40, 26], { w: 10, h: 4, y0: 6 });
  quad4("deer", [160, 110, 66], [110, 76, 46], { w: 9, h: 3, y0: 7, ears: 1 });
  for (let f = 0; f < 2; f++) s.add("bird_" + f, 6, 8, (set) => { set(5, 6, [40, 40, 50]); set(6, 6, [40, 40, 50]); for (let i = 1; i < 4; i++) { set(5 - i, 6 - (f ? i % 2 : 1 - i % 2) * 1, [50, 50, 60]); set(6 + i, 6 - (f ? i % 2 : 1 - i % 2), [50, 50, 60]); } });
  s.anim("bird", ["bird_0", "bird_1"], 6);
  // a cart and a little car (both 12x16 cells, side view-ish iso)
  s.add("cart_0", 6, 14, (set) => { for (let x = 0; x < 11; x++) for (let y = 6; y < 10; y++) set(x, y, M.thatch(x, y, 2)); for (let x = 0; x < 12; x++) set(x, 10, [90, 64, 40]); blob(set, 3, 12, 2, [70, 50, 30], 1); blob(set, 9, 12, 2, [70, 50, 30], 2); });
  s.add("car_0", 6, 14, (set) => { for (let x = 0; x < 12; x++) for (let y = 8; y < 12; y++) set(x, y, y == 8 ? [240, 240, 250] : [220, 90, 70]); for (let x = 3; x < 9; x++) for (let y = 5; y < 8; y++) set(x, y, x == 3 || x == 8 ? [220, 90, 70] : [120, 180, 220]); set(2, 12, [20, 20, 20]); set(9, 12, [20, 20, 20]); set(11, 9, [255, 240, 180]); });
  s.add("car_1", 6, 14, (set) => { for (let x = 0; x < 12; x++) for (let y = 8; y < 12; y++) set(x, y, y == 8 ? [240, 240, 250] : [60, 140, 180]); for (let x = 3; x < 9; x++) for (let y = 5; y < 8; y++) set(x, y, x == 3 || x == 8 ? [60, 140, 180] : [200, 230, 250]); set(2, 12, [20, 20, 20]); set(9, 12, [20, 20, 20]); set(11, 9, [255, 240, 180]); });
  s.add("glider_0", 6, 14, (set) => { for (let x = 0; x < 12; x++) set(x, 7 - Math.abs(x - 6) * 0.3, [230, 230, 240]); for (let x = 4; x < 8; x++) set(x, 8, [120, 220, 255]); });
  s.save(); return s;
}

fs.mkdirSync(OUT, { recursive: true });
const sheets = [tiles(), buildings(), props(), beings()].map((s) => s.name);
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ sheets: sheets.map((n) => ({ name: n, json: n + ".json" })) }, null, 1));
console.log("wrote", sheets.join(", "));
