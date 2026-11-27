// make-buildings.mjs: paints the building/nature sprite sheet as voxels seen in 2:1 isometric.
// Run: node tools/make-buildings.mjs  -> art/buildings.png + art/buildings.json (no deps).
// World units: X along the left-front edge (left corner -> bottom corner), Y along the right-front edge
// (bottom corner -> right corner... seen as Y=0 front-left face, X=16 front-right face), Z up in px.
// Screen: x = X + Y, y = 8 + (X - Y)/2 - Z, so the footprint [0,16]^2 is exactly the 32x16 diamond.
import fs from 'fs';
import zlib from 'zlib';

const ART = new URL('../art/', import.meta.url).pathname;
const SEED = 7331;

// ---------- noise ----------
function hash(a, b = 0, c = 0, s = 0) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1440662683) + Math.imul(SEED + s, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function noise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const sm = t => t * t * (3 - 2 * t);
  const u = sm(fx), v = sm(fy), w = sm(fz);
  const L = (a, b, t) => a + (b - a) * t;
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k, s);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v),
           L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- materials: 5-tone ramps, deep shadow -> highlight ----------
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const R = s => s.split(' ').map(hex);
const RAMP = {
  straw: R('#3b2a14 #6e4f22 #a07a35 #c9a24e #e8cf7c'),
  straw2: R('#33260f #5e4a1e #8a7030 #b09448 #d2bc70'),
  wood: R('#24160d #4a2f1d #6e4b2c #93693c #b48c56'),
  plaster: R('#4a4038 #84775f #b3a588 #d4c6a4 #ece0c0'),
  plaster2: R('#43363a #7c6560 #a88a7a #c8ab92 #e4cdb0'),
  stone: R('#26262b #48474b #6e6b66 #96907f #bdb5a0'),
  stone2: R('#2a2620 #4c463a #706650 #988a6a #bcae88'),
  brick: R('#36140f #66281c #903e28 #b25a3a #cc7c56'),
  brick2: R('#2e1a14 #553226 #7c4a34 #9e664a #bc8866'),
  slate: R('#181c24 #2b3240 #414b5c #5a667a #7f8aa0'),
  concrete: R('#29292a #4a4b4a #6e6f6a #94948b #b8b6aa'),
  rust: R('#2a1209 #552811 #80401b #a5622b #c48a4a'),
  moss: R('#132011 #243d1b #3a5e25 #578631 #80ab47'),
  leaf: R('#0f1f10 #1d3b19 #305c28 #4a8634 #7ab44c'),
  leaf2: R('#13200c #2a4214 #46681e #6a922c #9cbc48'),
  pine: R('#0a1913 #142d27 #1f4637 #2f6044 #4a8556'),
  birchleaf: R('#21401a #3b6621 #5f922d #8cbc44 #bde06c'),
  autumnA: R('#381307 #6c290c #aa4c14 #dc7c22 #f6b648'),
  autumnB: R('#2e0b10 #5c1820 #902838 #c2483a #e87e56'),
  autumnC: R('#33240a #66480e #9a7414 #cca22a #f0d058'),
  bark: R('#1e140c #3a2818 #563c24 #6e5030 #8a6840'),
  birch: R('#36342f #7a786e #b8b6aa #dcdad0 #f8f8f0'),
  void: R('#08090c #101318 #1a1e26 #262c36 #343c4a'),
  wing: R('#140e08 #22180e #322414 #42301c #524026'),
  glass: R('#14222e #24405a #3c6a8a #6aa0bc #bce4f0'),
  white: R('#545a60 #959ca0 #c2c8ca #e0e4e2 #f8faf6'),
  solar: R('#0a1230 #16255a #223c88 #3660ac #6a98dc'),
  dstone: R('#100c18 #1e182a #30263c #463852 #604e72'),
  violet: R('#260a3a #4c1872 #7a2eaa #ac5cdc #dca4ff'),
  teal: R('#052628 #0b4646 #137670 #28ac9c #78e6d4'),
  brass: R('#281806 #56380f #86601e #b48c36 #e6c466'),
  clothR: R('#3a0c0c #6e1a16 #a42c20 #cc4a30 #ec7a50'),
  clothB: R('#0c1a36 #183062 #24508c #3a76b4 #6aa4d8'),
  clothG: R('#0e2614 #1a4422 #2a6a32 #44904a #74b870'),
  clothY: R('#3a2a08 #6e520e #a8801a #d4aa30 #f2d262'),
  cream: R('#4a4234 #8a8068 #bcb294 #ddd4b4 #f6f0d4'),
  fruitR: R('#3a0808 #741410 #b02418 #e04a28 #ff8a5a'),
  green: R('#0c2410 #18441c #28682a #3c8e3a #6ab852'),
  water: R('#081828 #10304c #1c4c72 #2e7098 #5aa0c4'),
  iron: R('#121418 #22262c #363b44 #4c525c #6c747e'),
  rock: R('#1e1e22 #3a3a3c #5a5852 #7e7a6e #a4a090'),
  rock2: R('#22201e #403a34 #625a4e #887c68 #aea088'),
  clock: R('#3a3628 #7a745c #c4bc98 #e4dcb8 #fcf6dc'),
};
// window glow colours for the _lit frames
const LIT = { warm: R('#7a2c08 #c25a14 #f08c2a #ffbc52 #ffe08a'), cool: R('#2a5a6a #4a9ab0 #8ad8ea #c8f4fc #f4ffff'),
  violet: R('#40106a #7a2ab4 #b05ae8 #d898ff #f4d4ff'), teal: R('#0a4a4a #1a8a80 #3ac8b4 #8af0e0 #d4fff6') };

// material table: id -> {ramp, tex(X,Y,Z,u), lit}
const MAT = [null];
const MID = {};
function mat(name, ramp, tex = null, lit = null) { MID[name] = MAT.length; MAT.push({ name, ramp: RAMP[ramp], tex, lit }); }
const fl = Math.floor;
const fr = (a, m) => ((a % m) + m) % m;
mat('straw', 'straw', (X, Y, Z, u) => (hash(fl(u * 1.5), fl(Z / 3)) - .5) * 1.3 + (fr(Z + (X - Y) * .25, 3) < .7 ? -.8 : 0) + (noise(u * .3, Z * .3, 0, 3) - .5));
mat('straw2', 'straw2', (X, Y, Z, u) => (hash(fl(u * 1.5), fl(Z / 3), 1) - .5) * 1.3 + (fr(Z + (X - Y) * .25, 3) < .7 ? -.8 : 0) + (noise(u * .3, Z * .3, 0, 4) - .5));
mat('wood', 'wood', (X, Y, Z, u) => (hash(fl(u), fl(Z / 4), 2) - .5) * .8 + (fr(u, 2) < .5 ? -.4 : 0));
mat('beam', 'wood', (X, Y, Z, u) => -.6 + (hash(fl(u * 2), fl(Z * 2), 3) - .5) * .6);
mat('plaster', 'plaster', (X, Y, Z, u) => (noise(u * .5, Z * .5, 0, 5) - .5) * 1.4 + (hash(fl(u * 2), fl(Z * 2), 4) < .06 ? -1 : 0));
mat('plaster2', 'plaster2', (X, Y, Z, u) => (noise(u * .5, Z * .5, 0, 6) - .5) * 1.4 + (hash(fl(u * 2), fl(Z * 2), 5) < .06 ? -1 : 0));
const blocks = (u, Z, bw, bh, s) => { const row = fl(Z / bh); const uu = u + (row & 1) * bw / 2; const mort = fr(Z, bh) < .6 || fr(uu, bw) < .6; return mort ? -1.1 : (hash(fl(uu / bw), row, s) - .5) * 1.2; };
mat('stone', 'stone', (X, Y, Z, u) => blocks(u, Z, 4, 3, 7) + (noise(u * .4, Z * .4, 0, 7) - .5));
mat('stone2', 'stone2', (X, Y, Z, u) => blocks(u, Z, 5, 3, 8) + (noise(u * .4, Z * .4, 0, 8) - .5));
mat('brick', 'brick', (X, Y, Z, u) => blocks(u, Z, 3, 2, 9) * .8 + (noise(u * .3, Z * .3, 0, 9) - .5) * .8);
mat('brick2', 'brick2', (X, Y, Z, u) => blocks(u, Z, 3, 2, 10) * .8 + (noise(u * .3, Z * .3, 0, 10) - .5) * .8);
mat('slate', 'slate', (X, Y, Z, u) => (fr(Z + (X - Y) * .5, 2) < .6 ? -1 : 0) + (hash(fl((u + fl(Z / 2) * 1.5) / 3), fl(Z / 2), 11) - .5) * 1.2);
mat('concrete', 'concrete', (X, Y, Z, u) => (noise(u * .4, Z * .4, X * .3, 12) - .5) * 1.6 + (fr(Z, 8) < .5 ? -.7 : 0) + (hash(fl(u * 2), fl(Z * 2), 12) < .08 ? -1 : 0));
mat('rust', 'rust', (X, Y, Z, u) => (noise(u * .6, Z * .6, X, 13) - .5) * 2);
mat('moss', 'moss', (X, Y, Z, u) => (hash(fl(u * 2), fl(Z * 2), 14) - .5) * 1.6);
mat('vine', 'leaf', (X, Y, Z, u) => (hash(fl(u * 2), fl(Z * 2), 15) - .5) * 1.8);
for (const k of ['leaf', 'leaf2', 'pine', 'birchleaf', 'autumnA', 'autumnB', 'autumnC'])
  mat(k, k, (X, Y, Z) => (hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 16) - .5) * 1.6 + (noise(X * .4, Y * .4, Z * .4, 17) - .5) * 1.6);
mat('bark', 'bark', (X, Y, Z, u) => (hash(fl(u * 2), fl(Z / 2), 18) - .5) * 1.4);
mat('birch', 'birch', (X, Y, Z, u) => (hash(fl(u), fl(Z), 19) < .18 ? -2.5 : 0));
mat('void', 'void', () => 0);
mat('win', 'wing', () => 0, 'warm');
mat('winc', 'glass', (X, Y, Z, u) => (fr(u - Z * .7, 7) < 1.4 ? 1.2 : 0), 'cool');
mat('glass', 'glass', (X, Y, Z, u) => (fr(u - Z * .7, 7) < 1.4 ? 1.2 : 0) + (fr(Z, 5) < .5 ? -1 : 0));
mat('glassbroken', 'glass', (X, Y, Z, u) => (hash(fl(u), fl(Z), 20) - .5) * 2.4 - .6);
mat('white', 'white', (X, Y, Z, u) => (noise(u * .3, Z * .3, 0, 21) - .5) * .8 + (fr(Z, 10) < .5 ? -.8 : 0));
mat('solar', 'solar', (X, Y) => (fr(X, 2.5) < .5 || fr(Y, 2.5) < .5 ? -1.4 : .3));
mat('dstone', 'dstone', (X, Y, Z, u) => blocks(u, Z, 4, 3, 22) + (noise(u * .4, Z * .4, 0, 22) - .5));
mat('violet', 'violet', (X, Y, Z, u) => (fr(u + Z, 4) < 1 ? 1.3 : 0), 'violet');
mat('teal', 'teal', (X, Y, Z, u) => (fr(u - Z, 4) < 1 ? 1.3 : 0), 'teal');
mat('brass', 'brass', (X, Y, Z, u) => (hash(fl(u * 2), fl(Z * 2), 23) - .5) * .8);
mat('clothR', 'clothR', () => 0); mat('clothB', 'clothB', () => 0); mat('clothG', 'clothG', () => 0); mat('clothY', 'clothY', () => 0);
mat('cream', 'cream', () => 0);
mat('fruitR', 'fruitR', (X, Y, Z) => (hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 24) - .5) * 2);
mat('fruitY', 'clothY', (X, Y, Z) => (hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 25) - .5) * 2);
mat('green', 'green', (X, Y, Z) => (hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 26) - .5) * 1.8);
mat('water', 'water', (X, Y) => (fr(X + Y * .5, 3) < .5 ? 1 : 0));
mat('iron', 'iron', (X, Y, Z, u) => (hash(fl(u), fl(Z), 27) - .5) * .8);
mat('rock', 'rock', (X, Y, Z) => (noise(X * .5, Y * .5, Z * .5, 28) - .5) * 2.2 + (hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 28) - .5) * .8);
mat('rock2', 'rock2', (X, Y, Z) => (noise(X * .5, Y * .5, Z * .5, 29) - .5) * 2.2 + (hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 29) - .5) * .8);
mat('clock', 'clock', () => 0);
mat('hand', 'iron', () => -2);

// ---------- renderer ----------
const S = 0.5; // voxel size
const BUFW = 96, BUFH = 140, OX = 32, BY = 132; // diamond left corner at (OX, BY-8)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - .5);
const LV = (() => { const v = [-0.35, -0.75, 1]; const l = Math.hypot(...v); return v.map(a => a / l); })();

function render(spec) {
  const { solid, zmax = 80, lo = -8, hi = 24 } = spec;
  const nx = Math.round((hi - lo) / S), nz = Math.round(zmax / S) + 2;
  const grid = new Uint8Array(nx * nx * nz);
  const at = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= nx || k >= nz) ? 0 : grid[(k * nx + j) * nx + i];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) {
    const m = solid(lo + (i + .5) * S, lo + (j + .5) * S, (k + .5) * S);
    if (m) grid[(k * nx + j) * nx + i] = typeof m === 'number' ? m : MID[m];
  }
  const col = new Uint8ClampedArray(BUFW * BUFH * 4), depth = new Float32Array(BUFW * BUFH).fill(-1e9);
  const mid = new Uint8Array(BUFW * BUFH), lit = new Uint8ClampedArray(BUFW * BUFH * 4);
  for (let k = 0; k < nz; k++) for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) {
    const m = grid[(k * nx + j) * nx + i]; if (!m) continue;
    if (at(i, j, k + 1) && at(i, j - 1, k) && at(i + 1, j, k)) continue; // hidden
    const X = lo + (i + .5) * S, Y = lo + (j + .5) * S, Z = (k + .5) * S;
    const sx = fl(OX + X + Y), sy = fl(BY - 8 + (X - Y) / 2 - Z);
    if (sx < 0 || sy < 0 || sx >= BUFW || sy >= BUFH) continue;
    const d = X - Y + 2 * Z, p = sy * BUFW + sx;
    if (d <= depth[p]) continue;
    // normal from empty neighbours at distance 2 cells
    let n0 = 0, n1 = 0, n2 = 0;
    for (let c = -2; c <= 2; c += 2) for (let b = -2; b <= 2; b += 2) for (let a = -2; a <= 2; a += 2)
      if ((a || b || c) && !at(i + a, j + b, k + c)) { n0 += a; n1 += b; n2 += c; }
    // immediate faces dominate so thin walls read crisp
    if (!at(i, j, k + 1)) n2 += 3; if (!at(i, j - 1, k)) n1 -= 3; if (!at(i + 1, j, k)) n0 += 3;
    const nl = Math.hypot(n0, n1, n2) || 1;
    let b = Math.max(0, (n0 * LV[0] + n1 * LV[1] + n2 * LV[2]) / nl);
    const M = MAT[m];
    const u = Math.abs(n1) > Math.abs(n0) ? X : Y; // horizontal coordinate along the visible wall
    let t = .55 + b * 3.2 + (M.tex ? M.tex(X, Y, Z, u + (Math.abs(n1) > Math.abs(n0) ? 0 : 16)) : 0);
    if (Z < 1.5) t -= .7; // ground contact occlusion
    t += BAYER[(sy & 3) * 4 + (sx & 3)] * .9;
    const ti = Math.max(0, Math.min(4, fl(t)));
    const c = M.ramp[ti];
    depth[p] = d; mid[p] = m;
    col[p * 4] = c[0]; col[p * 4 + 1] = c[1]; col[p * 4 + 2] = c[2]; col[p * 4 + 3] = 255;
    if (M.lit) { const lc = LIT[M.lit][Math.max(1, Math.min(4, ti + 2))]; lit[p * 4] = lc[0]; lit[p * 4 + 1] = lc[1]; lit[p * 4 + 2] = lc[2]; lit[p * 4 + 3] = 255; }
    else { lit[p * 4 + 3] = 0; }
  }
  // outlines: edge pixels and depth breaks get a dark tint of their own material
  const out = new Uint8ClampedArray(col);
  for (let y = 0; y < BUFH; y++) for (let x = 0; x < BUFW; x++) {
    const p = y * BUFW + x; if (!col[p * 4 + 3]) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let edge = false, brk = false;
    for (const [dx, dy] of nb) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= BUFW || yy >= BUFH || !col[(yy * BUFW + xx) * 4 + 3]) { edge = true; break; }
      if (depth[yy * BUFW + xx] - depth[p] > 6 && dy >= 0) brk = true;
    }
    if (edge || brk) {
      const dk = MAT[mid[p]].ramp[0], f = edge ? .7 : .9;
      out[p * 4] = dk[0] * f; out[p * 4 + 1] = dk[1] * f; out[p * 4 + 2] = dk[2] * f + 6;
      if (edge) lit[p * 4 + 3] = 0;
    }
  }
  return { col: out, lit, hasLit: lit.some((v, i) => (i & 3) === 3 && v) };
}

function crop(buf, x0, y0, w, h) {
  const o = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * BUFW + x0 + x) * 4, d = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) o[d + c] = buf[s + c];
  }
  return o;
}

// ---------- shape helpers ----------
const inBox = (X, Y, Z, x0, x1, y0, y1, z0, z1) => X >= x0 && X < x1 && Y >= y0 && Y < y1 && Z >= z0 && Z < z1;
// window grid on the two visible faces of box [x0,x1]x[y0,y1]: returns 0 (recess), winMat (glass), or null
function win(X, Y, Z, b, o) {
  const { du = 5, w = 2, dz = 8, h = 3, z0 = 3, z1 = 999, off = 1.5, m = 'win', deep = 1 } = o;
  if (Z < z0 || Z > z1) return null;
  const onL = Y - b[2] < 1.6, onR = b[1] - X < 1.6;
  if (!onL && !onR) return null;
  const u = onL ? X - b[0] : Y - b[2];
  const span = onL ? b[1] - b[0] : b[3] - b[2];
  if (u < 1 || u > span - 1) return null;
  if (fr(u - off, du) < w && fr(Z - z0, dz) < h) {
    const dist = onL ? Y - b[2] : b[1] - X;
    return dist < deep * .5 ? 0 : m;
  }
  return null;
}
const gableZ = (Y, base, rise, y0, y1) => base + rise * (1 - Math.abs(Y - (y0 + y1) / 2) / ((y1 - y0) / 2));
const gableZX = (X, base, rise, x0, x1) => base + rise * (1 - Math.abs(X - (x0 + x1) / 2) / ((x1 - x0) / 2));
const hipZ = (X, Y, base, rise, x0, x1, y0, y1) => base + rise * Math.min(1 - Math.abs(Y - (y0 + y1) / 2) / ((y1 - y0) / 2), (1 - Math.abs(X - (x0 + x1) / 2) / ((x1 - x0) / 2)) * 1.6);
const cyl = (X, Y, cx, cy, r) => (X - cx) ** 2 + (Y - cy) ** 2 < r * r;

// timber-framed hut
function hut({ x0 = 2, x1 = 14, y0 = 3, y1 = 13, wall = 12, rise = 12, roof = 'straw', walls = 'plaster', hip = false, ridgeX = true, stoneBase = 3, door = true }) {
  const b = [x0, x1, y0, y1];
  return (X, Y, Z) => {
    const rz = hip ? hipZ(X, Y, wall, rise, x0 - 1.5, x1 + 1.5, y0 - 1.5, y1 + 1.5)
      : ridgeX ? gableZ(Y, wall, rise, y0 - 1.5, y1 + 1.5) : gableZX(X, wall, rise, x0 - 1.5, x1 + 1.5);
    // roof shell with overhang and ragged eaves
    if (X >= x0 - 1.5 && X < x1 + 1.5 && Y >= y0 - 1.5 && Y < y1 + 1.5 && Z < rz && Z > rz - 2.2 && Z > wall - 1.5 - hash(fl(X * 2), fl(Y * 2), 40) * 1.2) return roof;
    if (inBox(X, Y, Z, x0, x1, y0, y1, 0, wall + rise)) {
      if (Z >= rz - 1) return 0;
      const onL = Y - y0 < 1, onR = x1 - X < 1;
      if (door && onL && Math.abs(X - (x0 + x1) / 2 + 2) < 1.5 && Z < 7) return Y - y0 < .5 ? 0 : 'wood';
      const w = win(X, Y, Z, b, { du: 5, w: 2, dz: 99, h: 3, z0: 5.5, off: 1.5 });
      if (w !== null && !(onL && Math.abs(X - (x0 + x1) / 2 + 2) < 2.5)) return w;
      if (Z < stoneBase) return 'stone';
      if (Z >= wall) return walls === 'stone' ? 'stone' : 'plaster'; // gable end
      if (walls === 'stone') return 'stone2';
      const u = onL ? X - x0 : Y - y0, span = onL ? x1 - x0 : y1 - y0;
      if (u < .8 || u > span - .8 || Z > wall - 1 || fr(u, 6) < .8 || (Z < 7 && Z > 6) || Math.abs(fr(u, 6) - 3 - (Z - 3) * .6) < .5 && Z < 7) return 'beam';
      return walls;
    }
    return 0;
  };
}

function union(...fs) { return (X, Y, Z) => { for (const f of fs) { const m = f(X, Y, Z); if (m) return m; } return 0; }; }

// ---------- ruins ----------
function ruinTower(seed, h, w0, w1) {
  const b = [w0, w1, w0, w1];
  return (X, Y, Z) => {
    const top = h - 14 * noise(X * .25, Y * .25, 0, seed) - (X + (16 - Y)) * .5 * hash(seed);
    const rebar = (fr(X, 3) < .5 && fr(Y, 3) < .5) && Z < top + 4 + hash(fl(X), fl(Y), seed) * 4 && Z >= top - 1;
    if (!inBox(X, Y, Z, w0, w1, w0, w1, 0, h + 6)) return 0;
    if (Z > top) return rebar && (Y - w0 < 1 || w1 - X < 1) ? 'rust' : 0;
    // hollow core so broken top shows depth
    if (X > w0 + 1.5 && X < w1 - 1.5 && Y > w0 + 1.5 && Y < w1 - 1.5 && Z > top - 6) return 0;
    const w = win(X, Y, Z, b, { du: 3, w: 2, dz: 5, h: 3, z0: 4, off: .5, m: hash(fl(X), fl(Y), fl(Z / 5), seed) < .12 ? 'glassbroken' : 'void', deep: 2 });
    if (w !== null) return w;
    const vine = noise(X * .5 + Y * .5, Z * .12, 0, seed + 1);
    if ((Y - w0 < 1 || w1 - X < 1) && vine > .62 - Z * .004 && Z < h * .8) return 'vine';
    if (Z > top - 1.2 && noise(X * .6, Y * .6, 3, seed) > .45) return 'moss';
    if (Z < 2 + 3 * noise(X * .4, Y * .4, 9, seed)) return 'moss';
    return (noise(X * .3, Z * .2, Y * .3, seed + 2) > .7) ? 'rust' : 'concrete';
  };
}
function rubble(seed) { return (X, Y, Z) => { const r = 3 * noise(X * .5, Y * .5, 0, seed) - 1 - (Math.hypot(X - 8, Y - 8) > 8 ? 9 : 0); return Z < r ? (noise(X, Y, Z, seed) > .5 ? 'concrete' : 'moss') : 0; }; }

const SPR = [];
const add = (name, solid, zmax = 80, extra = {}) => SPR.push({ name, solid, zmax, ...extra });

add('ruin_tower_a', union(ruinTower(1, 76, 2, 14), rubble(1)), 84);
add('ruin_tower_b', union(ruinTower(2, 62, 3, 14), rubble(2)), 70);
add('ruin_block', union((X, Y, Z) => {
  const top = 20 - 10 * noise(X * .3, Y * .3, 0, 5) - X * .3;
  if (!inBox(X, Y, Z, 1, 15, 2, 14, 0, 22) || Z > top) return 0;
  if (X > 3 && X < 13 && Y > 4 && Y < 12 && Z > 2) return 0;
  const w = win(X, Y, Z, [1, 15, 2, 14], { du: 4, w: 2.5, dz: 8, h: 4, z0: 3, off: 1, m: 'void', deep: 2 }); if (w !== null) return w;
  if (noise(X * .5 + Y * .5, Z * .2, 0, 6) > .6) return 'vine';
  if (Z > top - 1 || Z < 2) return 'moss';
  return 'concrete';
}, rubble(3)), 30);
add('ruin_car', (X, Y, Z) => {
  if (Z < .5 && Math.hypot(X - 8, Y - 8) < 8 && noise(X * .7, Y * .7, 0, 30) > .45) return 'moss';
  const wheel = (Z < 2.5) && ((Math.abs(X - 5) < 1.4 || Math.abs(X - 12) < 1.4) && (Math.abs(Y - 5.3) < .6 || Math.abs(Y - 10.7) < .6));
  if (wheel) return 'iron';
  if (inBox(X, Y, Z, 3, 15, 5.5, 10.5, 1.2, 4.5)) return noise(X * .6, Y * .6, Z * .6, 31) > .62 ? 'moss' : 'rust';
  if (inBox(X, Y, Z, 6, 12, 6, 10, 4.5, 7.5)) { if (Z < 7 && (Y < 6.7 || X > 11.3)) return 'glassbroken'; return 'rust'; }
  if (Z >= 7.5 && Z < 9 && inBox(X, Y, Z, 6, 12, 6, 10, 7.5, 9) && noise(X * .8, Y * .8, 0, 32) > .45) return 'green';
  return 0;
}, 14);
add('ruin_pylon', (X, Y, Z) => {
  const lean = Z * .14, cx = 8 + lean, cy = 8 - lean * .3;
  if (Z < 1 && Math.hypot(X - 8, Y - 8) < 5 && noise(X, Y, 0, 33) > .4) return 'moss';
  const t = 1.8 - Z * .012;
  for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (Math.hypot(X - cx - ox * t * (1 + (52 - Z) * .03), Y - cy - oy * t * (1 + (52 - Z) * .03)) < .55 && Z < 52) return Z < 10 && noise(X, Z * .3, Y, 34) > .5 ? 'vine' : 'rust';
  if (Z < 52 && fr(Z, 5) < .5 && Math.abs(X - cx) < t + 1.5 && Math.abs(Y - cy) < t + 1.5 && (Math.abs(Math.abs(X - cx) - t * 1.4) < .5 || Math.abs(Math.abs(Y - cy) - t * 1.4) < .5)) return 'iron';
  if (Z > 44 && Z < 46 && Math.abs(Y - cy) < .6 && Math.abs(X - cx) < 9 - (X > cx ? 4 : 0)) return 'rust';
  if (Z > 40 && Z < 44 && Math.abs(Y - cy) < .6 && (Math.abs(X - cx + 8) < .5) && Z < 42) return 'glassbroken';
  return 0;
}, 60);

// ---------- fantasy ----------
add('hut_a', hut({}), 34);
add('hut_b', hut({ x0: 3, x1: 13, y0: 3, y1: 13, wall: 10, rise: 13, roof: 'straw2', walls: 'plaster2', hip: true }), 34);
add('hut_c', hut({ x0: 2, x1: 14, y0: 4, y1: 12, wall: 11, rise: 10, roof: 'straw', walls: 'stone', ridgeX: false, stoneBase: 0 }), 30);
add('longhouse', hut({ x0: 0.5, x1: 15.5, y0: 4, y1: 12, wall: 9, rise: 11, roof: 'straw2', walls: 'plaster' }), 30);
add('temple0', union((X, Y, Z) => { // bell tower
  if (inBox(X, Y, Z, 10, 15, 2, 7, 0, 30)) { const w = win(X, Y, Z, [10, 15, 2, 7], { du: 5, w: 2, dz: 99, h: 4, z0: 22, off: 1.5 }); if (w !== null) return w; return 'stone'; }
  if (X >= 9.5 && X < 15.5 && Y >= 1.5 && Y < 7.5 && Z >= 30 && Z < 30 + 10 * Math.min(1 - Math.abs(X - 12.5) / 3, 1 - Math.abs(Y - 4.5) / 3)) return 'slate';
  return 0;
}, hut({ x0: 1, x1: 13, y0: 5, y1: 14, wall: 13, rise: 9, roof: 'slate', walls: 'stone', stoneBase: 0 })), 44);
add('well', (X, Y, Z) => {
  const r = Math.hypot(X - 8, Y - 8);
  if (Z < 5 && r < 5 && r > 3.3) return 'stone';
  if (Z < 3.8 && r <= 3.3) return 'water';
  if ((Math.abs(X - 8) < .6) && Math.abs(Y - 8) > 4 && Math.abs(Y - 8) < 5 && Z < 14) return 'beam';
  if (Z > 11 && Z < 12 && Math.abs(X - 8) < .5 && Math.abs(Y - 8) < 5) return 'beam';
  if (Math.abs(Y - 8) < 6 && Math.abs(X - 8) < 3.5 && Z >= 13 && Z < 17 - Math.abs(X - 8) * 1.1 && Z > 15 - Math.abs(X - 8) * 1.1) return 'straw';
  if (Z > 6 && Z < 11 && Math.abs(X - 8) < .4 && Math.abs(Y - 8) < .4) return 'iron';
  return 0;
}, 22);
function stall(cloth1, cloth2, goods) {
  return (X, Y, Z) => {
    if (inBox(X, Y, Z, 3, 13, 4, 12, 0, 5)) return Z > 4 ? (fr(X, 2) < 1 ? goods : (Y > 8 ? 'fruitY' : 'green')) : 'wood';
    if (Z > 4 && Z < 6.5 && inBox(X, Y, Z, 3.5, 12.5, 4.5, 11.5, 0, 9) && hash(fl(X * 2), fl(Y * 2), fl(Z * 2), 50) > .45) return hash(fl(X), fl(Y), 51) > .5 ? goods : 'fruitY';
    for (const [px, py] of [[3, 4], [12.5, 4], [12.5, 11.5]]) if (Math.abs(X - px) < .5 && Math.abs(Y - py) < .5 && Z < 13) return 'beam';
    const az = 14 - (12 - Y) * .45; // awning slopes down toward the front-left
    if (X >= 2 && X < 14 && Y >= 1.5 && Y < 12.5 && Z < az && Z > az - 1) return fr(X, 3) < 1.5 ? cloth1 : cloth2;
    if (Y >= 1.5 && Y < 2.2 && Z < az && Z > az - 2.2 && X >= 2 && X < 14) return fr(X, 3) < 1.5 ? cloth1 : cloth2;
    return 0;
  };
}
add('stall_a', stall('clothR', 'cream', 'fruitR'), 20);
add('stall_b', stall('clothB', 'clothY', 'clothG'), 20);
add('barn', union((X, Y, Z) => {
  if (inBox(X, Y, Z, 1, 15, 2.5, 13.5, 0, 26)) {
    const rz = gableZX(X, 13, 11, 0, 16);
    if (Z >= rz) return 0;
    const onL = Y - 2.5 < 1;
    if (onL && Math.abs(X - 8) < 3 && Z < 9) return Y < 3 ? 0 : (Math.abs(X - 8) < .4 || Math.abs(Math.abs(X - 8) - (Z - 1) * .35) < .5) ? 'beam' : 'wood';
    if (onL && Math.abs(X - 8) < 1 && Z > 14 && Z < 17) return Y < 3 ? 0 : 'win';
    return Z < 2 ? 'stone' : (fr(Y + X, 2) < .5 ? 'beam' : 'brick2');
  }
  const rz = gableZX(X, 13, 11, -0.5, 16.5);
  if (X >= -.5 && X < 16.5 && Y >= 1.5 && Y < 14.5 && Z < rz && Z > rz - 2) return 'slate';
  return 0;
}), 30);
add('windmill', (X, Y, Z) => {
  const r = 5.2 - Z * .07;
  const cr = Math.hypot(X - 8, Y - 9);
  // sails in a plane just in front of the tower (front-left face side)
  const hx = 8, hz = 28;
  if (Y >= 1.4 && Y < 2.1) {
    const dx = X - hx, dz = (Z - hz);
    const a = (dx + dz) / Math.SQRT2, c = (dx - dz) / Math.SQRT2;
    const arm = (p, q) => Math.abs(p) < 13 && (Math.abs(q) < .55 || (Math.abs(p) > 2.5 && q > 0 && q < 3));
    if (arm(a, c) || arm(-a, -c) || arm(c, -a) || arm(-c, a)) return (Math.abs(a) < .6 || Math.abs(c) < .6) ? 'beam' : (fr(a, 2.5) < .6 || fr(c, 2.5) < .6) ? 'wood' : 'cream';
  }
  if (Math.hypot(X - hx, Z - hz) < 1.2 && Y >= 2 && Y < 5) return 'iron';
  if (Z < 31 && cr < r) {
    if (Y < 9 && Math.abs(X - 8) < 1.5 && Z < 6) return cr > r - .6 ? 0 : 'wood';
    if (Y < 9 && Math.abs(X - 8) < 1 && fr(Z - 12, 9) < 3 && Z > 11 && cr > r - .7) return cr > r - .4 ? 0 : 'win';
    return Z < 3 ? 'stone' : 'stone2';
  }
  if (Z >= 30 && Z < 40 - cr * 1.8 && cr < 5.5) return 'straw';
  return 0;
}, 52, { lo: -10, hi: 26 });

// ---------- industrial ----------
function brickHouse({ x0 = 2, x1 = 14, y0 = 3, y1 = 13, wall = 22, rise = 8, walls = 'brick', chim = [[4, 6]], ridgeX = true }) {
  const b = [x0, x1, y0, y1];
  return (X, Y, Z) => {
    for (const [cx, cy] of chim) if (inBox(X, Y, Z, cx - 1.2, cx + 1.2, cy - 1, cy + 1.2, wall, wall + rise + 6)) return Z > wall + rise + 5 ? 'iron' : 'brick2';
    const rz = ridgeX ? gableZ(Y, wall, rise, y0 - 1, y1 + 1) : gableZX(X, wall, rise, x0 - 1, x1 + 1);
    if (X >= x0 - 1 && X < x1 + 1 && Y >= y0 - 1 && Y < y1 + 1 && Z < rz && Z > rz - 2 && Z > wall - 1) return 'slate';
    if (!inBox(X, Y, Z, x0, x1, y0, y1, 0, wall + rise)) return 0;
    if (Z >= rz - 1) return 0;
    const onL = Y - y0 < 1;
    if (onL && Math.abs(X - x0 - 3) < 1.3 && Z < 7) return Y - y0 < .5 ? 0 : 'wood';
    const w = win(X, Y, Z, b, { du: 4, w: 2, dz: 8, h: 4, z0: 3, off: 1, z1: wall - 2 });
    if (w !== null && !(onL && Math.abs(X - x0 - 3) < 2.5 && Z < 8)) return w;
    if ((onL || x1 - X < 1) && fr(Z - 2.5, 8) < .7 && Z > 3) return 'stone';
    if (Z < 2) return 'stone';
    return walls;
  };
}
add('house1_a', brickHouse({}), 44);
add('house1_b', brickHouse({ wall: 30, rise: 7, walls: 'brick2', chim: [[4, 6], [12, 6]], x0: 3, x1: 13 }), 50);
add('house1_c', brickHouse({ wall: 15, rise: 9, ridgeX: false, chim: [[11, 10]], y0: 2, y1: 14 }), 36);
add('factory', (X, Y, Z) => {
  if (cyl(X, Y, 13, 12, 2 - Z * .008) && Z < 62) return Z > 59 ? 'iron' : fr(Z, 10) < 1 ? 'stone' : 'brick2';
  // saw-tooth roof
  if (inBox(X, Y, Z, 1, 15, 1.5, 14, 0, 26)) {
    const tooth = 18 + 6 * fr(Y - 1.5, 4.2) / 4.2;
    if (Z >= tooth) return 0;
    if (Z > 18) return fr(Y - 1.5, 4.2) > 3.4 ? 'glass' : 'slate';
    const w = win(X, Y, Z, [1, 15, 1.5, 14], { du: 3.4, w: 2, dz: 8, h: 5, z0: 4, off: 1, z1: 16 }); if (w !== null) return w;
    return Z < 2 ? 'stone' : fr(Z, 9) < .8 ? 'stone' : 'brick';
  }
  return 0;
}, 66);
add('station', (X, Y, Z) => {
  if (inBox(X, Y, Z, 6.5, 9.5, 5, 8, 18, 26)) { // clock turret
    if (Y < 5.6 && Math.hypot(X - 8, Z - 22) < 1.4) return (Math.abs(X - 8) < .3 && Z > 22) || (Math.abs(Z - 22) < .3 && X > 8) ? 'hand' : 'clock';
    return 'brick2';
  }
  if (X >= 6 && X < 10 && Y >= 4.5 && Y < 8.5 && Z >= 26 && Z < 26 + 5 * Math.min(1 - Math.abs(X - 8) / 2, 1 - Math.abs(Y - 6.5) / 2)) return 'slate';
  if (inBox(X, Y, Z, 1, 15, 5, 14, 0, 20)) {
    const rz = gableZ(Y, 14, 6, 4, 15); if (Z >= rz) return 0;
    if (Z > rz - 2) return 'slate';
    const w = win(X, Y, Z, [1, 15, 5, 14], { du: 3.5, w: 2, dz: 99, h: 6, z0: 3, off: .8, z1: 10 }); if (w !== null) return w;
    return Z < 2 ? 'stone' : 'brick';
  }
  // platform canopy on iron posts at the front
  if (inBox(X, Y, Z, 0, 16, 0.5, 5, 9, 10)) return fr(X, 2) < 1 ? 'clothR' : 'cream';
  if (Z < 9 && X >= 0 && X < 16 && Math.abs(Y - 1) < .5 && fr(X, 5) < .6) return 'iron';
  if (Z < 1 && Y < 5 && X >= 0 && X < 16 && Y >= 0) return 'stone';
  return 0;
}, 34);
add('temple1', (X, Y, Z) => {
  if (inBox(X, Y, Z, 5, 11, 4, 10, 0, 52)) {
    if (Z > 38 && Z < 46 && (Y < 4.6 || X > 10.4)) { const u = Y < 4.6 ? X - 8 : Y - 7; if (Math.hypot(u, Z - 42) < 2.6) return (Math.abs(u) < .35 && Z > 42 && Z < 44.5) || (Math.abs(Z - 42) < .35 && u > 0 && u < 1.8) ? 'hand' : 'clock'; }
    const w = win(X, Y, Z, [5, 11, 4, 10], { du: 6, w: 2, dz: 9, h: 4, z0: 18, off: 2, z1: 34 }); if (w !== null) return w;
    return fr(Z, 12) < 1 ? 'stone' : 'brick2';
  }
  if (X >= 4.5 && X < 11.5 && Y >= 3.5 && Y < 10.5 && Z >= 52 && Z < 52 + 16 * Math.min(1 - Math.abs(X - 8) / 3.5, 1 - Math.abs(Y - 7) / 3.5)) return 'slate';
  if (inBox(X, Y, Z, 1, 15, 2, 14, 0, 24)) {
    const rz = hipZ(X, Y, 16, 6, 1, 15, 2, 14); if (Z >= rz) return 0;
    if (Z > 16) return 'slate';
    const w = win(X, Y, Z, [1, 15, 2, 14], { du: 3, w: 1.5, dz: 99, h: 7, z0: 4, off: 1, z1: 12 }); if (w !== null) return w;
    return Z < 2 ? 'stone' : 'stone2';
  }
  return 0;
}, 72);

// ---------- solarpunk ----------
function solTower(levels, lh, shrink) {
  return (X, Y, Z) => {
    const lv = fl(Z / lh); if (lv >= levels) {
      if (Z < levels * lh + 1.5 && inBox(X, Y, Z, 4, 12, 4, 12, 0, 999) && hash(fl(X * 2), fl(Y * 2), 70) > .3) return 'green';
      return 0;
    }
    const m = 1 + lv * shrink, x0 = 1.5 + m * .6, x1 = 14.5 - m * .3, y0 = 1.5 + m * .3, y1 = 14.5 - m * .6;
    const fz = Z - lv * lh;
    // terrace slab with planters
    if (fz < 1.2 && X >= x0 - 1 && X < x1 + 1 && Y >= y0 - 1 && Y < y1 + 1) return 'white';
    if (fz >= 1.2 && fz < 3 && X >= x0 - 1 && X < x1 + 1 && Y >= y0 - 1 && Y < y1 + 1 && (Y < y0 - .2 || X > x1 + .2) && noise(X * .7, Y * .7, Z * .4, 71) > .42) return 'green';
    if (lv === levels - 1 && fz > lh - 1.2 && inBox(X, Y, Z, x0 + 1, x1 - 1, y0 + 1, y1 - 1, 0, 999) && fr(X + Y, 5) < 3) return 'solar';
    if (!inBox(X, Y, Z, x0, x1, y0, y1, 0, 999)) return 0;
    if (fz > 2 && fz < lh - 1) { const onL = Y - y0 < 1.2, onR = x1 - X < 1.2; if (onL || onR) { const u = onL ? X : Y; if (fr(u, 4) < .7) return 'white'; return (onL ? Y - y0 : x1 - X) < .5 ? 0 : 'winc'; } }
    return 'white';
  };
}
add('sol_a', solTower(5, 10, 1.3), 58);
add('sol_b', union(solTower(7, 9, .9), (X, Y, Z) => (Z < 66 && cyl(X, Y, 14.6, 14.6, .8) && fl(Z) % 9 > 4) ? 'green' : 0), 72);
add('sol_temple', (X, Y, Z) => {
  const r = Math.hypot(X - 8, Y - 8, Math.max(0, Z - 4) * 1.15);
  if (Z < 4 && Math.hypot(X - 8, Y - 8) < 8) return 'white';
  if (Z >= 4 && r < 7.6 && r > 6.6) {
    const ang = Math.atan2(Y - 8, X - 8), el = Math.atan2(Z - 4, Math.hypot(X - 8, Y - 8));
    return (fr(ang * 8 / Math.PI, 1) < .14 || fr(el * 10 / Math.PI, 1) < .12) ? 'white' : 'winc';
  }
  if (Z >= 4 && r < 6 && noise(X * .5, Y * .5, Z * .4, 72) > .5 - (Z < 8 ? .2 : 0)) return 'green';
  if (Z >= 12 && Z < 14 && Math.hypot(X - 8, Y - 8) < 1.2) return 'brass';
  return 0;
}, 24);

// ---------- magic-punk ----------
function spire(seed, h, w) {
  return (X, Y, Z) => {
    const t = Z / h, half = w * (1 - t * .55) + (fr(Z, 12) < 1.5 ? .8 : 0);
    if (Math.abs(X - 8) < half && Math.abs(Y - 8) < half && Z < h) {
      const onL = 8 - half > Y - 1.2, onR = X > 8 + half - 1.2;
      if (fr(Z, 12) < 1.5) return 'brass';
      if ((onL || onR) && fr(Z - 4, 12) > 2 && fr(Z - 4, 12) < 7) { const u = onL ? X - 8 : Y - 8; if (Math.abs(u) < 1.1) return (onL ? Y - (8 - half) : 8 + half - X) < .5 ? 0 : (fl(Z / 12) + seed) % 2 ? 'violet' : 'teal'; }
      return 'dstone';
    }
    // pointed cap
    if (Z >= h && Z < h + 10 && Math.abs(X - 8) + Math.abs(Y - 8) < (h + 10 - Z) * .35) return Z > h + 6 ? 'violet' : 'brass';
    // floating crystal shard
    if (Math.abs(X - 8) + Math.abs(Y - 8) + Math.abs(Z - h - 14) * .6 < 1.6) return 'teal';
    return 0;
  };
}
add('mag_a', union(spire(0, 50, 6), (X, Y, Z) => inBox(X, Y, Z, 1, 15, 1, 15, 0, 4) ? (Z > 3 ? 'brass' : 'dstone') : 0), 70);
add('mag_b', union(spire(1, 64, 5.5), (X, Y, Z) => inBox(X, Y, Z, 1.5, 6, 9, 14.5, 0, 22) ? (Z > 20 ? 'brass' : (Y - 9 < 1.2 && Math.abs(X - 3.7) < .8 && Z > 10 && Z < 16) ? 'violet' : 'dstone') : 0), 82);
add('mag_temple', (X, Y, Z) => {
  if (Z < 5 && Math.abs(X - 8) + Math.abs(Y - 8) < 8 - Z * .4) return Z > 4 ? 'brass' : 'dstone';
  for (const [cx, cy, hh] of [[3.5, 8, 14], [8, 3.5, 18], [12.5, 8, 12], [8, 12.5, 10]])
    if (Math.abs(X - cx) + Math.abs(Y - cy) < 1.2 * (1 - (Z - 4) / hh) && Z < 4 + hh) return 'teal';
  const k = 1 - (Z - 4) / 72; // obelisk tapering to a point
  if (Z >= 4 && Math.abs(X - 8) + Math.abs(Y - 8) < 3.6 * k + (Z > 66 ? 0 : 0)) return fr(Z, 16) < 1 ? 'brass' : 'violet';
  return 0;
}, 80);

// ---------- nature ----------
function tree({ seed, h, r, mat: fm, trunk = 'bark', blobs = 7, trunkH = .45 }) {
  const rr = rng(seed); const B = [];
  for (let i = 0; i < blobs; i++) { const a = rr() * 6.28, d = rr() * r * .55; B.push([8 + Math.cos(a) * d, 8 + Math.sin(a) * d, h * (trunkH + .1) + rr() * (h * (1 - trunkH) - r * .6) + r * .3, r * (.5 + rr() * .35)]); }
  return (X, Y, Z) => {
    for (const [x, y, z, s] of B) { const d = Math.hypot(X - x, Y - y, (Z - z) * 1.1); if (d < s + (noise(X * .7, Y * .7, Z * .7, seed) - .5) * 2.4) return fm; }
    if (Z < h * trunkH + 3 && cyl(X, Y, 8 + (Z > h * .3 ? (Z - h * .3) * .1 : 0), 8, 1.1 - Z * .01 + (Z < 2 ? .6 : 0))) return trunk;
    return 0;
  };
}
function pine(seed, h) {
  return (X, Y, Z) => {
    const d = Math.hypot(X - 8, Y - 8);
    if (d < .9 && Z < h * .3) return 'bark';
    if (Z < h * .18 || Z > h) return 0;
    const t = (Z - h * .18) / (h * .82), layer = fr(t * 4.2, 1);
    const rad = (1 - t) * 8 * (.55 + .45 * (1 - layer)) + (noise(X * .8, Y * .8, Z * .8, seed) - .5) * 1.6;
    return d < rad ? 'pine' : 0;
  };
}
add('tree_oak_a', tree({ seed: 101, h: 34, r: 9, mat: 'leaf' }), 40);
add('tree_oak_b', tree({ seed: 102, h: 30, r: 10, mat: 'leaf2', blobs: 8 }), 36);
add('tree_oak_c', tree({ seed: 103, h: 38, r: 8, mat: 'leaf', blobs: 9 }), 44);
add('tree_pine_a', pine(104, 40), 42);
add('tree_pine_b', pine(105, 32), 34);
add('tree_birch_a', tree({ seed: 106, h: 36, r: 6.5, mat: 'birchleaf', trunk: 'birch', blobs: 6, trunkH: .55 }), 42);
add('tree_autumn_a', tree({ seed: 107, h: 32, r: 9, mat: 'autumnA' }), 38);
add('tree_autumn_b', union(tree({ seed: 108, h: 30, r: 8.5, mat: 'autumnB', blobs: 6 }), tree({ seed: 109, h: 26, r: 6, mat: 'autumnC', blobs: 3 })), 36);
add('bush_a', (X, Y, Z) => Math.hypot(X - 8, Y - 8, Z * 1.2) < 6 + (noise(X * .8, Y * .8, Z * .8, 110) - .5) * 3 ? 'leaf' : 0, 12);
add('bush_b', (X, Y, Z) => { if (Math.hypot(X - 7, Y - 9, Z * 1.3) < 5.5 + (noise(X * .8, Y * .8, Z * .8, 111) - .5) * 3) return hash(fl(X * 1.5), fl(Y * 1.5), fl(Z * 1.5), 112) > .9 ? 'fruitR' : 'leaf2'; return 0; }, 12);
add('rock_a', (X, Y, Z) => Math.hypot((X - 8) * .9, Y - 8, Z * 1.1) < 5.5 + (noise(X * .5, Y * .5, Z * .5, 113) - .5) * 3 ? (Z > 4 && noise(X, Y, Z, 114) > .55 ? 'moss' : 'rock') : 0, 12);
add('rock_b', (X, Y, Z) => (Math.hypot(X - 6, Y - 8, Z * .8) < 4.5 + (noise(X * .5, Y * .5, Z * .5, 115) - .5) * 2.5 || Math.hypot(X - 11, Y - 10, Z * 1.4) < 3.5) ? 'rock2' : 0, 12);

// ---------- build sheet ----------
const frames = [];
for (const s of SPR) {
  const r = render(s);
  let x0 = OX, x1 = OX + 31, y0 = BY - 16, y1 = BY - 1;
  for (let y = 0; y < BUFH; y++) for (let x = 0; x < BUFW; x++) if (r.col[(y * BUFW + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  y1 = Math.max(y1, BY - 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, anchor = [OX + 16 - x0, BY - 8 - y0];
  frames.push({ name: s.name, w, h, anchor, px: crop(r.col, x0, y0, w, h) });
  if (r.hasLit) frames.push({ name: s.name + '_lit', w, h, anchor, px: crop(r.lit, x0, y0, w, h) });
}
// shelf pack, tallest first
const order = [...frames].sort((a, b) => b.h - a.h);
const SW = 1024; let cx = 0, cy = 0, rowH = 0, maxX = 0;
for (const f of order) { if (cx + f.w > SW) { cx = 0; cy += rowH + 1; rowH = 0; } f.x = cx; f.y = cy; cx += f.w + 1; rowH = Math.max(rowH, f.h); maxX = Math.max(maxX, cx - 1); }
const SH = cy + rowH, W = maxX;
if (SH > 1024) throw new Error('sheet too tall: ' + SH);
const sheet = new Uint8ClampedArray(W * SH * 4);
for (const f of frames) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const s = (y * f.w + x) * 4, d = ((f.y + y) * W + f.x + x) * 4; for (let c = 0; c < 4; c++) sheet[d + c] = f.px[s + c]; }

export function png(w, h, rgba) {
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xFFFFFFFF; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync(ART + 'buildings.png', png(W, SH, sheet));
const W0 = W, SH0 = SH, sheet0 = sheet;
fs.writeFileSync(ART + 'buildings.json', JSON.stringify({ image: 'buildings.png', frames: frames.map(f => ({ name: f.name, x: f.x, y: f.y, w: f.w, h: f.h, anchor: f.anchor })), animations: {} }));
// self-check: every frame inside the sheet, names unique
const names = new Set(frames.map(f => f.name));
console.assert(names.size === frames.length, 'duplicate names');
for (const f of frames) console.assert(f.x + f.w <= W && f.y + f.h <= SH, 'frame out of sheet ' + f.name);
console.log(`sheet ${W}x${SH}, ${frames.length} frames`);
// debug preview: x3 on a grass-ish backdrop, path from argv
if (process.argv[2]) {
  if (process.argv[3]) { const want = process.argv[3].split(','); const sel = frames.filter(f => want.includes(f.name)); let x = 0; const H = Math.max(...sel.map(f => f.h)); const Wd = sel.reduce((a, f) => a + f.w + 2, 0); const t = new Uint8ClampedArray(Wd * H * 4); for (const f of sel) { for (let y = 0; y < f.h; y++) for (let xx = 0; xx < f.w; xx++) for (let c = 0; c < 4; c++) t[((y + H - f.h) * Wd + x + xx) * 4 + c] = f.px[(y * f.w + xx) * 4 + c]; x += f.w + 2; } globalThis.DBG = [Wd, H, t]; }
  const [W, SH, sheet] = globalThis.DBG || [W0, SH0, sheet0];
  const k = 5, dw = W * k, dh = SH * k, d = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { const s = (fl(y / k) * W + fl(x / k)) * 4, o = (y * dw + x) * 4, a = sheet[s + 3] / 255;
    d[o] = sheet[s] * a + 70 * (1 - a); d[o + 1] = sheet[s + 1] * a + 90 * (1 - a); d[o + 2] = sheet[s + 2] * a + 60 * (1 - a); d[o + 3] = 255; }
  fs.writeFileSync(process.argv[2], png(dw, dh, d));
}
