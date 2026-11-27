// Draws the Dungeon Town room sheet procedurally: art/rooms.png + art/rooms.json. No deps.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ART = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'art');
const FW = 96, FH = 56, COLS = 6;
const NAMES = ['tavern','forge','home','granary','vault','townhall','chapel','bakery','scaffold',
  'roof_a','roof_b','roof_c','street',
  'cellar','mine','fungus','fungus2','grotto','grotto2','crypt','crypt2','cells','hoard','shrine','dig',
  'rock1','rock2','rock3','rock4'];
const ROWS = Math.ceil(NAMES.length / COLS);
const W = FW * COLS, H = FH * ROWS;
const buf = new Uint8Array(W * H * 4);

// ---------- PNG ----------
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function png() {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(buf.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- drawing ----------
let OX = 0, OY = 0, R;
const mul = s => () => { s |= 0; s = s + 0x6d2b79f5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const vnoise = (x, y, sc, s) => { const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const sh = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function px(x, y, c, a = 255) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= FW || y >= FH) return; const i = ((OY + y) * W + OX + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = a; }
function get(x, y) { x = Math.max(0, Math.min(FW - 1, x | 0)); y = Math.max(0, Math.min(FH - 1, y | 0)); const i = ((OY + y) * W + OX + x) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; }
function rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); }
// rect with per-pixel noise shade
function nrect(x, y, w, h, c, amt = 0.12, s = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, sh(c, 1 - amt + 2 * amt * hash(x + i, y + j, s))); }
function darken(x, y, w, h, f) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, sh(get(x + i, y + j), f)); }
// shaded box: highlight top/left, shadow bottom/right
function box(x, y, w, h, c, s = 3) { nrect(x, y, w, h, c, 0.08, s); rect(x, y, w, 1, sh(c, 1.35)); rect(x, y, 1, h, sh(c, 1.15)); rect(x, y + h - 1, w, 1, sh(c, 0.55)); rect(x + w - 1, y, 1, h, sh(c, 0.65)); }
function circ(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c); }
function line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); }
function glow(cx, cy, r, c, k = 0.5) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.sqrt(x * x + y * y) / r; if (d < 1) { const t = (1 - d) * (1 - d) * k; if (hash(cx + x, cy + y, 77) < 0.85 || d < 0.5) px(cx + x, cy + y, mix(get(cx + x, cy + y), c, t)); } } }

// ---------- materials ----------
function bricks(x0, y0, w, h, base, bw = 8, bh = 4, s = 1, mortar) {
  const m = mortar || sh(base, 0.45);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / bh), off = (row % 2) * (bw >> 1) + (hash(row, 0, s) * 3 | 0);
    const bx = Math.floor((x - x0 + off) / bw), lx = (x - x0 + off) % bw, ly = (y - y0) % bh;
    if (lx === 0 || ly === 0) { px(x, y, sh(m, 0.9 + 0.25 * hash(x, y, s))); continue; }
    let f = 0.75 + 0.35 * hash(bx, row, s) + 0.18 * (vnoise(x, y, 3, s) - 0.5);
    if (ly === 1) f *= 1.18; if (ly === bh - 1) f *= 0.78; if (lx === bw - 1) f *= 0.85;
    if (hash(x, y, s + 9) < 0.05) f *= 0.6; // pits
    px(x, y, sh(base, f));
  }
}
function planks(x0, y0, w, h, base, s = 1, vertical = false, pw = 6) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const a = vertical ? x - x0 : y - y0, b = vertical ? y : x, k = Math.floor(a / pw), la = a % pw;
    let f = 0.8 + 0.3 * hash(k, 0, s) + 0.12 * (vnoise(vertical ? k * 9 : b, vertical ? b : k * 9, 4, s) - 0.5) + 0.08 * Math.sin(b * 0.9 + k * 3 + hash(k, 1, s) * 6) * 0.5;
    if (la === 0) f = 0.4; if (la === 1) f *= 1.15;
    const seam = Math.floor((b + hash(k, 2, s) * 40) / 26); if ((b + (hash(k, 2, s) * 40 | 0)) % 26 === 0) f = 0.45;
    if (hash(x, y, s) < 0.02) f *= 0.6;
    px(x, y, sh(base, f + seam * 0));
  }
}
function plaster(x0, y0, w, h, base, s) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { let f = 0.86 + 0.18 * vnoise(x, y, 5, s) + 0.1 * hash(x, y, s); if (vnoise(x, y, 9, s + 4) > 0.78) f *= 0.82; px(x, y, sh(base, f)); } }
function beam(x, y, w, h, s = 5) { const c = hex('#4a2f1c'); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let f = 0.75 + 0.3 * vnoise(w > h ? x + i : (x + i) * 6, w > h ? (y + j) * 6 : y + j, 3, s); if ((w > h ? j : i) === 0) f *= 1.3; if ((w > h ? j : i) === (w > h ? h : w) - 1) f *= 0.6; px(x + i, y + j, sh(c, f)); } }
function diag(x0, y0, x1, y1, t = 3) { const c = hex('#45291a'); for (let k = 0; k < t; k++) line(x0 + k, y0, x1 + k, y1, sh(c, k === 0 ? 1.25 : k === t - 1 ? 0.6 : 0.9)); }
function floorBand(kind = 'wood', s = 1) {
  if (kind === 'wood') { planks(0, 50, FW, 6, hex('#5e3d24'), s, false, 3); rect(0, 50, FW, 1, hex('#8a6440')); }
  else if (kind === 'stone') { bricks(0, 50, FW, 6, hex('#5a5550'), 12, 3, s); rect(0, 50, FW, 1, hex('#8a847a')); }
  else { rockFill(0, 50, FW, 6, hex(kind), s); for (let x = 0; x < FW; x++) px(x, 50, sh(get(x, 50), 1.4)); }
  for (let x = 0; x < FW; x++) px(x, 49, sh(get(x, 49), 0.6)); // contact shadow
}
function rockFill(x0, y0, w, h, base, s, seamless = false) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const nx = seamless ? x % FW : x;
    const n = vnoise(nx, y, 7, s) * 0.55 + vnoise(nx, y, 3, s + 1) * 0.3 + hash(nx, y, s) * 0.15;
    let f = 0.55 + n * 0.75;
    const cr = vnoise(nx, y, 5, s + 3); if (Math.abs(cr - 0.5) < 0.025) f *= 0.55; // cracks
    px(x, y, sh(base, f));
  }
}
// cave: rock everywhere, a hollow carved with noisy edges, floor flat at 50
function cave(base, s, opts = {}) {
  const rk = sh(base, 0.55);
  rockFill(0, 0, FW, FH, rk, s);
  const top = opts.top ?? 7, l = opts.l ?? 5, r = opts.r ?? 91;
  const hollow = (x, y) => {
    const e = (vnoise(x, y, 6, s + 5) - 0.5) * 9 + (hash(x, y, s) - 0.5) * 1.5;
    const tt = top + 6 * Math.pow(Math.abs(x - 48) / 48, 2) * 2 + e;
    return y > tt && x > l + e * 0.8 + (y < 20 ? 4 : 0) && x < r - e * 0.8 - (y < 20 ? 4 : 0) && y < 50;
  };
  const m = [];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) m[y * FW + x] = hollow(x, y);
  for (let y = 0; y < 50; y++) for (let x = 0; x < FW; x++) if (m[y * FW + x]) {
    const n = vnoise(x, y, 6, s + 7) * 0.6 + hash(x, y, s + 2) * 0.25;
    let f = 0.32 + n * 0.4;
    if (!m[(y - 1) * FW + x] || !m[y * FW + x - 1] || !m[y * FW + x + 1]) f = 0.85 + 0.3 * hash(x, y, 3); // lit lip
    else if (!m[(y - 2) * FW + x]) f *= 1.3;
    px(x, y, sh(base, f));
  }
  // rim shadow just outside the hollow
  for (let y = 1; y < 50; y++) for (let x = 1; x < FW - 1; x++) if (!m[y * FW + x] && (m[(y + 1) * FW + x] || m[y * FW + x + 1] || m[y * FW + x - 1])) px(x, y, sh(base, 0.25));
  floorBand(opts.floor || '#' + sh(base, 0.8).map(v => v.toString(16).padStart(2, '0')).join(''), s);
  return m;
}
function stalactites(m, n, c, s) { const rr = mul(s); for (let k = 0; k < n; k++) { const x = 6 + (rr() * 84 | 0); let y = 0; while (y < 49 && !m[y * FW + x]) y++; const L = 2 + (rr() * 7 | 0); for (let j = 0; j < L; j++) { const wd = Math.max(0, Math.round((1 - j / L) * 1.6)); for (let i = -wd; i <= wd; i++) px(x + i, y + j, sh(c, i < 0 ? 1.2 : i > 0 ? 0.7 : 0.95)); } } }

// ---------- props ----------
function torch(x, y) { rect(x - 1, y + 2, 3, 1, hex('#3a3a40')); rect(x, y + 1, 1, 5, hex('#5a3a22')); px(x - 1, y + 1, hex('#6a6a70')); px(x + 1, y + 1, hex('#6a6a70'));
  glow(x, y - 1, 7, hex('#ff9a30'), 0.55); px(x, y - 3, hex('#ffd060')); px(x - 1, y - 1, hex('#ff8020')); px(x + 1, y - 1, hex('#ff8020')); px(x, y - 2, hex('#fff0a0')); px(x, y - 1, hex('#ffe070')); px(x, y, hex('#ff6010')); }
function candle(x, y, h = 3) { rect(x, y, 1, h, hex('#e8dcb0')); px(x, y + h - 1, hex('#b8a880')); glow(x, y - 2, 4, hex('#ffc050'), 0.5); px(x, y - 1, hex('#fff2a0')); px(x, y - 2, hex('#ffb040')); }
function barrel(x, y, w = 10, h = 12, s = 1) { const c = hex('#6e4526');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const bulge = Math.abs(j - h / 2) > h / 2 - 2 && (i === 0 || i === w - 1); if (bulge) continue; const cx = (i - w / 2 + 0.5) / (w / 2); let f = 1.15 - cx * cx * 0.6 - (cx > 0 ? cx * 0.25 : 0); if (i % 3 === 0) f *= 0.75; f *= 0.9 + 0.2 * hash(x + i, y + j, s); px(x + i, y + j, sh(c, f)); }
  for (const hy of [2, h - 3]) for (let i = 0; i < w; i++) px(x + i, y + hy, sh(hex('#55555c'), i < 2 ? 1.3 : i > w - 3 ? 0.6 : 1)); rect(x + 1, y, w - 2, 1, hex('#8c6038')); }
function crate(x, y, w, h, s) { box(x, y, w, h, hex('#7a5530'), s); line(x + 1, y + 1, x + w - 2, y + h - 2, hex('#4e3218')); rect(x, y + (h >> 1), w, 1, hex('#4e3218')); }
function sack(x, y, s) { const c = hex('#a08a60'); for (let j = 0; j < 9; j++) { const hw = j < 2 ? 1 : j < 4 ? 3 : 4; for (let i = -hw; i <= hw; i++) px(x + i, y + j, sh(c, (1.1 - (i + hw) / (2 * hw) * 0.5) * (0.9 + 0.2 * hash(x + i, y + j, s)))); } rect(x - 1, y + 2, 3, 1, hex('#5e4c30')); }
function chest(x, y, w = 12, h = 8, s = 1) { box(x, y + 2, w, h - 2, hex('#6a4022'), s); rect(x + 1, y, w - 2, 3, hex('#7c4e2a')); rect(x + 1, y, w - 2, 1, hex('#a06e40')); for (const bx of [x + 2, x + w - 3]) rect(bx, y, 1, h, hex('#707078')); rect(x + (w >> 1) - 1, y + 3, 2, 2, hex('#e0b040')); }
function shelf(x, y, w, s, items = 'jars') { const rr = mul(s); rect(x, y, w, 1, hex('#7a5232')); rect(x, y + 1, w, 1, hex('#3a2414'));
  let i = x + 1; while (i < x + w - 2) { if (items === 'books') { const bw = 1 + (rr() * 2 | 0), bh = 4 + (rr() * 3 | 0), c = [hex('#7a2420'), hex('#24406a'), hex('#3e5a2a'), hex('#6a5a30'), hex('#4a2a50')][rr() * 5 | 0]; rect(i, y - bh, bw, bh, c); px(i, y - bh, sh(c, 1.4)); i += bw; if (rr() < 0.1) i += 2; }
    else if (items === 'bread') { const c = hex('#c08040'); rect(i, y - 3, 5, 3, c); rect(i + 1, y - 4, 3, 1, sh(c, 1.25)); px(i + 1, y - 3, hex('#f0c070')); i += 6; }
    else { const c = [hex('#8a7050'), hex('#506070'), hex('#7a4a30')][rr() * 3 | 0], hh = 3 + (rr() * 3 | 0); rect(i, y - hh, 3, hh, c); px(i, y - hh, sh(c, 1.4)); px(i + 2, y - 1, sh(c, 0.6)); i += 4 + (rr() * 2 | 0); } } }
function windowT(x, y, w, h, night = true) { rect(x - 1, y - 1, w + 2, h + 2, hex('#3a2414')); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, mix(hex('#ffd890'), hex('#f0a050'), j / h + hash(i, j, 3) * 0.15)); rect(x + (w >> 1), y, 1, h, hex('#3a2414')); rect(x, y + (h >> 1), w, 1, hex('#3a2414')); rect(x - 2, y + h + 1, w + 4, 1, hex('#7a5232')); glow(x + w / 2, y + h / 2, w + 3, hex('#ffc070'), 0.25); }
function table(x, y, w, s) { box(x, y, w, 2, hex('#7a5230'), s); rect(x + 1, y + 2, 1, 50 - y - 2, hex('#4a2e1a')); rect(x + w - 2, y + 2, 1, 50 - y - 2, hex('#3a2414')); }
function mug(x, y) { rect(x, y, 2, 3, hex('#8a8a90')); px(x, y, hex('#e0d8b0')); px(x + 2, y + 1, hex('#6a6a70')); }
function mushroom(x, y, h, c, s) { rect(x, y - h, 1, h, mix(c, hex('#d0d8d0'), 0.6)); const r = 1 + (h > 5 ? 2 : 1); for (let i = -r; i <= r; i++) { px(x + i, y - h, sh(c, 1.1)); if (Math.abs(i) < r) px(x + i, y - h - 1, sh(c, 1.4)); } px(x, y - h - 1, mix(c, hex('#ffffff'), 0.6)); glow(x, y - h, 6 + h, c, 0.4); }
function banner(x, y, w, h, c, s) { rect(x - 1, y - 1, w + 2, 1, hex('#8a6a30')); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (j > h - 3 && Math.abs(i - w / 2 + 0.5) < j - (h - 3)) continue; px(x + i, y + j, sh(c, (i === 0 ? 1.25 : i === w - 1 ? 0.6 : 1) * (0.88 + 0.2 * vnoise(i, j, 2, s)))); } rect(x + (w >> 1) - 1, y + 3, 2, 3, hex('#e0c060')); }
function chain(x, y, L) { for (let j = 0; j < L; j++) px(x + (j % 2), y + j, j % 2 ? hex('#5a5a62') : hex('#8a8a92')); }
function bones(x, y, s) { const rr = mul(s); for (let k = 0; k < 5; k++) { const bx = x + (rr() * 14 | 0), by = y + (rr() * 3 | 0); line(bx, by, bx + 3, by + (rr() < 0.5 ? 1 : -1), hex('#c8c0a8')); } rect(x + 5, y - 2, 3, 3, hex('#d8d0b8')); px(x + 5, y - 1, hex('#202020')); px(x + 7, y - 1, hex('#202020')); }
function arch(x, y, w, h, base, s) { // stone arch frame, dark inside
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const cx = i - w / 2 + 0.5, r = w / 2; const inArc = j >= r || cx * cx + (r - j) * (r - j) <= r * r; if (!inArc) continue; const inner = Math.abs(cx) < r - 2 && (j >= r || cx * cx + (r - j) * (r - j) <= (r - 2) * (r - 2)); px(x + i, y + j, inner ? sh(base, 0.18 + 0.05 * hash(i, j, s)) : sh(base, 1.1 + 0.15 * hash(i, j, s) - (cx > 0 ? 0.3 : 0))); } }
function cobweb(x, y, dir, s) { const c = hex('#a0a0a8'); for (let k = 0; k < 4; k++) line(x, y, x + dir * (8 - k * 2), y + k * 2 + 1, c); for (let r = 3; r < 8; r += 2) for (let k = 0; k <= r; k++) if (hash(k, r, s) < 0.7) px(x + dir * k, y + r - k, sh(c, 0.8)); }
function ore(x, y, c, s) { const rr = mul(s); for (let k = 0; k < 7; k++) { const ox = x + (rr() * 8 | 0), oy = y + (rr() * 6 | 0); px(ox, oy, c); px(ox + 1, oy, sh(c, 0.7)); if (rr() < 0.4) px(ox, oy - 1, mix(c, hex('#ffffff'), 0.5)); } }

// ---------- rooms ----------
function townWall(s, stone = false) { if (stone) bricks(0, 0, FW, 50, hex('#6a625a'), 10, 5, s); else { plaster(0, 0, FW, 50, hex('#a08a6a'), s); beam(0, 0, FW, 4, s); beam(0, 24, FW, 3, s); for (const bx of [0, 30, 62, 92]) beam(bx, 0, 4, 50, s + bx); diag(5, 27, 28, 49); diag(66, 27, 89, 49); }
  darken(0, 0, FW, 50, 0.62); floorBand('wood', s); }
const ROOMS = {
  tavern(s) { townWall(s); bricks(68, 22, 24, 28, hex('#6a5a50'), 6, 3, s); rect(72, 36, 16, 14, hex('#100806')); for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) if (hash(i, j, 5) < 0.6 - j * 0.05) px(72 + i, 49 - j, mix(hex('#ff5010'), hex('#ffe070'), hash(i, j, 6) * (1 - j / 8))); glow(80, 44, 14, hex('#ff8030'), 0.5); rect(70, 34, 20, 2, hex('#5a4a40'));
    shelf(6, 18, 26, s); box(4, 36, 40, 14, hex('#6e4528'), s); rect(4, 36, 40, 2, hex('#9a6a3c')); for (const mx of [8, 16, 30]) mug(mx, 33); barrel(48, 38, 9, 12, s); barrel(57, 40, 8, 10, s + 1); barrel(51, 28, 8, 10, s + 2); torch(46, 12); },
  forge(s) { bricks(0, 0, FW, 50, hex('#5a5048'), 9, 4, s); darken(0, 0, FW, 50, 0.6); floorBand('stone', s);
    bricks(8, 20, 30, 30, hex('#7a6a5a'), 6, 3, s + 1); rect(10, 14, 26, 6, hex('#4a4038')); rect(18, 0, 10, 14, hex('#3a322c')); rect(12, 30, 22, 12, hex('#140806')); for (let i = 0; i < 22; i++) for (let j = 0; j < 6; j++) px(12 + i, 41 - j, mix(hex('#ff3000'), hex('#ffe060'), hash(i, j, 9) * (1 - j / 6) + 0.1)); glow(23, 38, 18, hex('#ff6020'), 0.55);
    // anvil
    rect(52, 38, 14, 3, hex('#5a5a62')); rect(52, 38, 14, 1, hex('#9a9aa2')); rect(50, 38, 3, 2, hex('#6a6a72')); rect(56, 41, 6, 4, hex('#45454c')); rect(54, 45, 10, 5, hex('#3a2414')); rect(54, 45, 10, 1, hex('#6a4a30'));
    for (let k = 0; k < 4; k++) { const tx = 72 + k * 5; line(tx, 10, tx, 22, hex('#5a3a22')); rect(tx - 1, 22, 3, 3, hex('#7a7a82')); } beam(68, 9, 26, 2, s); barrel(80, 40, 10, 10, s); rect(81, 40, 8, 1, hex('#304050')); torch(46, 14); },
  home(s) { townWall(s, false); windowT(40, 9, 12, 12); // bed
    box(4, 40, 28, 6, hex('#6a4426'), s); rect(5, 37, 26, 3, hex('#8a2a28')); rect(5, 37, 26, 1, hex('#b04a40')); rect(5, 36, 8, 3, hex('#d8d0b8')); box(3, 32, 3, 18, hex('#5a3820'), s); box(30, 36, 3, 14, hex('#5a3820'), s);
    table(58, 40, 18, s); candle(66, 37); mug(61, 37); box(80, 42, 6, 2, hex('#6a4426'), s); rect(81, 44, 1, 6, hex('#4a2e1a')); rect(84, 44, 1, 6, hex('#4a2e1a')); rect(84, 34, 2, 8, hex('#5a3820')); shelf(62, 16, 22, s); },
  granary(s) { townWall(s); planks(0, 0, FW, 50, hex('#5a4028'), s, true, 7); darken(0, 0, FW, 50, 0.65); beam(0, 0, FW, 4, s); beam(0, 22, FW, 3, s);
    for (const bx of [2, 76]) { box(bx, 26, 18, 24, hex('#6a4a2c'), s); for (let k = 0; k < 3; k++) rect(bx, 30 + k * 7, 18, 1, hex('#3a2616')); rect(bx + 2, 25, 14, 3, hex('#c8a850')); }
    for (const [x, y] of [[8, 12], [14, 13], [82, 12], [88, 13]]) sack(x, y, s + x); windowT(44, 6, 8, 8); },
  vault(s) { bricks(0, 0, FW, 50, hex('#585860'), 12, 6, s); darken(0, 0, FW, 50, 0.6); floorBand('stone', s);
    for (const bx of [0, 47, 92]) { rect(bx, 0, 4, 50, hex('#3a3a42')); rect(bx, 0, 1, 50, hex('#6a6a74')); for (let y = 3; y < 50; y += 8) px(bx + 2, y, hex('#a0a0a8')); } rect(0, 4, FW, 2, hex('#3a3a42')); rect(0, 4, FW, 1, hex('#6a6a74'));
    chest(4, 40, 14, 10, s); chest(78, 40, 14, 10, s + 1); chest(80, 32, 10, 8, s + 2); torch(26, 14); torch(70, 14); rect(54, 12, 14, 14, hex('#2a2a30')); circ(61, 19, 4, hex('#6a6a74')); circ(61, 19, 2, hex('#3a3a42')); },
  townhall(s) { bricks(0, 0, FW, 50, hex('#7a7268'), 12, 5, s); darken(0, 0, FW, 50, 0.6); floorBand('stone', s);
    for (const cx of [2, 88]) { box(cx, 0, 6, 50, hex('#8a8278'), s); } banner(14, 6, 9, 22, hex('#8a2020'), s); banner(73, 6, 9, 22, hex('#203a7a'), s);
    circ(48, 18, 12, hex('#5a4a30')); circ(48, 18, 11, hex('#a08040')); circ(48, 18, 10, hex('#ece0c0')); for (let a = 0; a < 12; a++) px(48 + Math.round(Math.cos(a * Math.PI / 6) * 8.5), 18 + Math.round(Math.sin(a * Math.PI / 6) * 8.5), hex('#5a4a30'));
    box(30, 40, 36, 4, hex('#6a4426'), s); rect(32, 44, 2, 6, hex('#4a2e1a')); rect(62, 44, 2, 6, hex('#4a2e1a')); candle(36, 36); candle(60, 36); torch(28, 26); torch(68, 26); },
  chapel(s) { bricks(0, 0, FW, 50, hex('#6a6470'), 10, 5, s); darken(0, 0, FW, 50, 0.58); floorBand('stone', s);
    // stained glass, pointed
    for (let j = 0; j < 26; j++) for (let i = 0; i < 16; i++) { const cx = i - 7.5; if (j < 8 && Math.abs(cx) > j) continue; const cols = ['#d04040', '#3a6ad0', '#e0c040', '#40a060', '#a050c0']; const c = hex(cols[(Math.floor(i / 4) + Math.floor(j / 5)) % 5]); const lead = i % 4 === 0 || j % 5 === 0; px(40 + i, 4 + j, lead ? hex('#202024') : sh(c, 0.9 + 0.3 * hash(i, j, s))); } glow(48, 16, 22, hex('#a0a0ff'), 0.18);
    box(34, 38, 28, 12, hex('#8a8478'), s); rect(34, 38, 28, 2, hex('#e0dcd0')); rect(47, 30, 2, 8, hex('#d0a040')); rect(44, 32, 8, 2, hex('#d0a040')); for (const cx of [37, 40, 56, 59]) candle(cx, 34, 4); for (const cx of [8, 14, 80, 86]) { rect(cx, 44, 1, 6, hex('#5a4a30')); candle(cx, 40, 4); } },
  bakery(s) { townWall(s); bricks(56, 16, 36, 34, hex('#8a6a50'), 6, 3, s); for (let j = 0; j < 14; j++) for (let i = 0; i < 20; i++) { const cx = i - 9.5; if (j < 10 && cx * cx + (10 - j) * (10 - j) > 100) continue; px(64 + i, 26 + j, sh(hex('#ff7020'), 0.5 + 0.7 * hash(i, j, s) * (j / 14))); } glow(74, 36, 14, hex('#ff9040'), 0.5); rect(60, 40, 28, 2, hex('#5a4030'));
    shelf(4, 16, 40, s, 'bread'); shelf(4, 28, 40, s + 1, 'bread'); box(6, 40, 34, 10, hex('#6a4426'), s); rect(6, 40, 34, 1, hex('#c8b8a0')); sack(46, 41, s); torch(50, 14); },
  scaffold(s) { for (let y = 0; y < 50; y++) for (let x = 0; x < FW; x++) px(x, y, mix(hex('#0a1430'), hex('#1e2e58'), y / 50 + hash(x, y, s) * 0.06)); for (let k = 0; k < 18; k++) { const sx = hash(k, 1, s) * FW | 0, sy = hash(k, 2, s) * 40 | 0; px(sx, sy, hex('#d0d8ff')); }
    bricks(0, 26, 34, 24, hex('#6a625a'), 10, 5, s); for (let x = 0; x < 34; x++) { const t = 26 + (hash(Math.floor(x / 5), 0, s) * 10 | 0) + (x > 24 ? (x - 24) * 2 : 0); for (let y = 26; y < t; y++) px(x, y, mix(hex('#0a1430'), hex('#1e2e58'), y / 50)); }
    for (const px_ of [38, 66, 90]) beam(px_, 6, 3, 44, s + px_); for (const py of [20, 36]) { planks(36, py, 58, 2, hex('#8a6a40'), s, false, 2); rect(36, py + 2, 58, 1, hex('#2a1a10')); } line(40, 36, 66, 20, hex('#5a3a22')); line(68, 36, 90, 20, hex('#5a3a22'));
    rect(70, 31, 8, 5, hex('#8a8078')); rect(70, 31, 8, 1, hex('#b0a898')); floorBand('wood', s); },
  // roofs: transparent top, roof at bottom
  roof_a(s) { roof(s, 'thatch'); }, roof_b(s) { roof(s, 'tile'); }, roof_c(s) { roof(s, 'slate'); },
  street(s) { // cobbles top 8, earth below
    for (let y = 0; y < 8; y++) for (let x = 0; x < FW; x++) { const row = y >> 2, off = row * 3, cx = (x + off) % 6, cy = y % 4; let c = hex('#7a7468'); let f = 0.75 + 0.4 * hash(Math.floor((x + off) / 6), row, s); if (cx === 0 || cy === 0) f = 0.4; else if (cy === 1) f *= 1.2; px(x, y, sh(c, f)); }
    for (let x = 0; x < FW; x++) { if (hash(x, 0, s) < 0.35) { px(x, 0, hex('#4a7a30')); if (hash(x, 1, s) < 0.5) px(x, -1, hex('#5a8a3a')); } }
    for (let y = 8; y < FH; y++) for (let x = 0; x < FW; x++) { const d = 1 - (y - 8) / 60; px(x, y, sh(hex('#5a3e26'), d * (0.7 + 0.25 * vnoise(x, y, 4, s) + 0.15 * hash(x, y, s)))); }
    rect(0, 8, FW, 1, hex('#2a1a10')); const rr = mul(s); for (let k = 0; k < 40; k++) { const x = rr() * FW | 0, y = 10 + (rr() * 44 | 0), r = rr() < 0.3 ? 3 : 2, c = sh(hex("#8a8070"), (1 - (y - 8) / 70) * (0.8 + rr() * 0.4)); circ(x, y, r, c); px(x - 1, y - r + 1, sh(c, 1.3)); rect(x - r + 1, y + r + 1, 2 * r - 1, 1, sh(c, 0.4)); }
    for (let k = 0; k < 5; k++) { let x = rr() * FW, y = 9; for (let j = 0; j < 20; j++) { px(x, y, hex('#3a2616')); x += (rr() - 0.5) * 2; y += 1; } } },
  cellar(s) { bricks(0, 0, FW, 50, hex('#5a4a40'), 8, 4, s); darken(0, 0, FW, 50, 0.55); floorBand('#4a3a30', s); for (const bx of [12, 80]) beam(bx, 4, 4, 46, s + bx); beam(0, 0, FW, 5, s);
    barrel(22, 38, 11, 12, s); barrel(33, 38, 11, 12, s + 1); barrel(27, 26, 11, 12, s + 2); crate(56, 40, 12, 10, s); crate(58, 32, 8, 8, s + 1); rect(48, 5, 1, 6, hex('#3a3a40')); rect(46, 11, 5, 5, hex('#2a2a30')); rect(47, 12, 3, 3, hex('#ffd070')); glow(48, 13, 10, hex('#ffb050'), 0.5); sack(88, 41, s); },
  mine(s) { const m = cave(hex('#7a6a58'), s, { top: 6 }); for (const bx of [10, 46, 82]) { beam(bx, 8, 4, 42, s + bx); } beam(6, 8, 84, 3, s);
    ore(20, 18, hex('#c08040'), s); ore(60, 26, hex('#d0d8e0'), s + 1); ore(70, 14, hex('#e0b030'), s + 2); for (let x = 0; x < FW; x += 4) rect(x, 49, 2, 1, hex('#4a3020')); rect(0, 48, FW, 1, hex('#8a8a90'));
    rect(54, 38, 16, 8, hex('#5a4a3a')); rect(54, 38, 16, 1, hex('#8a7a6a')); rect(55, 36, 14, 2, hex('#6a6a70')); circ(57, 47, 1, hex('#303034')); circ(67, 47, 1, hex('#303034')); torch(30, 18); },
  fungus(s) { fungusCave(s, hex('#40b0a0'), hex('#a050d0')); }, fungus2(s) { fungusCave(s, hex('#a050d0'), hex('#60d0a0')); },
  grotto(s) { grottoCave(s); }, grotto2(s) { grottoCave(s, true); },
  crypt(s) { bricks(0, 0, FW, 50, hex('#4a5870'), 10, 5, s); darken(0, 0, FW, 50, 0.55); floorBand('stone', s); for (const ax of [4, 36, 68]) arch(ax, 8, 24, 42, hex('#5a6880'), s);
    for (const tx of [7, 39, 71]) { box(tx, 38, 18, 12, hex('#6a7488'), s); rect(tx + 7, 30, 4, 8, hex('#8a94a8')); rect(tx + 5, 32, 8, 2, hex('#8a94a8')); } bones(40, 47, s); candle(10, 34); candle(28, 34); candle(84, 34); for (const cx of [32, 64]) { candle(cx, 20, 3); } },
  crypt2(s) { bricks(0, 0, FW, 50, hex('#4a5060'), 10, 5, s); darken(0, 0, FW, 50, 0.55); floorBand('stone', s);
    for (const bx of [4, 62]) { box(bx, 8, 30, 42, hex('#4a3020'), s); for (let r = 0; r < 4; r++) { rect(bx + 2, 12 + r * 10, 26, 8, hex('#1a100a')); shelf(bx + 2, 19 + r * 10, 26, s + r + bx, 'books'); } }
    arch(38, 14, 20, 36, hex('#5a6070'), s); candle(46, 42, 4); candle(50, 44, 3); cobweb(0, 0, 1, s); cobweb(95, 0, -1, s + 1); cobweb(34, 8, 1, s + 2); },
  cells(s) { bricks(0, 0, FW, 50, hex('#545058'), 8, 4, s); darken(0, 0, FW, 50, 0.5); floorBand('stone', s);
    for (const cx of [2, 50]) { rect(cx, 10, 44, 40, hex('#1a181c')); rect(cx, 10, 44, 2, hex('#4a4850')); for (let x = cx + 2; x < cx + 44; x += 4) { rect(x, 12, 1, 38, hex('#7a7a82')); px(x, 12, hex('#b0b0b8')); } rect(cx, 30, 44, 1, hex('#5a5a62')); }
    chain(12, 14, 14); chain(30, 14, 10); rect(10, 46, 10, 4, hex('#6a5a30')); bones(60, 47, s); chain(80, 12, 16); torch(48, 6);
    chain(70, 0, 8); for (let j = 0; j < 10; j++) for (let i = 0; i < 8; i++) if (i % 3 === 0 || j === 0 || j === 9) px(67 + i, 8 + j, hex('#8a8a90')); },
  hoard(s) { const m = cave(hex('#8a6040'), s, { top: 5, l: 3, r: 93 }); stalactites(m, 10, hex('#6a4a30'), s); darken(23, 28, 50, 22, 0.55); torch(12, 22); torch(84, 22); chest(6, 40, 12, 10, s); chest(78, 40, 12, 10, s + 3); rect(18, 46, 3, 4, hex('#d0a040')); },
  shrine(s) { bricks(0, 0, FW, 50, hex('#5a4a50'), 10, 5, s); darken(0, 0, FW, 50, 0.55); floorBand('stone', s);
    box(36, 40, 24, 10, hex('#6a5a58'), s); box(40, 34, 16, 6, hex('#7a6a66'), s); // idol
    rect(43, 14, 10, 20, hex('#3a4a3a')); rect(44, 14, 8, 1, hex('#6a8a6a')); rect(41, 18, 2, 8, hex('#3a4a3a')); rect(53, 18, 2, 8, hex('#3a4a3a')); rect(45, 17, 2, 2, hex('#ff4020')); rect(49, 17, 2, 2, hex('#ff4020')); rect(43, 10, 10, 4, hex('#4a5a4a')); px(44, 9, hex('#4a5a4a')); px(51, 9, hex('#4a5a4a')); glow(48, 18, 8, hex('#ff3020'), 0.3);
    for (const bx of [16, 76]) { rect(bx - 1, 36, 3, 14, hex('#4a4044')); rect(bx - 4, 32, 9, 4, hex('#5a5058')); rect(bx - 4, 32, 9, 1, hex('#8a8088')); for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) if (hash(i, j, s + bx) < 0.75 - j * 0.12) px(bx - 3 + i, 31 - j, mix(hex('#ff4010'), hex('#ffe070'), hash(i, j, bx) * (1 - j / 5))); glow(bx, 29, 14, hex('#ff8030'), 0.5); }
    banner(4, 6, 7, 18, hex('#5a1a40'), s); banner(85, 6, 7, 18, hex('#5a1a40'), s + 1); },
  dig(s) { const m = cave(hex('#6a5a4a'), s, { top: 22, l: 30, r: 70 }); rockFill(0, 0, FW, 50, hex('#3a3028'), s + 9); for (let y = 0; y < 50; y++) for (let x = 0; x < FW; x++) { const dx = (x - 50) / 22, dy = (y - 42) / 14; if (dx * dx + dy * dy + (vnoise(x, y, 4, s) - 0.5) * 0.6 < 1) px(x, y, sh(hex('#4a3e34'), 0.4 + 0.3 * hash(x, y, s))); else if (dx * dx + dy * dy < 1.25) px(x, y, sh(hex('#7a6a5a'), 0.7 + 0.3 * hash(x, y, s))); }
    const rr = mul(s); for (let k = 0; k < 14; k++) { const x = 34 + (rr() * 30 | 0), y = 46 + (rr() * 4 | 0); rect(x, y, 2 + (rr() * 2 | 0), 2, sh(hex('#7a6a5a'), 0.8 + rr() * 0.4)); px(x, y, hex('#a09080')); }
    line(56, 36, 62, 48, hex('#6a4426')); line(53, 37, 60, 35, hex('#9a9aa2')); line(53, 38, 54, 37, hex('#6a6a72')); floorBand('#5a4a3a', s); },
  rock1(s) { rock(s, true); }, rock2(s) { rock(s); }, rock3(s) { rock(s); }, rock4(s) { rock(s); },
};
function roof(s, kind) {
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) px(x, y, [0, 0, 0], 0);
  const base = kind === 'thatch' ? hex('#a08040') : kind === 'tile' ? hex('#9a3a28') : hex('#4a5060');
  if (kind !== 'thatch') { box(70, 14, 9, 22, hex('#6a5a50'), s); bricks(70, 14, 9, 22, hex('#7a6050'), 4, 3, s); rect(69, 12, 11, 2, hex('#4a4040')); } else { bricks(18, 16, 8, 18, hex('#7a6050'), 4, 3, s); rect(17, 14, 10, 2, hex('#4a4040')); }
  for (let y = 20; y < FH; y++) { const half = 6 + (y - 20) * 1.34; for (let x = 0; x < FW; x++) { const dx = Math.abs(x - 47.5); if (dx > half) continue; let f;
      if (kind === 'thatch') { f = 0.65 + 0.5 * hash(x, y >> 1, s) * vnoise(x * 3, y, 2, s) + 0.2; if (y % 5 === 4) f *= 0.65; }
      else if (kind === 'tile') { const off = ((y >> 2) % 2) * 3, lx = (x + off) % 6, ly = y % 4; f = 0.85 + 0.25 * hash((x + off) / 6 | 0, y >> 2, s); if (ly === 3) f = 0.45; else if (ly === 0) f *= 1.3; if (lx === 0) f *= 0.7; }
      else { const off = ((y / 3 | 0) % 2) * 4, lx = (x + off) % 8, ly = y % 3; f = 0.8 + 0.35 * hash((x + off) / 8 | 0, y / 3 | 0, s); if (ly === 2) f = 0.35; else if (ly === 0) f *= 1.25; if (lx === 0) f *= 0.6; }
      if (dx > half - 1.5) f *= 1.25; f *= x > 47.5 ? 0.8 : 1; px(x, y, sh(base, f)); } }
  for (let x = 0; x < FW; x++) { px(x, FH - 1, sh(base, 0.4)); px(x, FH - 2, sh(base, 0.6)); } rect(44, 18, 8, 2, sh(base, kind === 'thatch' ? 0.6 : 0.5));
  if (kind === 'tile') { rect(38, 34, 20, 14, hex('#6a4a30')); for (let j = 0; j < 4; j++) rect(36 + j * 0, 33 - j, 24 - j * 0, 1, hex('#7a2a20')); windowT(43, 38, 10, 8); }
  if (kind === 'slate') { rect(20, 40, 12, 10, hex('#4a3a2a')); windowT(22, 42, 8, 7); rect(18, 38, 16, 2, hex('#3a4050')); }
}
function fungusCave(s, c1, c2) { const m = cave(hex('#4a5a5a'), s, { top: 5 }); stalactites(m, 9, hex('#3a4a4c'), s);
  for (let y = 0; y < 50; y++) for (let x = 0; x < FW; x++) if (m[y * FW + x] && hash(x, y, s + 4) < 0.012) px(x, y, mix(get(x, y), hex('#5a9a8a'), 0.5)); // damp
  const rr = mul(s); for (let k = 0; k < 16; k++) { const x = 4 + (rr() * 88 | 0); mushroom(x, 50, 2 + (rr() * 7 | 0), rr() < 0.6 ? c1 : c2, s + k); }
  for (let k = 0; k < 6; k++) { const x = 10 + (rr() * 76 | 0), y = 14 + (rr() * 20 | 0); if (m[y * FW + x]) { px(x, y, c2); glow(x, y, 3, c2, 0.4); } } }
function grottoCave(s, alt = false) { const m = cave(hex('#4a5868'), s, { top: alt ? 4 : 8 }); stalactites(m, 14, hex('#5a6878'), s);
  const wx = alt ? 18 : 74; for (let y = 0; y < 50; y++) for (let x = wx; x < wx + 4; x++) if (m[y * FW + x] || y > 10) px(x, y, mix(hex('#4a90c0'), hex('#d0f0ff'), hash(x, y >> 1, s) * 0.7));
  for (let y = 40; y < 56; y++) for (let x = 6; x < 90; x++) { const sx = Math.abs(x - 48) / 44; if (y < 42 + sx * sx * 8) continue; px(x, y, mix(hex('#1a4a6a'), hex('#0a1a2a'), (y - 40) / 16 + hash(x, y, s) * 0.1)); } for (let x = 8; x < 88; x++) if (hash(x, 1, s) < 0.5) px(x, 42 + Math.round(Math.pow(Math.abs(x - 48) / 44, 2) * 8), hex('#80c0e0'));
  glow(wx + 2, 44, 10, hex('#80c0ff'), 0.35); }
function rock(s, roots = false) { rockFill(0, 0, FW, FH, hex('#4a4038'), s, true);
  // strata: horizontal bands, seamless since they ignore x period
  for (let y = 0; y < FH; y++) { const band = Math.sin(y * 0.35 + s) > 0.85; if (band) for (let x = 0; x < FW; x++) px(x, y, sh(get(x, y), 0.7)); }
  const rr = mul(s); for (let k = 0; k < 10; k++) { const x = 4 + (rr() * 88 | 0), y = 4 + (rr() * 48 | 0), r = 1 + (rr() * 3 | 0), c = sh(hex('#7a7068'), 0.7 + rr() * 0.4); circ(x, y, r, c); px(x - 1, y - r + 1, sh(c, 1.4)); for (let i = -r; i <= r; i++) px(x + i, y + r + 1, sh(hex('#2a2420'), 1)); }
  if (rr() < 0.7 || s % 2) { const fx = 20 + (rr() * 56 | 0), fy = 16 + (rr() * 24 | 0); for (let a = 0; a < 22; a++) { const r = a * 0.25; px(fx + Math.round(Math.cos(a * 0.6) * r), fy + Math.round(Math.sin(a * 0.6) * r), hex('#b0a088')); } }
  if (roots) for (let k = 0; k < 6; k++) { let x = 6 + k * 16 + rr() * 8, y = 0; for (let j = 0; j < 14 + rr() * 20; j++) { px(x, y, hex('#5a3a22')); px(x + 1, y, hex('#3a2414')); x += (rr() - 0.5) * 1.6; y++; } } }

// ---------- build ----------
const frames = {};
NAMES.forEach((n, i) => { OX = (i % COLS) * FW; OY = Math.floor(i / COLS) * FH; R = mul(i + 1);
  ROOMS[n](101 + i * 37); frames[n] = { x: OX, y: OY, w: FW, h: FH, ax: 0, ay: 0 }; });
fs.writeFileSync(path.join(ART, 'rooms.png'), png());
fs.writeFileSync(path.join(ART, 'rooms.json'), JSON.stringify({ image: 'rooms.png', frames, animations: {} }, null, 1));
const idx = path.join(ART, 'index.json');
const ix = fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, 'utf8')) : { sheets: [] };
ix.sheets = ix.sheets || []; if (!ix.sheets.includes('rooms.json')) ix.sheets.push('rooms.json');
fs.writeFileSync(idx, JSON.stringify(ix));
console.log('wrote', NAMES.length, 'frames', W + 'x' + H, fs.statSync(path.join(ART, 'rooms.png')).size, 'bytes');
