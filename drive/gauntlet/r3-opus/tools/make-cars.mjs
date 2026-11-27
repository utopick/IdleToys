// Procedural pixel-art vehicles -> art/cars.png + art/cars.json. Run: node tools/make-cars.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'art');

let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const cl = v => Math.max(0, Math.min(255, Math.round(v)));
const sh = (c, f) => c.map(v => cl(v * f));
const mix = (a, b, t) => a.map((v, i) => cl(v + (b[i] - v) * t));
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));

function frame(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  const f = {
    w, h, d,
    px(x, y, c, a = 1) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      const i = (y * w + x) * 4, ea = d[i + 3] / 255, na = a + ea * (1 - a);
      for (let k = 0; k < 3; k++) d[i + k] = (c[k] * a + d[i + k] * ea * (1 - a)) / (na || 1);
      d[i + 3] = na * 255;
    },
    has: (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0,
    rect(x0, y0, x1, y1, fn) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = fn(x, y); if (c) f.px(x, y, c[0] ? c : c.c, c.a ?? 1); } },
    poly(pts, fn) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
        for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
          let ins = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) ins = !ins;
          }
          if (ins) { const c = fn(x, y); if (c) f.px(x, y, c[0] ? c : c.c, c.a ?? 1); }
        }
    },
    ell(cx, cy, rx, ry, fn) { f.rect(Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(cx + rx), Math.ceil(cy + ry), (x, y) => { const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; return q <= 1 ? fn(x, y, q) : null; }); },
    glow(cx, cy, r, c, s = 1) { f.rect(Math.floor(cx - r), Math.floor(cy - r), Math.ceil(cx + r), Math.ceil(cy + r), (x, y) => { const q = Math.hypot(x - cx, y - cy) / r; return q < 1 ? { c, a: s * (1 - q) ** 2 } : null; }); },
    line(x0, y0, x1, y1, c, a = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) f.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c, a); },
  };
  return f;
}
// dark outline around opaque pixels (PSX-style crisp silhouette)
function outline(f, c = [14, 14, 20]) {
  const m = []; for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!f.has(x, y) && (f.has(x - 1, y) || f.has(x + 1, y) || f.has(x, y - 1) || f.has(x, y + 1))) m.push([x, y]);
  for (const [x, y] of m) f.px(x, y, c, 0.85);
}

const GLASS = [[34, 40, 54], [70, 86, 110], [150, 170, 190]];
const glassC = (x, y, y0, y1, k = 0) => {
  const t = (y - y0) / Math.max(1, y1 - y0);
  let c = mix(GLASS[1], GLASS[0], t);
  const s = (x * 0.9 + y * 1.6 + k) % 14; // diagonal sky reflections
  if (s < 2) c = mix(c, GLASS[2], 0.55); else if (s < 3) c = mix(c, GLASS[2], 0.25);
  if (t < 0.2) c = mix(c, GLASS[2], 0.2);
  return c;
};

// ---------- rear-view car ----------
function backCar(w, h, o) {
  const f = frame(w, h), cx = w / 2, P = hex(o.paint);
  const bot = h - 4, bw = o.bw ?? w - 6, bx0 = Math.round(cx - bw / 2), bx1 = Math.round(cx + bw / 2) - 1;
  const belt = o.belt ?? h - 20, roofTop = o.roof ?? 4, rw = o.rw ?? bw - 14;
  // ground shadow
  f.ell(cx, h - 2.5, w / 2 - 1, 2.5, (x, y, q) => ({ c: [0, 0, 0], a: 0.55 * (1 - q * 0.6) }));
  // tyres
  for (const tx of [bx0 + 1, bx1 - 6]) f.rect(tx, bot - 6, tx + 5, h - 2, (x, y) => mix([22, 22, 26], [52, 52, 58], ((x - tx) === 1 || (x - tx) === 4) ? 0.6 : 0.1 + dith(x, y) * 0.2));
  // lower body
  f.rect(bx0, belt, bx1, bot - 2, (x, y) => {
    const u = (x - bx0) / (bx1 - bx0), e = Math.abs(u - 0.5) * 2, t = (y - belt) / (bot - 2 - belt);
    let k = 1.18 - t * 0.45 - e ** 3 * 0.35 + (dith(x, y) - 0.5) * 0.08 + (rnd() - 0.5) * 0.04;
    if (y === belt) k = 1.45; else if (y === belt + 1) k = 1.25;
    if (o.fins && e > 0.86 && y < belt + 4) k += 0.1;
    if (x === bx0 || x === bx1) k *= 0.6;
    return sh(P, k);
  });
  // greenhouse: pillars + glass
  const gt = roofTop, gb = belt - 1, rx0 = Math.round(cx - rw / 2), rx1 = Math.round(cx + rw / 2) - 1, sl = o.slope ?? 3;
  f.poly([[rx0, gt], [rx1 + 1, gt], [bx1 - 1 + .5, gb + 1], [bx0 + 1 - .5, gb + 1]], (x, y) => sh(P, 1.05 - (y - gt) * 0.015 - Math.abs(x - cx) / bw * 0.3));
  f.rect(rx0 + 1, gt, rx1 - 1, gt, () => sh(P, 1.5)); // roof highlight
  f.rect(rx0 + 1, gt + 1, rx1 - 1, gt + 1, () => sh(P, 1.25));
  const wt = gt + 2, wb = gb - (o.deck ?? 1);
  f.poly([[rx0 + 2, wt], [rx1 - 1, wt], [bx1 - sl - .5, wb + 1], [bx0 + sl + 1.5, wb + 1]], (x, y) => glassC(x, y, wt, wb));
  if (o.wiper) f.line(cx - 6, wb, cx + 2, wb - 2, [20, 20, 24]);
  if (o.spoiler) f.rect(bx0 + 3, wb + 1, bx1 - 3, wb + 2, (x, y) => y === wb + 1 ? sh(P, 1.3) : sh(P, 0.55));
  // tail lights
  const ly = belt + (o.ly ?? 2), lh = o.lh ?? 3, lw = o.lw ?? 8;
  const lights = o.bar ? [[bx0 + 1, bx1 - 1]] : [[bx0 + 1, bx0 + lw], [bx1 - lw, bx1 - 1]];
  for (const [a, b] of lights) f.rect(a, ly, b, ly + lh - 1, (x, y) => {
    if (o.bar && x > a + lw && x < b - lw) return mix([60, 10, 14], [110, 20, 26], (y - ly) / lh * .3);
    const inner = (y - ly) / Math.max(1, lh - 1), amber = !o.bar && ((a < cx && x > b - 2) || (a > cx && x < a + 2));
    let c = amber ? [190, 110, 30] : mix([210, 40, 40], [130, 14, 20], inner);
    if (y === ly) c = mix(c, [255, 190, 180], 0.45);
    if ((x + y) % 3 === 0) c = sh(c, 0.85); // lens facets
    return c;
  });
  // bumper + plate
  f.rect(bx0, bot - 3, bx1, bot, (x, y) => sh(o.chrome ? [150, 155, 165] : [44, 44, 50], y === bot - 3 ? 1.5 : 1 - (y - bot + 3) * 0.12));
  const pw = o.pw ?? 11, px0 = Math.round(cx - pw / 2), py = o.py ?? bot - 6;
  f.rect(px0, py, px0 + pw - 1, py + 3, (x, y) => (x === px0 || x === px0 + pw - 1 || y === py || y === py + 3) ? [70, 70, 76] : ((x * 7 + y * 3) % 5 < 2 ? [40, 44, 60] : [222, 222, 210]));
  f.rect(px0 + 2, py - 1, px0 + pw - 3, py - 1, () => [24, 24, 28]); // plate lamp housing
  if (o.exhaust) f.rect(bx1 - 9, bot + 1, bx1 - 7, bot + 1, () => [90, 90, 96]);
  if (o.badge) f.px(cx, belt + 3, [220, 220, 230]);
  outline(f);
  // lit layer
  const L = frame(w, h);
  for (const [a, b] of lights) {
    for (let x = a; x <= b; x += 2) L.glow(x, ly + lh / 2, 5, [255, 30, 30], 0.35);
    L.rect(a, ly, b, ly + lh - 1, (x) => (o.bar && x > a + lw && x < b - lw) ? { c: [255, 40, 40], a: 0.6 } : [255, mix([90], [200], 0)[0], 80]);
  }
  for (const [a, b] of lights) L.rect(a + 1, ly, b - 1, ly, () => [255, 200, 190]);
  L.rect(px0 + 1, py, px0 + pw - 2, py + 1, () => ({ c: [255, 250, 225], a: 0.6 }));
  L.glow(cx, py, 4, [255, 245, 220], 0.4);
  if (o.police) {
    for (const [x0, c] of [[cx - 7, [40, 80, 255]], [cx + 1, [255, 30, 30]]]) { L.glow(x0 + 3, roofTop - 1, 9, c, 0.6); L.rect(x0, roofTop - 2, x0 + 5, roofTop - 1, () => mix(c, [255, 255, 255], 0.4)); }
  }
  return [f, L];
}

// ---------- rear-view trucks ----------
function truck(kind) {
  const w = 64, h = 60, f = frame(w, h), cx = w / 2;
  f.ell(cx, h - 3, w / 2 - 1, 3, (x, y, q) => ({ c: [0, 0, 0], a: 0.55 * (1 - q * 0.6) }));
  for (const tx of [4, 11, 47, 54]) f.rect(tx, 46, tx + 5, h - 3, (x, y) => mix([22, 22, 26], [56, 56, 62], ((x - tx) % 3 === 1) ? 0.5 : dith(x, y) * 0.25));
  if (kind === 0) { // box truck
    const B = [214, 208, 196];
    f.rect(2, 2, 61, 44, (x, y) => {
      let k = 1.05 - (y / 44) * 0.18 - (Math.abs(x - cx) / 32) ** 4 * 0.3 + (dith(x, y) - .5) * .05;
      if (x === 31 || x === 32) k = x === 31 ? 0.55 : 1.15; // door seam
      if (y === 2 || y === 44 || x === 2 || x === 61) k = 0.62;
      if ((x === 14 || x === 49) && y > 6 && y < 40) k *= 0.8; // lock rods
      if ((y === 12 || y === 34) && (x === 13 || x === 14 || x === 49 || x === 50)) k = 0.4;
      if (y > 3 && y < 7) k += 0.06;
      return sh(B, k);
    });
    f.rect(6, 20, 26, 26, (x, y) => (y === 20 || y === 26) ? [40, 90, 150] : sh([60, 130, 190], 1 - (y - 20) * 0.05)); // generic livery stripe
    f.rect(37, 20, 57, 26, (x, y) => (y === 20 || y === 26) ? [40, 90, 150] : sh([60, 130, 190], 1 - (y - 20) * 0.05));
  } else { // tanker
    const S = [178, 186, 196];
    f.rect(6, 41, 57, 45, (x, y) => sh([60, 62, 68], 1 - (y - 41) * 0.08));
    f.ell(cx, 22, 28, 20, (x, y, q) => {
      const nx = (x - cx) / 28, ny = (y - 22) / 20;
      let k = 0.55 + 0.6 * Math.max(0, 1 - Math.hypot(nx + 0.35, ny + 0.4)) + (dith(x, y) - .5) * .08;
      if (q > 0.82) k *= 0.75; if (q > 0.93) k = 0.5;
      const ref = Math.abs(nx + 0.3 - ny * 0.2); if (ref < 0.05) k += 0.4;
      return sh(S, k);
    });
    f.ell(cx, 22, 8, 6, (x, y, q) => sh(S, q > 0.6 ? 0.6 : 0.9)); // hatch
    f.rect(cx - 1, 2, cx, 40, (x, y) => y % 4 === 0 ? [70, 70, 76] : [120, 124, 130]); // ladder
    f.rect(cx + 6, 34, cx + 14, 39, (x, y) => (x + y) % 2 ? [230, 140, 30] : [30, 30, 30]); // hazard plate
  }
  // bumper bar, lights, plate
  f.rect(2, 45, 61, 48, (x, y) => (x % 6 < 3) ? [200, 60, 50] : [225, 225, 225]);
  f.rect(2, 49, 61, 50, () => [40, 40, 46]);
  const lights = [[4, 12], [51, 59]];
  for (const [a, b] of lights) f.rect(a, 39, b, 43, (x, y) => (x - a < 3 && a < cx) || (b - x < 3 && a > cx) ? [200, 120, 30] : mix([215, 40, 40], [120, 12, 18], (y - 39) / 4));
  f.rect(26, 39, 37, 43, (x, y) => (x === 26 || x === 37 || y === 39 || y === 43) ? [70, 70, 76] : ((x * 7 + y * 3) % 5 < 2 ? [40, 44, 60] : [224, 214, 120]));
  outline(f);
  const L = frame(w, h);
  for (const [a, b] of lights) { for (let x = a; x <= b; x += 2) L.glow(x, 41, 6, [255, 30, 30], 0.35); L.rect(a, 39, b, 43, () => [255, 80, 70]); L.rect(a + 1, 39, b - 1, 39, () => [255, 200, 190]); }
  L.rect(27, 40, 36, 41, () => ({ c: [255, 250, 225], a: 0.6 })); L.glow(cx, 39, 5, [255, 245, 220], 0.4);
  for (const x of [3, 60]) { L.px(x, 3, [255, 150, 40]); L.glow(x, 3, 3, [255, 140, 40], 0.5); } // clearance markers
  return [f, L];
}

// ---------- hero side ----------
const HERO = hex('#c4123a');
function heroSide() {
  const w = 176, h = 56, f = frame(w, h);
  f.ell(88, 52, 84, 3.5, (x, y, q) => ({ c: [0, 0, 0], a: 0.6 * (1 - q * 0.5) }));
  const body = [[5, 27], [30, 24], [56, 15], [94, 14], [118, 25], [168, 33], [173, 36], [172, 41], [168, 46], [8, 46], [4, 42]];
  f.poly(body, (x, y) => {
    let k = 1.15 - (y - 14) * 0.012 + (dith(x, y) - .5) * 0.07;
    if (y >= 40) k = 0.62 - (y - 40) * 0.03;           // lower sill in shadow
    if (y === 35 || y === 36) k = y === 35 ? 0.7 : 1.3; // side strake
    const ty = 27 + (x - 30) * 0.055;                   // long shoulder reflection
    if (Math.abs(y - ty) < 0.8) k = 1.7; else if (Math.abs(y - ty) < 1.8) k = 1.35;
    if (y > 37 && y < 40 && ((x + y * 2) % 23) < 8) k += 0.25; // sky glints on the flank
    return sh(HERO, k);
  });
  // glass: black with streaks
  f.poly([[34, 24], [57, 17], [92, 16], [113, 25], [86, 26]], (x, y) => { const c = glassC(x, y, 16, 26, 3); return sh(c, 0.55); });
  f.line(84, 17, 85, 26, sh(HERO, 0.5)); // B pillar
  f.line(83, 17, 84, 26, [10, 10, 14]);
  // door cut, handle, mirror
  f.line(86, 27, 87, 40, sh(HERO, 0.6)); f.line(54, 27, 54, 40, sh(HERO, 0.6));
  f.rect(76, 29, 80, 29, () => [30, 30, 34]);
  f.poly([[106, 24], [112, 22], [114, 26], [108, 27]], (x, y) => sh(HERO, 0.9 + (26 - y) * 0.1));
  // raised pop-up headlight pod
  f.poly([[142, 29], [146, 24], [158, 25.5], [158, 31]], (x, y) => sh(HERO, 1.1 - (y - 24) * 0.05));
  f.rect(157, 26, 158, 30, () => [220, 222, 210]);
  // nose: bumper, intake, indicator
  f.rect(160, 39, 171, 41, (x, y) => [26, 26, 30]);
  f.rect(166, 35, 170, 36, () => [230, 150, 40]);
  // rear: spoiler, tail light, exhaust
  f.poly([[3, 22], [22, 21], [22, 24], [5, 26]], (x, y) => sh(HERO, y === 21 || y === 22 ? 1.4 : 0.7));
  f.rect(4, 28, 7, 32, (x, y) => mix([220, 40, 40], [130, 14, 20], (y - 28) / 4));
  f.rect(10, 45, 16, 46, () => [110, 110, 116]);
  // wheels: arch cutout, tyre, alloy with spokes
  for (const wx of [37, 139]) {
    f.ell(wx, 44, 13, 12, (x, y) => y < 47 ? [12, 10, 14] : null);
    f.ell(wx, 44, 10.5, 10.5, (x, y, q) => {
      const r = Math.sqrt(q) * 10.5, a = Math.atan2(y - 44, x - wx);
      if (r > 7.5) return sh([38, 38, 44], r > 9.6 ? 0.6 : 1 + ((Math.round(a * 6)) % 2) * 0.15); // tread
      if (r > 6.6) return [120, 124, 132];
      if (r < 1.5) return [60, 60, 66];
      const spoke = Math.cos(a * 5) > 0.35;
      const lit = 0.75 + 0.45 * Math.max(0, -Math.sin(a + 0.8));
      return spoke ? sh([190, 194, 204], lit) : [30, 30, 36];
    });
    f.line(wx - 5, 37, wx - 2, 36, [235, 238, 245], 0.8);
  }
  outline(f);
  const L = frame(w, h);
  L.glow(160, 28, 16, [255, 245, 200], 0.55); L.rect(157, 26, 159, 30, () => [255, 255, 235]);
  for (let i = 0; i < 18; i++) L.rect(160 + i, 27 - i * 0.15, 160 + i, 29 + i * 0.25, () => ({ c: [255, 245, 210], a: 0.35 * (1 - i / 18) }));
  L.glow(5, 30, 8, [255, 30, 30], 0.6); L.rect(4, 28, 7, 32, () => [255, 80, 70]);
  L.glow(168, 36, 4, [255, 160, 40], 0.5);
  return [f, L];
}

// ---------- driver ----------
function driver(alt) {
  const w = 28, h = 60, f = frame(w, h);
  const lean = y => (58 - y) * -0.1; // top leans back (left)
  const J = [48, 58, 52], Jh = [86, 100, 86], skin = [214, 164, 124], skinD = [168, 118, 88], pants = [44, 50, 74], hair = [36, 24, 20];
  f.ell(14, 58.5, 10, 1.5, (x, y, q) => ({ c: [0, 0, 0], a: 0.5 }));
  // legs, feet forward (right), body leaning back against car at the left
  f.poly([[9, 36], [15, 36], [19, 56], [15, 56]], (x, y) => sh(pants, 1 - (x - 9) * 0.03 + dith(x, y) * .1));
  f.poly([[7, 36], [12, 36], [14, 56], [10, 56]], (x, y) => sh(pants, 0.7));
  for (const [x0, k] of [[9, 0.8], [14, 1]]) { f.rect(x0, 55, x0 + 7, 57, (x, y) => y === 57 ? [70, 70, 74] : (y === 55 && x < x0 + 3 ? [200, 60, 50] : sh([236, 236, 230], k))); }
  // torso (bomber): ribbed hem and cuffs
  f.poly([[6 + lean(20), 20], [15 + lean(20), 20], [16 + lean(37), 37], [7, 37]], (x, y) => {
    let c = sh(J, 1.15 - Math.abs(x - 11) * 0.03 + (dith(x, y) - .5) * .1);
    if (y >= 35) c = sh(J, (x % 2) ? 0.65 : 0.8);
    if (x === Math.round(12 + lean(y) * 0.5)) c = sh(J, 0.6); // zip
    return c;
  });
  f.rect(6, 21, 7, 34, (x, y) => sh(Jh, 0.9)); // highlight edge
  // bag strap across chest + bag at hip
  f.line(6 + lean(20), 21, 15, 34, [120, 84, 44]); f.line(7 + lean(20), 21, 16, 34, [150, 110, 60]);
  f.rect(1, 32, 6, 39, (x, y) => sh([70, 78, 60], 1 - (y - 32) * 0.04 + (x === 1 ? -0.3 : 0)));
  // arm
  if (!alt) { f.poly([[10, 22], [14, 22], [15, 34], [12, 34]], (x, y) => sh(J, 0.85)); f.rect(12, 34, 15, 37, (x, y) => y < 36 ? [24, 24, 28] : skin); }
  else {
    f.poly([[11, 22], [14, 22], [19, 27], [18, 30]], (x, y) => sh(J, 0.85));
    f.poly([[17, 27], [20, 24], [21, 21], [19, 21]], (x, y) => sh(J, 0.8));
    f.rect(19, 18, 21, 21, (x, y) => y > 19 ? [24, 24, 28] : skin);                 // fingerless glove
    f.rect(20, 14, 23, 19, (x, y) => y === 14 ? [240, 240, 236] : (y === 15 ? [80, 50, 30] : (x === 23 ? [180, 170, 160] : [224, 220, 210]))); // cup
    f.px(21, 12, [220, 220, 220], 0.4); f.px(22, 11, [220, 220, 220], 0.3); // steam
  }
  // neck + head profile facing right
  const hx = alt ? -1 : 0, hy = alt ? 1 : 0;
  f.rect(10 + hx, 17 + hy, 12 + hx, 20, () => skinD);
  f.ell(11 + hx, 11 + hy, 4.6, 5.4, (x, y) => sh(skin, 1.05 - (11 + hx - x) * 0.04));
  f.px(16 + hx, 11 + hy, skin); f.px(16 + hx, 12 + hy, skinD);                 // nose
  f.px(14 + hx, 10 + hy, [30, 20, 20]);                                         // eye
  f.px(15 + hx, 14 + hy, [150, 80, 70]);                                        // mouth
  f.px(14 + hx, 15 + hy, skinD); f.px(13 + hx, 16 + hy, skinD);                 // jaw
  f.px(10 + hx, 11 + hy, skinD);                                                // ear
  f.ell(10 + hx, 8 + hy, 5, 3.4, (x, y) => y < 9 + hy || x < 9 + hx ? sh(hair, 1 + (y % 2) * 0.3) : null);
  f.rect(6 + hx, 9 + hy, 8 + hx, 14 + hy, (x, y) => (x + y) % 3 ? hair : sh(hair, 1.6));
  f.px(14 + hx, 6 + hy, sh(hair, 1.8)); f.px(15 + hx, 7 + hy, hair);         // fringe
  // collar
  f.rect(9 + lean(20), 19, 14 + lean(20), 20, () => sh(J, 0.6));
  outline(f);
  return f;
}

function cat(alt) {
  const f = frame(18, 16), C = [70, 66, 72];
  f.ell(9, 15, 7, 1, () => ({ c: [0, 0, 0], a: 0.45 }));
  f.ell(8, 10.5, 4.5, 4.5, (x, y) => sh(C, 1.1 - (y - 7) * 0.05 + (x % 3 === 0 && y > 8 ? -0.12 : 0)));
  f.ell(10, 5.5, 3, 2.8, (x, y) => sh(C, 1.15 - (y - 3) * 0.04));
  f.px(8, 2, C); f.px(8, 3, C); f.px(12, 2, C); f.px(12, 3, C); f.px(8, 3, [180, 120, 120]);
  f.px(11, 5, [190, 220, 80]); f.px(13, 6, [40, 30, 30]);
  f.rect(9, 13, 10, 14, () => sh(C, 1.3));
  const tail = alt ? [[4, 14], [2, 13], [1, 11], [1, 8], [2, 6]] : [[4, 14], [6, 14], [8, 14], [10, 14], [12, 14], [13, 13]];
  for (const [x, y] of tail) f.px(x, y, sh(C, 0.9));
  outline(f);
  return f;
}

function parcel() {
  const f = frame(16, 12), K = [182, 138, 88];
  f.ell(8, 11, 7.5, 1, () => ({ c: [0, 0, 0], a: 0.45 }));
  f.poly([[1, 4], [4, 1], [15, 1], [12, 4]], (x, y) => sh(K, 1.2));          // top
  f.rect(1, 4, 11, 10, (x, y) => sh(K, 1 - (y - 4) * 0.02 + (dith(x, y) - .5) * .06)); // front
  f.poly([[12, 4], [15, 1], [15, 7], [12, 10.9]], (x, y) => sh(K, 0.72));      // side
  f.rect(5, 4, 6, 10, () => [200, 190, 150]); f.poly([[6, 1], [9, 1], [7, 4], [4, 4]], () => [214, 204, 166]); // tape
  f.rect(8, 6, 10, 7, () => [235, 235, 228]);                                 // label
  outline(f);
  return f;
}

// ---------- build ----------
const MODELS = [
  { name: 'hatch', paint: '#2f6fb3', bw: 46, rw: 30, belt: 18, roof: 6, slope: 2, deck: 0, wiper: 1, lw: 6, lh: 5, ly: 0 },
  { name: 'sedan', paint: '#c8c4b8', bw: 50, rw: 32, belt: 17, roof: 7, slope: 4, deck: 2, lw: 9, lh: 3, chrome: 1, badge: 1 },
  { name: 'wagon', paint: '#3d6b45', bw: 50, rw: 40, belt: 18, roof: 4, slope: 1, deck: 0, wiper: 1, lw: 5, lh: 6, ly: -1 },
  { name: 'coupe', paint: '#e0b020', bw: 50, rw: 28, belt: 19, roof: 9, slope: 6, deck: 2, bar: 1, lw: 8, lh: 3, exhaust: 1 },
  { name: 'van', paint: '#e6e6e0', bw: 46, rw: 40, belt: 20, roof: 2, slope: 1, deck: 0, wiper: 1, lw: 4, lh: 8, ly: -4 },
  { name: 'sport', paint: '#d04a1c', bw: 52, rw: 26, belt: 20, roof: 10, slope: 7, deck: 1, spoiler: 1, lw: 10, lh: 3, exhaust: 1, fins: 1 },
];
const items = [];
MODELS.forEach((m, i) => { const [a, b] = backCar(56, 36, m); items.push([`car${i}`, a], [`car${i}_lit`, b]); });
[0, 1].forEach(k => { const [a, b] = truck(k); items.push([`truck${k}`, a], [`truck${k}_lit`, b]); });
{ const [a, b] = backCar(56, 36, { paint: '#1c2230', bw: 50, rw: 32, belt: 18, roof: 8, slope: 4, deck: 2, lw: 9, lh: 3, police: 1, badge: 1 });
  a.rect(18, 5, 23, 6, (x, y) => y === 5 ? [120, 150, 255] : [40, 60, 160]); a.rect(24, 5, 29, 6, (x, y) => y === 5 ? [255, 130, 130] : [150, 20, 20]); // light bar
  a.rect(6, 22, 49, 22, () => [230, 230, 230]); // white stripe
  items.push(['police', a], ['police_lit', b]); }
{ const [a, b] = heroSide(); items.push(['hero_side', a], ['hero_side_lit', b]); }
{ const [a, b] = backCar(72, 40, { paint: '#c4123a', bw: 66, rw: 34, belt: 21, roof: 8, slope: 8, deck: 2, bar: 1, lw: 12, lh: 4, ly: 1, spoiler: 1, exhaust: 1, pw: 13 }); items.push(['hero_back', a], ['hero_back_lit', b]); }
items.push(['driver_lean', driver(0)], ['driver_lean2', driver(1)], ['cat', cat(0)], ['cat2', cat(1)], ['parcel', parcel()]);


// shelf packing, 512 wide, 2 px gaps
const SW = 512, G = 2, frames = {};
let x = G, y = G, rowH = 0;
for (const [n, f] of items) {
  if (x + f.w + G > SW) { x = G; y += rowH + G; rowH = 0; }
  frames[n] = { x, y, w: f.w, h: f.h, ax: f.w / 2, ay: f.h }; f.ox = x; f.oy = y;
  x += f.w + G; rowH = Math.max(rowH, f.h);
}
const SH = y + rowH + G, img = new Uint8Array(SW * SH * 4);
for (const [, f] of items) for (let j = 0; j < f.h; j++) img.set(f.d.subarray(j * f.w * 4, (j + 1) * f.w * 4), ((f.oy + j) * SW + f.ox) * 4);

const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length); b.write(t, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SW); ihdr.writeUInt32BE(SH, 4); ihdr.set([8, 6, 0, 0, 0], 8);
const raw = Buffer.alloc(SH * (SW * 4 + 1));
for (let j = 0; j < SH; j++) Buffer.from(img.buffer, j * SW * 4, SW * 4).copy(raw, j * (SW * 4 + 1) + 1);
writeFileSync(join(OUT, 'cars.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
writeFileSync(join(OUT, 'cars.json'), JSON.stringify({ image: 'cars.png', frames, anims: { driver: { frames: ['driver_lean', 'driver_lean2'], fps: 0.5 }, cat: { frames: ['cat', 'cat2'], fps: 1 } } }, null, 1));
console.log(`cars.png ${SW}x${SH}, ${items.length} frames`);
