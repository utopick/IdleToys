// Generates art/town.png + art/town.json (original pixel art, node built-ins only).
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const OUT = path.join(__dirname, '..', 'art');

// --- seeded RNG ---
let seed = 1337;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const sh = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// --- frame canvas ---
function Canvas(w, h) {
  const d = new Uint8Array(w * h * 4);
  const g = { w, h, d, lights: [] };
  g.px = (x, y, c, a = 255) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };
  g.get = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return null; const i = (y * w + x) * 4; return d[i + 3] ? [d[i], d[i + 1], d[i + 2]] : null; };
  g.rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) g.px(x + i, y + j, c); };
  // noisy fill: base colour with random brightness jitter
  g.noisy = (x, y, rw, rh, c, n = 0.08) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) g.px(x + i, y + j, sh(c, 1 + (rnd() - 0.5) * 2 * n)); };
  // light from upper left: darken right/bottom side with dithered gradient
  g.shadeBox = (x, y, rw, rh, k = 0.75) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const c = g.get(x + i, y + j); if (!c) continue; const t = (i / rw) * 0.7 + (j / rh) * 0.3; const th = t + (((i + j) & 1) ? 0.06 : -0.06); g.px(x + i, y + j, sh(c, th > 0.55 ? k : th < 0.18 ? 1.12 : 1)); } };
  g.outline = (c = [20, 14, 12]) => { // dark 1px outline around opaque shapes
    const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!m[y * w + x]) continue; const e = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X < 0 || Y < 0 || X >= w || Y >= h || !m[Y * w + X]; }); if (e) g.px(x, y, c); }
  };
  return g;
}

// --- materials ---
const C = {
  stone: hex('#8a8478'), stone2: hex('#6e6a62'), mortar: hex('#4a4640'), plaster: hex('#d8ccaa'), timber: hex('#4a2e1c'),
  wood: hex('#7a5232'), wood2: hex('#5e3e24'), thatch: hex('#b08a46'), tile: hex('#a8442c'), slate: hex('#4e5866'),
  win: hex('#1c1a22'), dark: hex('#141012'), iron: hex('#3a3a40'), grass: hex('#4a6a32'), leaf: hex('#3e6a2a'), cream: hex('#e8dcb0'),
};
function bricks(g, x, y, w, h, base = C.stone, bw = 6, bh = 4) {
  g.rect(x, y, w, h, C.mortar);
  for (let r = 0, yy = y; yy < y + h; r++, yy += bh) {
    const off = (r & 1) ? -(bw >> 1) : 0;
    for (let xx = x + off; xx < x + w; xx += bw) {
      const c = sh(mix(base, C.stone2, rnd() * 0.6), 0.85 + rnd() * 0.3);
      const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1), y1 = Math.min(y + h, yy + bh - 1);
      for (let j = yy; j < y1; j++) for (let i = x0; i < x1; i++) {
        let cc = sh(c, 1 + (rnd() - 0.5) * 0.12);
        if (j === yy || i === x0) cc = sh(cc, 1.15); // lit top-left edge
        if (j === y1 - 1) cc = sh(cc, 0.82);
        if (rnd() < 0.03) cc = sh(cc, 0.6); // chips
        g.px(i, j, cc);
      }
    }
  }
}
function planks(g, x, y, w, h, base = C.wood, vertical = true) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = vertical ? i : j, seam = vertical ? (i % 4 === 3) : (j % 3 === 2);
    let c = sh(base, (seam ? 0.6 : 1) * (0.92 + ((k * 37) % 7) * 0.025) * (1 + (rnd() - 0.5) * 0.1));
    if (!seam && rnd() < 0.04) c = sh(c, 0.75); // knots / grain
    g.px(x + i, y + j, c);
  }
}
function plaster(g, x, y, w, h) {
  g.noisy(x, y, w, h, C.plaster, 0.05);
  for (let n = 0; n < w * h / 40; n++) g.px(x + ri(0, w - 1), y + ri(0, h - 1), sh(C.plaster, 0.8)); // stains
  for (let n = 0; n < 2; n++) { const sx = x + ri(0, w - 4), sy = y + ri(0, h - 3); for (let i = 0; i < 3; i++) g.px(sx + i, sy + (i & 1), sh(C.stone, 0.95)); } // exposed stone patches
}
// half-timber: posts, beams and diagonal braces
function timber(g, x, y, w, h) {
  plaster(g, x, y, w, h);
  const t = C.timber;
  g.noisy(x, y, w, 2, t, 0.1); g.noisy(x, y + h - 2, w, 2, t, 0.1);
  for (let xx = x; xx < x + w; xx += Math.max(8, (w / 4) | 0)) g.noisy(xx, y, 2, h, t, 0.1);
  g.noisy(x + w - 2, y, 2, h, t, 0.1);
  g.noisy(x, y + (h >> 1), w, 1, t, 0.1);
  const seg = Math.max(8, (w / 4) | 0);
  for (let xx = x; xx + seg <= x + w; xx += seg * 2) for (let i = 0; i < seg; i++) { const yy = y + (h >> 1) + 1 + Math.round(i * ((h >> 1) - 3) / seg); g.px(xx + i, yy, t); g.px(xx + i + 1, yy, sh(t, 1.2)); }
}
function window_(g, x, y, w, h, shutters = true) {
  g.rect(x - 1, y - 1, w + 2, h + 2, C.timber);
  g.rect(x, y, w, h, C.win);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((i + j) & 3) === 0) g.px(x + i, y + j, sh(C.win, 1.4));
  if (w > 3) g.rect(x + (w >> 1), y, 1, h, C.timber);
  if (h > 4) g.rect(x, y + (h >> 1), w, 1, C.timber);
  g.rect(x - 1, y + h + 1, w + 2, 1, sh(C.stone, 1.1)); // sill
  if (shutters) { const sc = hex('#3c5a3a'); planks(g, x - 4, y - 1, 3, h + 2, sc); planks(g, x + w + 1, y - 1, 3, h + 2, sc); }
  g.lights.push({ x, y, w, h });
}
function door(g, x, y, w, h, arch = true) {
  g.rect(x - 1, y - 1, w + 2, h + 1, C.timber);
  planks(g, x, y, w, h, C.wood2);
  if (arch) { g.px(x, y, C.timber); g.px(x + w - 1, y, C.timber); }
  g.rect(x, y + 2, w, 1, C.iron); g.rect(x, y + h - 3, w, 1, C.iron);
  g.px(x + w - 2, y + (h >> 1), hex('#c0a040'));
}
// pitched roof covering x..x+w, apex at top y, eave at y+h. type: thatch|tile|slate
function roof(g, x, y, w, h, type) {
  const base = { thatch: C.thatch, tile: C.tile, slate: C.slate }[type];
  const mid = x + w / 2;
  for (let j = 0; j < h; j++) {
    const half = (j + 1) * (w / 2) / h;
    for (let i = Math.floor(mid - half); i < Math.ceil(mid + half); i++) {
      let c;
      if (type === 'thatch') { // straw strands, ragged
        const strand = ((i * 7 + (j >> 1) * 3) % 5);
        c = sh(base, 0.78 + strand * 0.07 + (rnd() - 0.5) * 0.15);
        if ((j % 5) === 4) c = sh(c, 0.8);
      } else { // overlapping tile rows
        const rowH = type === 'tile' ? 3 : 4, tw = type === 'tile' ? 4 : 5;
        const r = (j / rowH) | 0, off = (r & 1) * (tw >> 1), col = ((i + off) / tw) | 0;
        c = sh(base, 0.85 + ((col * 13 + r * 7) % 5) * 0.05);
        if (j % rowH === rowH - 1) c = sh(c, 0.6);
        else if ((i + off) % tw === 0) c = sh(c, 0.75);
        else if (j % rowH === 0) c = sh(c, 1.15);
        if (rnd() < 0.04) c = mix(c, hex('#5a6a3a'), 0.4); // moss
      }
      if (i > mid) c = sh(c, 0.82); // right slope in shade
      g.px(i, y + j, c);
    }
  }
  if (type === 'thatch') for (let i = x; i < x + w; i++) if (rnd() < 0.5) g.px(i, y + h, sh(base, 0.7)); // ragged eave
  for (let i = x - 1; i <= x + w; i++) g.px(i, y + h - 1, sh(base, 0.55));
}
function chimney(g, x, y, w, h) { bricks(g, x, y, w, h, hex('#8a5a48'), 4, 3); g.rect(x - 1, y, w + 2, 2, C.stone2); }
const ground = (g, h = 2) => g.noisy(0, g.h - h, g.w, h, hex('#3e3428'), 0.1);
const finish = g => { g.outline(); return g; };

// --- frames ---
const frames = {};
const F = (name, w, h, fn) => { const g = Canvas(w, h); fn(g); frames[name] = g; };

F('hills', 640, 70, g => {
  const sky = hex('#6e8a8c'), far = hex('#5a7a78'), near = hex('#3e5e58');
  const wave = (x, a) => a.reduce((s, [amp, k, ph]) => s + amp * Math.sin(2 * Math.PI * k * x / 640 + ph), 0);
  for (let x = 0; x < 640; x++) {
    const h1 = 30 + wave(x, [[10, 2, 0.3], [5, 5, 1], [2, 11, 2]]);
    const h2 = 46 + wave(x, [[6, 3, 2], [3, 7, 0.5], [1.5, 17, 1]]);
    for (let y = 0; y < 70; y++) {
      const dz = ((x + y) & 1) ? 0.5 : -0.5;
      if (y > h1 + dz) g.px(x, y, mix(far, sky, Math.max(0, 0.45 - (y - h1) / 60)), 255);
      // forest silhouette: bumpy crowns on the nearer layer
      const tree = h2 - 3 * Math.abs(Math.sin(x * 2 * Math.PI * 56 / 640)) - 2 * Math.abs(Math.sin(x * 2 * Math.PI * 21 / 640 + 1)); // integer cycles: tiles
      if (y > tree + dz) g.px(x, y, sh(mix(near, far, Math.max(0, 0.3 - (y - tree) / 40)), 0.95 + 0.05 * Math.sin(x * 1.7 + y)));
    }
  }
});
F('trees_back', 640, 60, g => {
  const base = hex('#2a3e30');
  for (let n = 0; n < 4; n++) { // far rooftops
    const x = 60 + n * 160 + ri(0, 40), w = ri(20, 30), y = ri(8, 14);
    g.rect(x + 2, y + 12, w - 4, 60, hex('#34303a'));
    for (let j = 0; j < 13; j++) for (let i = -1; i <= Math.round(j * w / 26) * 2 + 1; i++) g.px(x + w / 2 - Math.round(j * w / 26) - 1 + i, y + j, sh(hex('#40302e'), i < j ? 1.1 : 0.8));
    g.rect(x + w - 7, y - 2, 3, 8, hex('#3a3030'));
    g.rect(x + 6, y + 15, 3, 3, hex('#1a181c'));
  }
  for (let t = 0; t < 70; t++) { // crowns: dithered blobs, lit upper left
    const cx = (t * 9.3 + ri(-3, 3)) % 640, cy = ri(30, 42), r = ri(7, 12);
    for (let y = -r; y <= 60; y++) for (let x = -r; x <= r; x++) {
      const inside = y <= 0 ? x * x + y * y <= r * r - rnd() * r : Math.abs(x) < r * 0.8;
      if (!inside) continue;
      const l = (-x - y) / (2 * r);
      const lc = l + (((((cx + x) >> 1) ^ ((cy + y) >> 1)) & 1) ? 0.08 : -0.08) + (rnd() - 0.5) * 0.15; // leaf clusters
      const k = y > 4 ? 0.7 : lc > 0.3 ? 1.3 : lc > 0 ? 1.05 : lc > -0.3 ? 0.85 : 0.7;
      g.px(((cx + x) % 640 + 640) % 640, cy + y, sh(base, k));
    }
  }
});
F('ground', 640, 24, g => {
  const soil = hex('#4a3a2a'), rock = hex('#1a1410');
  for (let y = 0; y < 24; y++) for (let x = 0; x < 640; x++) {
    const t = Math.max(0, (y - 8) / 15) + (((x + y) & 1) ? 0.05 : 0);
    g.px(x, y, sh(mix(soil, rock, Math.min(1, t)), 0.9 + rnd() * 0.15));
  }
  g.rect(0, 0, 640, 8, hex('#2e2620'));
  for (let r = 0; r < 3; r++) for (let x = (r & 1) * 3 - 3; x < 640; x += ri(5, 8)) { // cobbles
    const w = ri(4, 6), y = r * 3 - 0, c = sh(mix(C.stone, hex('#7a6e60'), rnd()), 0.75 + rnd() * 0.4);
    for (let j = 0; j < 2 + (r < 2 ? 1 : 0); j++) for (let i = 0; i < w - 1; i++) { let cc = c; if (j === 0) cc = sh(c, 1.18); if (i === w - 2) cc = sh(c, 0.8); g.px(x + i, y + j, sh(cc, 1 + (rnd() - 0.5) * 0.1)); }
  }
  for (let n = 0; n < 90; n++) { const x = ri(0, 636), y = ri(10, 20), c = sh(C.stone2, 0.5 + rnd() * 0.4); g.rect(x, y, ri(2, 4), 2, c); g.px(x, y, sh(c, 1.3)); } // buried stones
  for (let n = 0; n < 25; n++) { let x = ri(0, 639), y = 8; for (let s = 0; s < ri(4, 10); s++) { g.px(x, y, hex('#5a4030')); y++; x += ri(-1, 1); } } // roots
  for (let x = 0; x < 640; x++) g.px(x, 8, sh(hex('#2a2018'), 0.9));
});

F('townhall', 80, 110, g => {
  bricks(g, 6, 50, 68, 60); g.shadeBox(6, 50, 68, 60);
  roof(g, 2, 34, 76, 18, 'slate');
  bricks(g, 28, 10, 24, 44, hex('#928a7c')); g.shadeBox(28, 10, 24, 44, 0.8); // tower
  roof(g, 26, 0, 28, 12, 'slate');
  g.rect(27, 10, 26, 2, C.stone2); g.rect(27, 50, 26, 1, C.stone2);
  for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; g.px(40 + Math.cos(t) * 9.5, 24 + Math.sin(t) * 9.5, C.dark); g.px(40 + Math.cos(t) * 10.4, 24 + Math.sin(t) * 10.4, hex('#6a5a3a')); }
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) if (x * x + y * y <= 64) g.px(40 + x, 24 + y, C.cream);
  g.clock = { x: 40, y: 24, r: 8 };
  window_(g, 37, 39, 6, 8, false);
  for (const wx of [12, 62]) { window_(g, wx, 60, 6, 9, false); window_(g, wx, 82, 6, 9, false); }
  door(g, 34, 92, 12, 18);
  g.rect(31, 89, 18, 2, sh(C.stone, 1.2)); // lintel
  for (let i = 0; i < 6; i++) g.px(37 + i, 12 + (i & 1), hex('#8a2020')); // banner hint
  g.rect(36, 52, 8, 10, hex('#7a1e1e')); for (let j = 52; j < 62; j++) g.px(40, j, hex('#c09030'));
  ground(g); finish(g);
});
function house(g, type, o) {
  const { w, h, wallTop, chimX } = o;
  if (chimX != null) chimney(g, chimX, 4, 5, wallTop);
  bricks(g, 2, h - 10, w - 4, 10); // stone base
  timber(g, 2, wallTop, w - 4, h - 10 - wallTop);
  g.shadeBox(2, wallTop, w - 4, h - wallTop, 0.8);
  roof(g, 0, wallTop - o.rh + 1, w, o.rh, type);
  for (const [x, y] of o.wins) window_(g, x, y, 5, 6);
  door(g, o.door, h - 15, 7, 15);
  ground(g); finish(g);
}
F('house1', 52, 64, g => house(g, 'thatch', { w: 52, h: 64, wallTop: 26, rh: 22, chimX: 36, wins: [[10, 32], [36, 32], [36, 47]], door: 12 }));
F('house2', 56, 70, g => house(g, 'tile', { w: 56, h: 70, wallTop: 28, rh: 22, chimX: 10, wins: [[10, 34], [26, 34], [42, 34], [42, 52]], door: 20 }));
F('house3', 48, 60, g => house(g, 'slate', { w: 48, h: 60, wallTop: 24, rh: 20, chimX: 33, wins: [[9, 30], [34, 30], [34, 44]], door: 13 }));

F('tavern', 64, 70, g => {
  chimney(g, 46, 2, 6, 24);
  bricks(g, 2, 48, 58, 22); timber(g, 2, 26, 58, 22); g.shadeBox(2, 26, 58, 44, 0.8);
  roof(g, 0, 8, 62, 19, 'tile');
  window_(g, 10, 32, 6, 6); window_(g, 30, 32, 6, 6); window_(g, 46, 32, 6, 6);
  window_(g, 36, 54, 10, 7, false);
  door(g, 14, 54, 9, 16);
  g.rect(60, 36, 4, 1, C.iron); g.px(61, 37, C.iron); g.px(63, 37, C.iron); // sign bracket + sign
  planks(g, 58, 38, 6, 9, hex('#8a6038'));
  g.rect(59, 40, 3, 4, hex('#d8b050')); g.px(62, 41, hex('#d8b050')); g.px(62, 42, hex('#d8b050')); g.rect(59, 39, 3, 1, C.cream); // mug
  for (const bx of [26, 48]) { planks(g, bx, 62, 8, 8, hex('#6a4426')); g.rect(bx, 63, 8, 1, C.iron); g.rect(bx, 67, 8, 1, C.iron); g.shadeBox(bx, 62, 8, 8); }
  ground(g); finish(g);
});
F('forge', 56, 52, g => {
  chimney(g, 8, 0, 7, 30);
  bricks(g, 2, 20, 40, 32, hex('#7a7068')); g.shadeBox(2, 20, 40, 32);
  roof(g, 0, 10, 44, 12, 'slate');
  planks(g, 42, 24, 12, 3, C.wood2); g.rect(52, 27, 2, 25, C.timber); // lean-to awning
  // forge mouth: arch with embers
  for (let y = 32; y < 46; y++) for (let x = 8; x < 24; x++) { const dx = x - 15.5, dy = y - 38; if (y > 38 || dx * dx + dy * dy < 64) g.px(x, y, y > 41 ? mix(hex('#ff8a20'), hex('#a02010'), rnd()) : C.dark); }
  for (let n = 0; n < 6; n++) g.px(ri(10, 21), ri(39, 41), hex('#ffd060'));
  window_(g, 30, 30, 5, 6, false);
  g.lights.push({ x: 9, y: 34, w: 14, h: 8 }); // forge glow
  g.rect(42, 42, 10, 3, C.iron); g.rect(40, 42, 2, 2, C.iron); g.rect(45, 45, 4, 5, C.iron); g.rect(43, 50, 8, 2, sh(C.iron, 0.8)); g.rect(42, 42, 10, 1, hex('#6a6a72')); // anvil
  ground(g); finish(g);
});
F('chapel', 44, 80, g => {
  bricks(g, 14, 6, 16, 36, hex('#9a9284'), 5, 4); g.shadeBox(14, 6, 16, 36); // belfry
  roof(g, 12, 0, 20, 8, 'slate'); g.rect(21, 0, 2, 0, C.iron);
  g.rect(20, 12, 4, 6, C.dark); g.px(21, 15, hex('#b08a30')); g.px(22, 15, hex('#b08a30'));
  bricks(g, 3, 42, 38, 38, hex('#9a9284'), 5, 4); g.shadeBox(3, 42, 38, 38);
  roof(g, 1, 28, 42, 16, 'slate');
  const gl = ['#a02828', '#2848a0', '#d8b030', '#287040'].map(hex);
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const r2 = x * x + y * y; if (r2 <= 36) g.px(22 + x, 52 + y, r2 > 25 || x === 0 || y === 0 ? C.dark : sh(gl[(Math.atan2(y, x) + 4) * 0.7 | 0 & 3] || gl[0], 0.6)); }
  g.lights.push({ x: 17, y: 47, w: 11, h: 11 });
  door(g, 18, 64, 8, 16);
  window_(g, 8, 62, 3, 8, false); window_(g, 33, 62, 3, 8, false);
  ground(g); finish(g);
});
function granary(g, level) {
  const run = level === 0;
  planks(g, 3, 16, 34, 38, run ? hex('#6a5a48') : hex('#8a6238')); g.shadeBox(3, 16, 34, 38);
  for (const x of [3, 35]) g.rect(x, 16, 2, 38, C.timber); g.rect(3, 16, 34, 2, C.timber);
  roof(g, 0, 2, 40, 16, run ? 'slate' : 'tile');
  if (run) { for (let n = 0; n < 14; n++) g.px(ri(8, 32), ri(4, 16), [0, 0, 0], 0); for (let n = 0; n < 10; n++) { const x = ri(5, 34), y = ri(20, 50); g.rect(x, y, 1, ri(2, 5), C.dark); } }
  window_(g, 17, 22, 6, 5, false);
  g.rect(12, 34, 16, 20, C.dark); // door opening
  if (run) { planks(g, 26, 36, 5, 18, hex('#5a4a3a')); } // hanging door
  else planks(g, 6, 34, 5, 20, C.wood2);
  const sack = (x, y) => { for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) if (!((j === 0 || j === 6) && (i === 0 || i === 5))) g.px(x + i, y + j, sh(hex('#c8b07a'), (i < 3 && j < 3 ? 1.1 : 0.9) - j * 0.02 + (rnd() - 0.5) * 0.08)); g.px(x + 2, y, hex('#6a5030')); g.px(x + 3, y, hex('#6a5030')); };
  const sacks = level === 2 ? [[13, 41], [19, 41], [15, 35], [21, 35], [29, 47], [33, 47], [31, 41]] : level === 1 ? [[13, 47], [20, 47], [30, 47]] : [];
  for (const [x, y] of sacks) sack(x, y);
  const spill = level === 2 ? 26 : level === 1 ? 8 : 0;
  for (let n = 0; n < spill; n++) g.px(ri(10, 34), ri(52, 53), hex(rnd() < 0.5 ? '#e0c060' : '#b89040'));
  ground(g); finish(g);
}
F('granary_full', 40, 56, g => granary(g, 2));
F('granary_half', 40, 56, g => granary(g, 1));
F('granary_empty', 40, 56, g => granary(g, 0));
F('stall', 40, 30, g => {
  g.rect(3, 6, 2, 24, C.timber); g.rect(35, 6, 2, 24, C.timber);
  planks(g, 2, 18, 36, 12, C.wood, false); g.shadeBox(2, 18, 36, 12);
  for (let y = 2; y < 10; y++) for (let x = 0; x < 40; x++) g.px(x, y, sh(((x / 5) | 0) & 1 ? hex('#b03028') : hex('#e0d4b0'), 1 - (y - 2) * 0.03));
  for (let x = 0; x < 40; x += 5) for (let i = 0; i < 4; i++) g.px(x + i, 10, sh(((x / 5) | 0) & 1 ? hex('#b03028') : hex('#e0d4b0'), 0.8)); // scalloped edge
  const goods = ['#c04030', '#d8a030', '#80a040', '#a06030'].map(hex);
  for (let x = 6; x < 34; x += 3) { const c = goods[ri(0, 3)]; g.rect(x, 15, 3, 3, c); g.px(x, 15, sh(c, 1.3)); g.px(x + 2, 17, sh(c, 0.6)); }
  ground(g, 1); finish(g);
});
F('ruin', 48, 50, g => {
  const burnt = hex('#4a4440');
  bricks(g, 3, 20, 42, 30, hex('#6a645c'));
  for (let x = 3; x < 45; x++) { const top = 20 + Math.abs(Math.sin(x * 0.13)) * 10 + ((x * 7) % 3) + (x > 20 && x < 30 ? 9 : 0); for (let y = 20; y < top; y++) g.px(x, y, [0, 0, 0], 0); }
  for (let n = 0; n < 300; n++) { const x = ri(3, 44), y = ri(20, 49), c = g.get(x, y); if (c) g.px(x, y, mix(c, hex('#1a1614'), 0.5)); } // soot
  g.rect(8, 6, 3, 44, burnt); g.rect(36, 12, 3, 38, burnt); g.rect(8, 8, 16, 2, burnt); // charred beams
  for (let i = 0; i < 14; i++) g.px(24 + i, 10 + i, sh(burnt, 0.8));
  window_(g, 12, 36, 5, 6, false);
  for (let n = 0; n < 30; n++) g.rect(ri(2, 44), ri(46, 48), ri(1, 3), 2, sh(C.stone2, 0.5 + rnd() * 0.4)); // rubble
  for (let n = 0; n < 5; n++) g.px(ri(10, 40), 47, hex('#d05020'));
  ground(g); finish(g);
});
function tree(g, cx, base, r, leafC) {
  for (let y = 30; y < 48; y++) { const tw = 2 + (y > 42 ? (y - 42) : 0); for (let x = -tw; x <= tw; x++) g.px(cx + x, y, sh(hex('#4a3424'), x < 0 ? 1.15 : 0.8 + rnd() * 0.15)); }
  for (const [ox, oy, rr] of [[0, 18, r], [-9, 22, r - 3], [9, 22, r - 3], [-5, 11, r - 3], [5, 12, r - 3], [0, 26, r - 4], [-11, 16, r - 5], [11, 17, r - 5]])
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
      if (x * x + y * y > rr * rr - rnd() * rr * 1.5) continue;
      const l = (-x - y) / (2 * rr) + (rnd() - 0.5) * 0.3, cluster = ((cx + ox + x) >> 1 ^ (oy + y) >> 1) & 1;
      g.px(cx + ox + x, oy + y, sh(leafC, (l > 0.3 ? 1.3 : l > 0 ? 1.05 : l > -0.3 ? 0.85 : 0.65) * (cluster ? 1 : 0.93)));
    }
  ground(g, 1); finish(g);
}
F('tree1', 32, 48, g => tree(g, 16, 48, 11, C.leaf));
F('tree2', 32, 48, g => tree(g, 16, 48, 10, hex('#5a6a28')));
F('lamp', 6, 24, g => {
  g.rect(2, 6, 2, 18, C.iron); g.rect(1, 22, 4, 2, C.iron); g.px(2, 6, hex('#6a6a72'));
  g.rect(1, 1, 4, 5, C.dark); g.rect(0, 0, 6, 1, C.iron); g.rect(2, 2, 2, 3, hex('#3a3020'));
  g.lights.push({ x: 2, y: 2, w: 2, h: 3 }); finish(g);
});
F('well', 20, 24, g => {
  g.rect(3, 4, 2, 12, C.timber); g.rect(15, 4, 2, 12, C.timber);
  roof(g, 1, 0, 18, 5, 'tile'); g.rect(5, 6, 10, 1, C.wood); g.rect(9, 7, 1, 5, hex('#a09070')); g.rect(8, 12, 3, 3, C.wood2);
  bricks(g, 1, 15, 18, 9, C.stone, 4, 3); g.shadeBox(1, 15, 18, 9); finish(g);
});
F('dungeon_gate', 36, 30, g => {
  bricks(g, 0, 4, 36, 26, hex('#6a665e'), 5, 4); g.shadeBox(0, 4, 36, 26);
  for (let y = 4; y < 30; y++) for (let x = 0; x < 36; x++) { const dx = x - 17.5, dy = y - 14; if (!(y > 14 && Math.abs(dx) < 12 || dx * dx + dy * dy < 144)) { if (y < 10 && dx * dx + (y - 16) ** 2 > 400) g.px(x, y, [0, 0, 0], 0); continue; } g.px(x, y, mix(hex('#2a2420'), hex('#000000'), Math.min(1, (y - 2) / 22))); }
  for (let s = 0; s < 5; s++) { const y = 18 + s * 2, inset = s * 2; g.rect(7 + inset, y, 22 - inset * 2, 1, sh(C.stone, 0.75 - s * 0.12)); g.rect(7 + inset, y + 1, 22 - inset * 2, 1, sh(C.stone, 0.35 - s * 0.05)); } // steps into darkness
  for (let a = 0; a < 9; a++) { const t = Math.PI + a * Math.PI / 8; g.rect(17.5 + Math.cos(t) * 13 - 1, 14 + Math.sin(t) * 13 - 1, 3, 3, sh(C.stone, 1.15)); } // voussoirs
  g.rect(16, 0, 4, 3, sh(C.stone, 1.1)); finish(g);
});
F('grave', 8, 10, g => { for (let y = 1; y < 10; y++) for (let x = 1; x < 7; x++) if (!(y === 1 && (x === 1 || x === 6))) g.px(x, y, sh(C.stone, x < 3 ? 1.15 : 0.85 + rnd() * 0.1)); g.rect(3, 4, 2, 1, C.stone2); g.rect(0, 9, 8, 1, C.grass); finish(g); });
F('cross', 8, 12, g => { g.rect(3, 1, 2, 11, C.wood); g.rect(1, 3, 6, 2, C.wood); g.px(3, 1, sh(C.wood, 1.3)); g.px(1, 3, sh(C.wood, 1.3)); g.rect(0, 11, 8, 1, C.grass); finish(g); });

// --- pack (shelf packer, widest first) ---
const W = 1024, names = Object.keys(frames).sort((a, b) => frames[b].h - frames[a].h);
let x = 0, y = 0, rowH = 0; const pos = {};
for (const n of names) { const f = frames[n]; if (x + f.w > W) { x = 0; y += rowH + 1; rowH = 0; } pos[n] = [x, y]; x += f.w + 1; rowH = Math.max(rowH, f.h); }
const H = y + rowH, sheet = new Uint8Array(W * H * 4);
const json = { image: 'town.png', frames: {}, anims: {} };
for (const n of Object.keys(frames)) {
  const f = frames[n], [fx, fy] = pos[n];
  for (let j = 0; j < f.h; j++) sheet.set(f.d.subarray(j * f.w * 4, (j + 1) * f.w * 4), ((fy + j) * W + fx) * 4);
  const e = { x: fx, y: fy, w: f.w, h: f.h, ax: f.w >> 1, ay: f.h };
  if (f.lights.length) e.lights = f.lights;
  if (f.clock) e.clock = f.clock;
  json.frames[n] = e;
}
for (const n of ['hills', 'ground']) { const f = frames[n]; for (let i = 3; i < f.d.length; i += 4) console.assert(n !== 'ground' || f.d[i] === 255, n + ' must be opaque'); }

// --- PNG writer ---
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = ~0; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0; };
const chunk = (t, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(t), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc(H * (W * 4 + 1)); for (let j = 0; j < H; j++) Buffer.from(sheet.buffer, j * W * 4, W * 4).copy(raw, j * (W * 4 + 1) + 1);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'town.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
fs.writeFileSync(path.join(OUT, 'town.json'), JSON.stringify(json, null, 1));
console.log('town.png', W + 'x' + H, Object.keys(frames).length, 'frames');
