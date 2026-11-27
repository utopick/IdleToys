// Procedural cockpit sheet: art/cockpit.png (cockpit frame + emissive glow frame) and art/cockpit.json.
// Run: node tools/make-cockpit.mjs  (Node built-ins only, seeded so output is repeatable)
import { writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 640, H = 360;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'art');

// ---- seeded random + noise ----
let seed = 0x5eed1990;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263 + 1234567) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.5);
const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

// ---- layers ----
const cock = new Uint8ClampedArray(W * H * 4);
const glow = new Uint8ClampedArray(W * H * 4);
const reg = new Int16Array(W * H); // region id per pixel, for bevel pass
function put(buf, x, y, c, a = 255) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4, sa = a / 255, da = buf[i + 3] / 255, oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  for (let k = 0; k < 3; k++) buf[i + k] = (c[k] * sa + buf[i + k] * da * (1 - sa)) / oa;
  buf[i + 3] = oa * 255;
}
// material shade: base colour * light, quantized with Bayer dither, plus grain
function mat(base, light, x, y, grain = 6, steps = 7) {
  const l = Math.round((light + BAYER[(y & 3) * 4 + (x & 3)] / steps) * steps) / steps;
  const g = (hash(x, y) - 0.5) * grain;
  return base.map(v => clamp(v * l + g));
}
let rid = 1;
function region(test, shader, id = rid++, x0 = 0, y0 = 0, x1 = W, y1 = H) {
  for (let y = Math.max(0, y0 | 0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(W, x1); x++)
    if (test(x, y)) { const c = shader(x, y); if (c) { put(cock, x, y, c, c[3] ?? 255); reg[y * W + x] = id; } }
  return id;
}
function inPoly(p, x, y) {
  let ins = false; x += 0.5; y += 0.5;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const bbox = p => [Math.min(...p.map(q => q[0])), Math.min(...p.map(q => q[1])), Math.max(...p.map(q => q[0])) + 1, Math.max(...p.map(q => q[1])) + 1];
const poly = (p, shader) => region((x, y) => inPoly(p, x, y), shader, rid++, ...bbox(p));
const rect = (x, y, w, h, shader) => region((px, py) => px >= x && py >= y && px < x + w && py < y + h, shader, rid++, x, y, x + w, y + h);
const disc = (cx, cy, r, shader) => region((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, shader, rid++, cx - r - 1, cy - r - 1, cx + r + 2, cy + r + 2);
const ring = (cx, cy, r0, r1, shader) => region((x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r0 && d <= r1; }, shader, rid++, cx - r1 - 1, cy - r1 - 1, cx + r1 + 2, cy + r1 + 2);
const line = (buf, x0, y0, x1, y1, c, a = 255) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) put(buf, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c, a); };

// ---- palette (neutral mid lighting; the game tints it) ----
const PL = [74, 70, 86];      // dash plastic grey-violet
const PLD = [52, 49, 62];     // darker trim
const LEA = [44, 40, 46];     // wheel leather
const GLASS = [22, 24, 30];   // dial faces
const MET = [120, 118, 130];  // bezels / chrome-ish
const SKIN = [214, 160, 124], GLOVE = [40, 34, 34];
const RAD_DISP = [8, 34, 38]; // radio display, left empty for the game

// ---- geometry ----
const dashY = x => 205 + Math.round(((x - 320) / 320) ** 2 * 14); // hood-like curve, lowest at the edges
const WB = 205;
const pillL = y => [Math.round(8 + (y - 14) * 0.30), Math.round(30 + (y - 14) * 0.38)]; // [outer, inner] x
const pillR = y => { const [a, b] = pillL(y); return [W - 1 - b, W - 1 - a]; };
const spots = {
  speedo: { x: 112, y: 258, r: 27 }, tacho: { x: 190, y: 258, r: 27 },
  radio: { x: 318, y: 262, w: 66, h: 12 },
  indL: { x: 141, y: 226 }, indR: { x: 161, y: 226 },
  wheel: { x: 151, y: 308, r: 100 }, windscreenBottom: WB,
};

// 1. dashboard body (everything under the curve)
region((x, y) => y >= dashY(x), (x, y) => {
  const t = (y - dashY(x)) / 40; // top surface lit, falls off
  return mat(PL, 1.05 - Math.min(t, 1) * 0.35 + 0.05 * Math.sin(x / 37), x, y);
});
// dash top lip (lighter strip catching the light)
region((x, y) => y >= dashY(x) && y < dashY(x) + 3, (x, y) => mat(PL, 1.35 - (y - dashY(x)) * 0.12, x, y, 4));
// lower dash shadow band
region((x, y) => y > 300, (x, y) => mat(PLD, 0.95 - (y - 300) / 140, x, y));

// 2. door panels
for (const side of [0, 1]) {
  const X = x => side ? W - 1 - x : x;
  poly([[X(0), 210], [X(46), 222], [X(56), 360], [X(0), 360]].map(p => p), (x, y) => mat(PLD, 0.85 + (side ? (x - 590) : (50 - x)) / 200, x, y, 8));
  poly([[X(0), 216], [X(40), 226], [X(42), 232], [X(0), 222]], (x, y) => mat(PL, 1.2, x, y)); // window sill
  // speaker grille
  const gx = side ? W - 26 : 26, gy = 300;
  disc(gx, gy, 16, (x, y) => mat(PLD, 0.6 + ((x + y) % 3 === 0 ? 0.3 : 0), x, y, 4));
  ring(gx, gy, 16, 18, (x, y) => mat(MET, 0.6 + (gy - y) / 60, x, y));
  // window switches
  rect(side ? W - 40 : 12, 248, 28, 18, (x, y) => mat(PLD, 0.7, x, y));
  for (let k = 0; k < 2; k++) rect((side ? W - 37 : 15) + k * 12, 251, 9, 12, (x, y) => mat(PL, y < 255 ? 1.3 : 0.9, x, y, 4));
}

// 3. centre console
const CX0 = 286, CX1 = 418;
poly([[CX0, 210], [CX1, 210], [CX1 + 6, 360], [CX0 - 6, 360]], (x, y) => mat(PLD, 1.05 - (y - 210) / 300, x, y));
// centre vents
for (const vx of [292, 360]) {
  rect(vx, 214, 52, 20, (x, y) => mat(PLD, 0.5, x, y, 3));
  for (let s = 0; s < 5; s++) rect(vx + 2, 216 + s * 4, 48, 2, (x, y) => mat(MET, y % 2 ? 0.55 : 0.8, x, y, 4));
}
// hazard button
rect(346, 220, 12, 10, (x, y) => mat([150, 60, 60], 0.9, x, y, 4));
// small screen (trip computer)
rect(322, 238, 60, 16, (x, y) => mat(MET, 0.75, x, y, 4));
rect(325, 240, 54, 12, (x, y) => mat(GLASS, 0.9 + (y - 240) / 40, x, y, 3));
// radio / cassette deck
rect(296, 258, 112, 40, (x, y) => mat([60, 58, 66], 0.95 - (y - 258) / 140, x, y, 5));
rect(spots.radio.x - 2, spots.radio.y - 2, spots.radio.w + 4, spots.radio.h + 4, (x, y) => mat(MET, 0.8, x, y, 3));
rect(spots.radio.x, spots.radio.y, spots.radio.w, spots.radio.h, (x, y) => mat(RAD_DISP, 1, x, y, 2));
rect(318, 280, 66, 9, (x, y) => mat([30, 30, 36], 1, x, y, 2)); // cassette slot
rect(320, 284, 62, 1, () => [12, 12, 14]);
disc(304, 268, 5, (x, y) => mat(MET, 1.1 - (y - 263) / 12, x, y, 4)); // volume knob
disc(400, 268, 5, (x, y) => mat(MET, 1.1 - (y - 263) / 12, x, y, 4)); // tune knob
for (let k = 0; k < 6; k++) rect(300 + k * 18, 292, 14, 4, (x, y) => mat(PL, y === 292 ? 1.5 : 1.0, x, y, 3)); // preset buttons
// climate dials
for (const [i, cx] of [[0, 310], [1, 352], [2, 394]]) {
  disc(cx, 316, 11, (x, y) => mat(PLD, 0.5, x, y, 3));
  disc(cx, 315, 9, (x, y) => mat(MET, 1.15 - Math.hypot(x - cx + 3, y - 312) / 14, x, y, 5));
  line(cock, cx, 315, cx + [-5, 0, 5][i], 308, [220, 220, 228]);
}
// gear stick with boot
poly([[338, 360], [346, 340], [374, 340], [382, 360]], (x, y) => mat(LEA, 0.8 + ((x * 7 + y * 3) % 5 === 0 ? 0.25 : 0) - (y - 340) / 80, x, y, 6));
for (let k = 0; k < 4; k++) line(cock, 348 + k * 3, 341 + k * 5, 372 - k * 3, 341 + k * 5, [28, 26, 30]); // boot folds
rect(357, 322, 6, 20, (x, y) => mat(MET, 1.2 - (x - 357) / 8, x, y, 3));
disc(360, 318, 8, (x, y) => mat([40, 38, 44], 1.4 - Math.hypot(x - 357, y - 315) / 9, x, y, 4));

// 4. passenger side: vent + glovebox seam
rect(500, 216, 64, 20, (x, y) => mat(PLD, 0.5, x, y, 3));
for (let s = 0; s < 5; s++) rect(502, 218 + s * 4, 60, 2, (x, y) => mat(MET, y % 2 ? 0.55 : 0.8, x, y, 4));
poly([[440, 262], [580, 262], [576, 318], [446, 318]], (x, y) => mat(PL, 0.85 - (y - 262) / 200, x, y));
line(cock, 440, 262, 580, 262, [36, 34, 42]); line(cock, 446, 318, 576, 318, [100, 96, 112]);
rect(498, 266, 24, 5, (x, y) => mat(MET, 0.9, x, y, 3)); // glovebox handle

// 5. instrument binnacle (hood + panel) behind the wheel
const BX0 = 62, BX1 = 244;
poly([[BX0, 222], [BX0 + 14, 206], [BX1 - 14, 206], [BX1, 222], [BX1 - 4, 292], [BX0 + 4, 292]], (x, y) => mat(PLD, 1.1 - (y - 206) / 60, x, y));
poly([[BX0 + 8, 216], [BX1 - 8, 216], [BX1 - 10, 288], [BX0 + 10, 288]], (x, y) => mat([30, 30, 38], 0.9, x, y, 3)); // inner panel
for (const s of [spots.speedo, spots.tacho]) {
  ring(s.x, s.y, s.r, s.r + 3, (x, y) => mat(MET, 1.2 - (y - s.y + s.r) / (2 * s.r + 6) * 0.7, x, y, 4));
  disc(s.x, s.y, s.r, (x, y) => mat(GLASS, 0.9 + (Math.hypot(x - s.x + 8, y - s.y + 10) < 10 ? 0.4 : 0), x, y, 3));
  disc(s.x, s.y, 3, () => [70, 70, 78]);
}
// small fuel/temp gauges between and below
const smalls = [{ x: 151, y: 270, r: 9 }, { x: 151, y: 249, r: 8 }];
for (const s of smalls) { ring(s.x, s.y, s.r, s.r + 2, (x, y) => mat(MET, 0.9, x, y, 3)); disc(s.x, s.y, s.r, (x, y) => mat(GLASS, 0.9, x, y, 3)); }
// warning lamp lenses (dark when off)
const lamps = [[spots.indL.x, spots.indL.y, [80, 200, 90]], [spots.indR.x, spots.indR.y, [80, 200, 90]], [100, 284, [230, 60, 40]], [112, 284, [240, 170, 40]], [190, 284, [240, 170, 40]], [202, 284, [230, 60, 40]]];
for (const [x, y] of lamps) rect(x - 2, y - 2, 5, 4, (px, py) => mat([40, 40, 46], py === y - 2 ? 1.3 : 0.9, px, py, 2));
// tick marks + numerals on the dials (pale, non-emissive) — reused for glow
const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
function text(buf, s, x, y, c, a = 255) { for (const ch of String(s)) { const g = DIG[ch]; for (let i = 0; i < 15; i++) if (g[i] === '1') put(buf, x + (i % 3), y + ((i / 3) | 0), c, a); x += 4; } }
function dialMarks(buf, s, n, labels, c, a) {
  for (let i = 0; i <= n; i++) {
    const ang = (225 - 270 * i / n) * Math.PI / 180, major = i % 2 === 0, co = Math.cos(ang), si = -Math.sin(ang);
    line(buf, s.x + co * (s.r - 2), s.y + si * (s.r - 2), s.x + co * (s.r - (major ? 6 : 4)), s.y + si * (s.r - (major ? 6 : 4)), c, a);
    if (major && labels[i / 2] !== undefined) { const t = String(labels[i / 2]); text(buf, t, Math.round(s.x + co * (s.r - 12) - t.length * 2 + 0.5), Math.round(s.y + si * (s.r - 12) - 2), c, a); }
  }
  // redline on tacho
}
const PALE = [200, 196, 188];
dialMarks(cock, spots.speedo, 12, [0, 4, 8, 12, 16, 20, 24], PALE, 230);
dialMarks(cock, spots.tacho, 16, [0, 1, 2, 3, 4, 5, 6, 7, 8], PALE, 230);
for (const s of smalls) for (let i = 0; i <= 4; i++) { const ang = (200 - 220 * i / 4) * Math.PI / 180; put(cock, s.x + Math.cos(ang) * (s.r - 2), s.y - Math.sin(ang) * (s.r - 2), PALE); }
// tiny odometer windows under each dial
const odos = [[spots.speedo.x - 9, spots.speedo.y + 16, 19, 7], [spots.tacho.x - 9, spots.tacho.y + 16, 19, 7]];
for (const [x, y, w, h] of odos) rect(x, y, w, h, () => [14, 14, 18]);

// 6. A-pillars, roof header, side window frame
region((x, y) => y >= 14 && y < dashY(x) + 6 && ((x >= pillL(y)[0] && x <= pillL(y)[1]) || (x >= pillR(y)[0] && x <= pillR(y)[1])), (x, y) => {
  const [a, b] = x < W / 2 ? pillL(y) : pillR(y), t = (x - a) / (b - a), edge = x < W / 2 ? t : 1 - t;
  return mat([46, 43, 54], 0.75 + edge * 0.45, x, y, 6);
});
// door frame below the side window (outside the pillars)
region((x, y) => y > dashY(x) - 30 && y < 216 && (x < pillL(y)[0] || x > pillR(y)[1]), (x, y) => mat(PLD, 0.8, x, y));
rect(0, 0, W, 14, (x, y) => mat([50, 47, 58], 0.7 + y / 30, x, y, 5));
rect(0, 12, W, 2, (x, y) => mat([50, 47, 58], 1.35, x, y, 3));
// sun visor hint corners
poly([[30, 14], [190, 14], [184, 22], [40, 22]], (x, y) => mat([60, 56, 66], 0.9 + (22 - y) / 30, x, y, 5));
poly([[450, 14], [610, 14], [600, 22], [456, 22]], (x, y) => mat([60, 56, 66], 0.9 + (22 - y) / 30, x, y, 5));

// 7. rear-view mirror
rect(314, 14, 12, 10, (x, y) => mat(PLD, 0.9, x, y));
const MX = 262, MY = 22, MW = 116, MH = 32;
region((x, y) => { const dx = Math.max(0, Math.abs(x - (MX + MW / 2)) - (MW / 2 - 8)), dy = Math.max(0, Math.abs(y - (MY + MH / 2)) - (MH / 2 - 8)); return dx * dx + dy * dy <= 64; },
  (x, y) => mat([36, 34, 42], 1.0 + (MY - y) / 80, x, y, 4), rid++, MX, MY, MX + MW, MY + MH);
region((x, y) => { const dx = Math.max(0, Math.abs(x - (MX + MW / 2)) - (MW / 2 - 12)), dy = Math.max(0, Math.abs(y - (MY + MH / 2)) - (MH / 2 - 10)); return dx * dx + dy * dy <= 16; },
  (x, y) => { const sky = (y - MY) / MH; const streak = ((x - y * 1.2) % 22 + 22) % 22 < 3 ? 0.18 : 0; return mat([96, 100, 124], 0.55 + (1 - sky) * 0.35 + streak, x, y, 3); }, rid++, MX, MY, MX + MW, MY + MH);

// 8. steering wheel
const Wc = spots.wheel, RIM = 12;
const wheelShade = (x, y) => { // leather rim, lit from above, stitch line on the inner edge
  const d = Math.hypot(x - Wc.x, y - Wc.y), t = (d - (Wc.r - RIM)) / RIM, ang = Math.atan2(y - Wc.y, x - Wc.x);
  const round = 1 - Math.abs(t - 0.4) * 1.2, top = (Wc.y - y) / Wc.r * 0.25;
  let c = mat(LEA, 0.65 + round * 0.55 + top, x, y, 10);
  if (Math.abs(t - 0.15) < 0.06 && Math.round(ang * 160) % 3 === 0) c = [96, 90, 92];
  return c;
};
ring(Wc.x, Wc.y, Wc.r - RIM, Wc.r, wheelShade);
// spokes (3: left, right, bottom)
const spoke = (p) => poly(p, (x, y) => mat([50, 48, 56], 1.05 - (y - 290) / 70, x, y, 6));
spoke([[Wc.x - Wc.r + 8, Wc.y - 8], [Wc.x - 20, Wc.y - 14], [Wc.x - 20, Wc.y + 14], [Wc.x - Wc.r + 10, Wc.y + 10]]);
spoke([[Wc.x + Wc.r - 8, Wc.y - 8], [Wc.x + 20, Wc.y - 14], [Wc.x + 20, Wc.y + 14], [Wc.x + Wc.r - 10, Wc.y + 10]]);
spoke([[Wc.x - 16, Wc.y + 10], [Wc.x + 16, Wc.y + 10], [Wc.x + 12, Wc.y + Wc.r - 6], [Wc.x - 12, Wc.y + Wc.r - 6]]);
disc(Wc.x, Wc.y + 2, 28, (x, y) => mat([46, 44, 52], 1.25 - Math.hypot(x - Wc.x + 6, y - Wc.y + 14) / 40, x, y, 5)); // hub
rect(Wc.x - 7, Wc.y - 4, 14, 8, (x, y) => mat(MET, 1.1 - (y - Wc.y + 4) / 10, x, y, 3)); // badge
// a horn-pad seam
ring(Wc.x, Wc.y + 2, 20, 21, () => [30, 28, 34]);

// 9. hands in fingerless gloves at 10 and 2 o'clock
// capsule from (x0,y0) to (x1,y1) with a 1px dark outline; shader gets (x,y,t along 0..1, edge 0..1)
function capsule(x0, y0, x1, y1, r, shader, id) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  for (let y = Math.floor(Math.min(y0, y1) - r - 2); y <= Math.max(y0, y1) + r + 2; y++) for (let x = Math.floor(Math.min(x0, x1) - r - 2); x <= Math.max(x0, x1) + r + 2; x++) {
    const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / L2)), d = Math.hypot(x + 0.5 - x0 - dx * t, y + 0.5 - y0 - dy * t);
    if (d <= r + 1) { put(cock, x, y, d > r ? [18, 14, 14] : shader(x, y, t, d / r)); if (x >= 0 && y >= 0 && x < W && y < H) reg[y * W + x] = id; }
  }
}
function hand(deg, mirror) {
  const a = deg * Math.PI / 180, hx = Wc.x + Math.cos(a) * (Wc.r - RIM / 2), hy = Wc.y - Math.sin(a) * (Wc.r - RIM / 2);
  const s = mirror ? -1 : 1, toC = Math.atan2(Wc.y - hy, Wc.x - hx), perp = toC + Math.PI / 2, cx = Math.cos(toC), cy = Math.sin(toC);
  // sleeve / forearm to the bottom corner, behind the hand
  const ex = hx - s * 60, ey = H + 30;
  capsule(ex, ey, hx - cx * 14, hy - cy * 14 + 10, 17, (x, y, t, e) => mat([62, 66, 84], 0.95 - e * 0.35 + Math.sin((x + y) / 7) * 0.05 - (1 - t) * 0.15, x, y, 8), rid++);
  capsule(hx - cx * 16, hy - cy * 16 + 12, hx - cx * 10, hy - cy * 10 + 8, 13, (x, y, t, e) => mat(GLOVE, 0.85 - e * 0.3, x, y, 4), rid++); // glove cuff
  // back of the hand (glove leather), sitting over the rim
  const bx = hx - cx * 4, by = hy - cy * 4 + 2;
  capsule(bx - Math.cos(perp) * 7, by - Math.sin(perp) * 7, bx + Math.cos(perp) * 7, by + Math.sin(perp) * 7, 12, (x, y, t, e) => {
    const hl = Math.hypot(x - bx + s * 4, y - by + 4) < 5 ? 0.5 : 0;
    return mat(GLOVE, 1.15 - e * 0.45 + (by - y) / 40 + hl, x, y, 6);
  }, rid++);
  for (let k = -1; k <= 1; k++) put(cock, bx - cx * 2 + Math.cos(perp) * k * 4, by - cy * 2 + Math.sin(perp) * k * 4 + 4, [16, 12, 12]); // glove vent holes
  // thumb: on the inner side, along the rim upward
  const tdir = toC + s * -1.25, tx0 = bx + Math.cos(perp) * -s * 8 + cx * 4, ty0 = by + Math.sin(perp) * -s * 8 + cy * 4;
  capsule(tx0, ty0, tx0 + Math.cos(tdir) * 13, ty0 + Math.sin(tdir) * 13, 3.6, (x, y, t, e) => t > 0.55 ? mat(SKIN, 1.15 - e * 0.4, x, y, 5) : mat(GLOVE, 1.05 - e * 0.35, x, y, 5), rid++);
  // four fingers wrapping the rim toward the centre: glove up to the knuckle, then bare fingertips
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * 6.6 + s * 2, len = f === 0 || f === 3 ? 12 : 14;
    const fx0 = bx + Math.cos(perp) * off + cx * 6, fy0 = by + Math.sin(perp) * off + cy * 6;
    const fx1 = fx0 + cx * len, fy1 = fy0 + cy * len;
    capsule(fx0, fy0, fx1, fy1, 3.1, (x, y, t, e) => {
      if (t < 0.45) return mat(GLOVE, 1.25 - e * 0.45 + (t < 0.2 ? 0.25 : 0), x, y, 5); // knuckle highlight
      if (t < 0.5) return [26, 20, 20]; // glove edge
      return mat(SKIN, 1.15 - e * 0.4 - (t > 0.92 ? 0.15 : 0), x, y, 6);
    }, rid++);
    put(cock, fx1 - cx * 2 - Math.cos(perp), fy1 - cy * 2 - Math.sin(perp), [246, 214, 190]); // nail glint
  }
}
hand(150, false);
hand(30, true);

// 10. bevel pass: highlight top edges of regions, shade bottom edges
const src = cock.slice();
for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; if (!src[i * 4 + 3]) continue;
  const up = reg[i - W], dn = reg[i + W], me = reg[i];
  let d = 0;
  if (up !== me || !src[(i - W) * 4 + 3]) d += 22;
  if (dn !== me) d -= 20;
  if (d) for (let k = 0; k < 3; k++) cock[i * 4 + k] = clamp(src[i * 4 + k] + d);
}

// ---- glow frame (emissive only, aligned with the cockpit frame) ----
const AMB = [255, 150, 40];
function halo(x, y, r, c, a) { for (let py = y - r; py <= y + r; py++) for (let px = x - r; px <= x + r; px++) { const d = Math.hypot(px - x, py - y) / r; if (d < 1) put(glow, px, py, c, a * (1 - d) ** 2); } }
for (const s of [spots.speedo, spots.tacho]) halo(s.x, s.y, s.r + 6, AMB, 60);
dialMarks(glow, spots.speedo, 12, [0, 4, 8, 12, 16, 20, 24], AMB, 255);
dialMarks(glow, spots.tacho, 16, [0, 1, 2, 3, 4, 5, 6, 7, 8], AMB, 255);
for (let i = 13; i <= 16; i++) { const ang = (225 - 270 * i / 16) * Math.PI / 180, s = spots.tacho; line(glow, s.x + Math.cos(ang) * (s.r - 2), s.y - Math.sin(ang) * (s.r - 2), s.x + Math.cos(ang) * (s.r - 4), s.y - Math.sin(ang) * (s.r - 4), [255, 50, 30]); }
for (const s of smalls) { halo(s.x, s.y, s.r + 3, AMB, 40); for (let i = 0; i <= 4; i++) { const ang = (200 - 220 * i / 4) * Math.PI / 180; put(glow, s.x + Math.cos(ang) * (s.r - 2), s.y - Math.sin(ang) * (s.r - 2), AMB); } }
// odometers: orange digits
text(glow, '0472', odos[0][0] + 2, odos[0][1] + 1, [255, 140, 30]);
text(glow, '1188', odos[1][0] + 2, odos[1][1] + 1, [255, 140, 30]);
// trip computer: segments
rect; for (let k = 0; k < 6; k++) { const v = String((7 + k * 3) % 10); text(glow, v, 330 + k * 8, 243, [255, 150, 40]); }
halo(352, 246, 30, AMB, 30);
// radio display: dark teal inner rect (the game writes there) + faint halo around it
for (let y = spots.radio.y; y < spots.radio.y + spots.radio.h; y++) for (let x = spots.radio.x; x < spots.radio.x + spots.radio.w; x++) put(glow, x, y, [10, 60, 64], 120);
for (let x = spots.radio.x - 2; x < spots.radio.x + spots.radio.w + 2; x++) { put(glow, x, spots.radio.y - 3, [40, 200, 200], 50); put(glow, x, spots.radio.y + spots.radio.h + 2, [40, 200, 200], 50); }
// LEDs: hazard, presets, climate, warning lamps (dim when off; indicators left to the game)
const leds = [[352, 225, [255, 60, 40]], [307, 293, [60, 255, 100]], [325, 293, [255, 170, 40]], [310, 305, [255, 170, 40]], [394, 305, [60, 255, 100]],
  [100, 284, [255, 60, 40]], [112, 284, [255, 170, 40]], [190, 284, [255, 170, 40]], [202, 284, [255, 60, 40]], [356, 306, [255, 60, 40]], [30, 257, [255, 170, 40]], [W - 30, 257, [255, 170, 40]]];
for (const [x, y, c] of leds) { halo(x, y, 6, c, 70); put(glow, x, y, c); put(glow, x + 1, y, c); put(glow, x, y - 1, c, 180); }
// gear selector backlight
text(glow, '5', 359, 314, AMB, 180);

// ---- write PNG + JSON ----
const sheet = Buffer.alloc(W * 720 * 4);
Buffer.from(cock.buffer).copy(sheet, 0); Buffer.from(glow.buffer).copy(sheet, W * H * 4);
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// self-check: windscreen centre transparent, dash opaque, mirror opaque
const A = (x, y) => cock[(y * W + x) * 4 + 3];
console.assert(A(200, 120) === 0 && A(450, 150) === 0, 'windscreen must be transparent');
console.assert(A(320, WB + 4) === 255 && A(320, 38) === 255, 'dash and mirror must be opaque');
writeFileSync(join(OUT, 'cockpit.png'), png(W, 720, sheet));
writeFileSync(join(OUT, 'cockpit.json'), JSON.stringify({ image: 'cockpit.png', frames: { cockpit: { x: 0, y: 0, w: 640, h: 360, ax: 0, ay: 0 }, glow: { x: 0, y: 360, w: 640, h: 360, ax: 0, ay: 0 } }, anims: {}, spots }, null, 1));
console.log('wrote', join(OUT, 'cockpit.png'), JSON.stringify(spots));
void rnd;
