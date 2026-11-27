// Draws the Drive car/driver/cat sprites into art/cars.png + art/cars.json. Plain Node, no packages.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ART = join(dirname(fileURLToPath(import.meta.url)), '..', 'art');

// ---- tiny raster ----
const img = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)).concat(255);
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const dith = (x, y, t) => t > BAY[(y & 3) * 4 + (x & 3)];
function px(b, x, y, c) { x |= 0; y |= 0; if (!c || x < 0 || y < 0 || x >= b.w || y >= b.h) return; const i = (y * b.w + x) * 4; b.d.set(c, i); }
// fill rows y0..y1, span(y)->[xl,xr], col(x,y,u,v)->color (u,v in 0..1 across the shape)
function fill(b, y0, y1, span, col) {
  for (let y = y0; y <= y1; y++) { const [l, r] = span(y); for (let x = Math.round(l); x <= Math.round(r); x++) px(b, x, y, typeof col === 'function' ? col(x, y, (x - l) / Math.max(1, r - l), (y - y0) / Math.max(1, y1 - y0)) : col); }
}
const rect = (b, x, y, w, h, c) => fill(b, y, y + h - 1, () => [x, x + w - 1], c);
const trap = (b, y0, y1, tl, tr, bl, br, c) => fill(b, y0, y1, y => { const t = (y - y0) / Math.max(1, y1 - y0); return [tl + (bl - tl) * t, tr + (br - tr) * t]; }, c);
function ell(b, cx, cy, rx, ry, c) { fill(b, Math.ceil(cy - ry), Math.floor(cy + ry), y => { const k = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) * rx; return [cx - k, cx + k]; }, c); }
// vertical ramp with dithered steps
const vramp = (cols) => (x, y, u, v) => { const f = v * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(f)); return dith(x, y, f - i) ? cols[i + 1] : cols[i]; };
const shades = (c) => { const b = hex(c), W = [255, 255, 255], K = [10, 4, 24]; return { hi2: mix(b, W, .7), hi: mix(b, W, .35), mid: b, lo: mix(b, K, .35), lo2: mix(b, K, .6), ink: mix(b, K, .82) }; };

// palette
const SKY = ['#3a1e6e', '#7a3a8e', '#d85a8a', '#ffa86a', '#ffd9a0'].map(hex);
const RUB = ['#3a3644', '#24202c', '#141018', '#08060c'].map(hex);
const CHR = ['#ffffff', '#c8d0e0', '#7a809a', '#3a3c52', '#9aa4c0'].map(hex);
const DARK = hex('#120c1c'), GRIM = hex('#2a2434'), PLATE = hex('#d8d4c4'), PLATE2 = hex('#a8a498');
const RED = ['#ffd0c0', '#ff4a3a', '#c8141e', '#6a0812'].map(hex), AMB = hex('#ffa02a');

function glass(b, y0, y1, tl, tr, bl, br) {
  trap(b, y0, y1, tl, tr, bl, br, (x, y, u, v) => {
    const s = (u * 0.6 + v * 0.4 + ((x + y) % 23 < 2 ? -.4 : 0)); // sky reflection + a streak
    const f = Math.max(0, Math.min(1, 1 - v)) * 3.99, i = Math.floor(f);
    let c = dith(x, y, f - i) ? SKY[Math.min(4, i + 1)] : SKY[i];
    if (s < 0.2 && v < .7) c = mix(c, [255, 255, 255], .35);
    if (v > .75) c = mix(c, DARK, .5);
    return c;
  });
  trap(b, y0, y0, tl, tr, tl, tr, DARK);
}
function tyre(b, x, y, w, h) { rect(b, x, y, w, h, vramp(RUB)); rect(b, x, y, w, 1, RUB[0]); for (let i = 2; i < h; i += 3) rect(b, x + 1, y + i, w - 2, 1, RUB[3]); }
function plate(b, cx, y, w = 16, h = 6) { rect(b, cx - w / 2 - 1, y - 1, w + 2, h + 2, DARK); rect(b, cx - w / 2, y, w, h, PLATE); rect(b, cx - w / 2, y + h - 1, w, 1, PLATE2); rect(b, cx - w / 2, y, 1, 1, PLATE2); }
function tail(b, x, y, w, h) { rect(b, x - 1, y - 1, w + 2, h + 2, DARK); rect(b, x, y, w, h, vramp([RED[1], RED[2], RED[3]])); rect(b, x + 1, y + 1, Math.max(1, w - 3), 1, RED[0]); }

// generic rear-view car. m: {bw: body width, bt: body top y, ct: cabin top y, cw: cabin top half-width, cb: cabin bottom half-width, paint, tl:[w,h], van}
function rearCar(W, H, m) {
  const b = img(W, H), cx = W / 2, P = shades(m.paint), hb = m.bw / 2;
  // shadow on road
  ell(b, cx, H - 2, hb + 2, 2.5, [0, 0, 0, 255].map((v, i) => i < 3 ? 8 : 110));
  tyre(b, cx - hb + 2, H - 10, 10, 9); tyre(b, cx + hb - 12, H - 10, 10, 9);
  // cabin pillars + roof
  trap(b, m.ct, m.bt, cx - m.cw, cx + m.cw, cx - m.cb, cx + m.cb, vramp([P.hi, P.mid, P.lo]));
  rect(b, cx - m.cw + 1, m.ct, m.cw * 2 - 2, 1, P.hi2);
  glass(b, m.ct + 2, m.bt - 2, cx - m.cw + 3, cx + m.cw - 3, cx - m.cb + 4, cx + m.cb - 4);
  // body
  const by1 = H - 6;
  fill(b, m.bt, by1, y => { const r = y - m.bt < 2 ? 2 - (y - m.bt) : 0; return [cx - hb + r, cx + hb - r]; }, (x, y, u, v) => {
    let c = vramp([P.hi2, P.hi, P.mid, P.mid, P.lo, P.lo2])(x, y, u, v);
    if (u < .06 || u > .94) c = P.lo2; else if (u < .12 || u > .88) c = mix(c, P.lo, .5);
    return c;
  });
  rect(b, cx - hb + 3, m.bt + 1, m.bw - 6, 1, P.hi2); // crease highlight
  const tlY = m.bt + (m.tlY ?? 4);
  tail(b, cx - hb + 2, tlY, m.tl[0], m.tl[1]); tail(b, cx + hb - 2 - m.tl[0], tlY, m.tl[0], m.tl[1]);
  if (m.amber) { rect(b, cx - hb + 2, tlY + m.tl[1], m.tl[0], 2, AMB); rect(b, cx + hb - 2 - m.tl[0], tlY + m.tl[1], m.tl[0], 2, AMB); }
  if (m.van) { rect(b, cx, m.ct + 2, 1, by1 - m.ct - 8, P.ink); rect(b, cx - 4, tlY + 6, 3, 1, CHR[1]); rect(b, cx + 2, tlY + 6, 3, 1, CHR[1]); }
  // trunk line + plate + bumper
  rect(b, cx - hb + m.tl[0] + 4, tlY + m.tl[1] + 3, m.bw - 2 * m.tl[0] - 8, 1, P.lo2);
  plate(b, cx, by1 - 13);
  rect(b, cx - hb + 1, by1 - 4, m.bw - 2, 5, vramp([GRIM, DARK]));
  rect(b, cx - hb + 2, by1 - 4, m.bw - 4, 1, hex('#4a4458'));
  rect(b, cx - hb + 8, by1 + 1, 4, 2, CHR[3]); // exhaust
  return b;
}

// ---- hero rear ----
function heroRear() {
  const W = 180, H = 84, b = img(W, H), cx = 90, P = shades('#c0185a');
  ell(b, cx, H - 3, 92, 3.5, [8, 4, 16, 120]);
  tyre(b, 8, H - 18, 26, 17); tyre(b, W - 34, H - 18, 26, 17);
  trap(b, 14, 40, cx - 40, cx + 40, cx - 66, cx + 66, vramp([P.hi, P.mid, P.lo]));
  rect(b, cx - 38, 14, 76, 1, P.hi2);
  glass(b, 17, 37, cx - 35, cx + 35, cx - 58, cx + 58);
  // body: wide, slight bulge over the wheels
  fill(b, 38, H - 10, y => { const k = Math.min(1, (y - 38) / 8); return [cx - 70 - 16 * k, cx + 70 + 16 * k]; }, (x, y, u, v) => {
    let c = vramp([P.hi2, P.hi, P.mid, P.mid, P.lo, P.lo2, P.ink])(x, y, u, v);
    if (u < .04 || u > .96) c = P.ink; else if (u < .1 || u > .9) c = dith(x, y, .5) ? P.lo : c;
    if (v < .12 && (u > .3 && u < .7)) c = P.hi2; // sky highlight on deck lid
    return c;
  });
  // spoiler
  rect(b, cx - 62, 37, 4, 6, P.lo2); rect(b, cx + 58, 37, 4, 6, P.lo2);
  rect(b, cx - 80, 33, 160, 5, vramp([P.hi2, P.mid, P.lo2])); rect(b, cx - 80, 38, 160, 1, P.ink);
  // full width tail bar
  rect(b, cx - 82, 46, 164, 11, DARK);
  rect(b, cx - 81, 47, 162, 9, (x, y, u, v) => { const g = Math.floor(x / 3) % 2; const c = vramp([RED[1], RED[2], RED[3]])(x, y, u, v); return g ? c : mix(c, DARK, .25); });
  rect(b, cx - 80, 48, 160, 1, RED[0]);
  rect(b, cx - 14, 47, 28, 9, vramp([hex('#3a1020'), DARK]));
  rect(b, cx - 79, 47, 8, 9, AMB); rect(b, cx + 71, 47, 8, 9, AMB);
  rect(b, cx - 70, 50, 10, 4, hex('#f0f0f0')); rect(b, cx + 60, 50, 10, 4, hex('#f0f0f0')); // reverse lamps
  rect(b, cx - 84, 59, 168, 1, P.hi);
  plate(b, cx, 60, 30, 9);
  // diffuser, exhausts
  rect(b, cx - 80, H - 16, 160, 7, vramp([GRIM, DARK]));
  for (let i = -3; i <= 3; i++) rect(b, cx + i * 14, H - 15, 1, 6, hex('#3e3848'));
  for (const ex of [cx - 52, cx + 40]) { ell(b, ex + 6, H - 12, 6, 3.5, vramp([CHR[0], CHR[1], CHR[2], CHR[3]])); ell(b, ex + 6, H - 12, 4, 2, DARK); }
  return b;
}

// ---- hero side ----
function heroSide() {
  const W = 250, H = 80, b = img(W, H), P = shades('#c0185a');
  ell(b, 125, H - 3, 122, 3, [8, 4, 16, 120]);
  // body profile: top line y(x) (nose at left? car faces left: nose x small)
  const top = x => x < 70 ? 46 - (x - 4) * 0.12 : x < 100 ? 38 - (x - 70) * 0.55 : x < 160 ? 21.5 : x < 205 ? 21.5 + (x - 160) * 0.42 : 40 - (x - 205) * .02;
  const bot = x => 66;
  for (let x = 4; x < 246; x++) {
    const t = Math.round(top(x)), yb = bot(x);
    for (let y = t; y <= yb; y++) {
      const v = (y - 38) / 28; let c;
      if (y < 39) c = y === t ? P.hi2 : (y - t < 2 ? P.hi : P.mid); // roof / pillars
      else c = vramp([P.hi2, P.hi, P.mid, P.mid, P.lo, P.lo2])(x, y, 0, Math.max(0, Math.min(1, v)));
      if (y === 47) c = P.hi2; // shoulder line
      if (y === 48) c = P.lo;
      if (x < 6 || x > 244) c = P.ink;
      px(b, x, y, c);
    }
  }
  // greenhouse glass
  fill(b, 24, 38, y => [70 + (38 - y) * 1.8 + 3, 200 - (y - 24) * -0 - (38 - y) * 0.9], (x, y, u, v) => {
    const f = (1 - v) * 3.99, i = Math.floor(f); let c = dith(x, y, f - i) ? SKY[Math.min(4, i + 1)] : SKY[i];
    if ((x + y * 0.6) % 40 < 4) c = mix(c, [255, 255, 255], .4);
    return v > .8 ? mix(c, DARK, .4) : c;
  });
  rect(b, 148, 24, 3, 15, P.lo2); // B pillar
  rect(b, 72, 39, 130, 1, CHR[2]); // window trim
  // door line, handle, mirror
  for (let y = 40; y < 62; y++) px(b, 150, y, P.ink);
  for (let y = 40; y < 62; y++) px(b, 98 + (y - 40) * 0.1, y, P.ink);
  rect(b, 138, 51, 7, 2, P.ink); rect(b, 138, 51, 7, 1, P.hi);
  rect(b, 88, 34, 7, 5, P.mid); rect(b, 88, 34, 7, 1, P.hi2);
  // pop-up headlight lids (closed): seams on the bonnet
  rect(b, 14, 43, 20, 1, P.ink); rect(b, 14, 42, 20, 1, P.hi2);
  rect(b, 4, 52, 8, 3, AMB); // front side marker
  // side intake, skirt, bumpers
  rect(b, 176, 50, 16, 6, vramp([P.ink, DARK])); for (let i = 0; i < 4; i++) rect(b, 177, 51 + i * 1.5, 14, 1, GRIM);
  rect(b, 46, 62, 150, 4, vramp([GRIM, DARK]));
  rect(b, 236, 44, 9, 5, RED[2]); rect(b, 236, 44, 9, 1, RED[0]);
  // rear wing
  rect(b, 214, 32, 34, 4, vramp([P.hi2, P.mid, P.lo2])); rect(b, 226, 36, 4, 6, P.lo2);
  // wheels with arches
  for (const wx of [46, 200]) {
    ell(b, wx, 60, 20, 17, DARK);
    ell(b, wx, 62, 16, 16, vramp(RUB));
    ell(b, wx, 62, 10, 10, (x, y, u, v) => vramp([CHR[0], CHR[1], CHR[2], CHR[3]])(x, y, u, v));
    for (let a = 0; a < 5; a++) { const an = a * Math.PI * 2 / 5; for (let r = 3; r < 9; r++) px(b, wx + Math.cos(an) * r, 62 + Math.sin(an) * r, CHR[3]); }
    ell(b, wx, 62, 2.5, 2.5, CHR[0]);
  }
  return b;
}

// ---- trucks ----
function lorry() {
  const W = 110, H = 110, b = img(W, H), cx = 55, P = shades('#e8e4dc');
  ell(b, cx, H - 2, 52, 2.5, [8, 4, 16, 120]);
  tyre(b, 8, H - 18, 14, 17); tyre(b, 23, H - 18, 12, 17); tyre(b, W - 22, H - 18, 14, 17); tyre(b, W - 35, H - 18, 12, 17);
  rect(b, 4, 4, W - 8, 80, (x, y, u, v) => { let c = vramp([P.hi2, P.hi, P.mid, P.mid, P.lo])(x, y, u, v); if (u < .03 || u > .97) c = P.lo2; return c; });
  rect(b, 4, 4, W - 8, 2, CHR[1]); rect(b, 4, 82, W - 8, 2, CHR[3]);
  rect(b, cx, 6, 1, 76, P.lo2); rect(b, cx - 1, 6, 1, 76, P.hi2);
  for (const x of [cx - 8, cx + 6]) { rect(b, x, 8, 2, 72, CHR[2]); rect(b, x, 8, 1, 72, CHR[0]); }
  for (const y of [20, 50]) { rect(b, cx - 12, y, 24, 3, CHR[3]); rect(b, cx - 12, y, 24, 1, CHR[1]); }
  // stripe
  rect(b, 6, 66, W - 12, 4, hex('#2a8a9a')); rect(b, 6, 70, W - 12, 2, hex('#ff5a8a'));
  // chassis, under-run bar
  rect(b, 10, 84, W - 20, 8, DARK);
  rect(b, 6, 92, W - 12, 5, vramp([hex('#e8c040'), hex('#8a6a10')]));
  for (let x = 6; x < W - 6; x += 8) rect(b, x, 92, 4, 5, DARK);
  tail(b, 8, 86, 12, 5); tail(b, W - 20, 86, 12, 5);
  rect(b, 8, 85, 12, 1, AMB); rect(b, W - 20, 85, 12, 1, AMB);
  plate(b, cx, 85, 20, 6);
  return b;
}
function tanker() {
  const W = 110, H = 110, b = img(W, H), cx = 55;
  ell(b, cx, H - 2, 52, 2.5, [8, 4, 16, 120]);
  tyre(b, 8, H - 18, 14, 17); tyre(b, 23, H - 18, 12, 17); tyre(b, W - 22, H - 18, 14, 17); tyre(b, W - 35, H - 18, 12, 17);
  rect(b, 14, 70, W - 28, 16, DARK);
  ell(b, cx, 44, 50, 40, (x, y, u, v) => {
    const d = Math.hypot((x - cx + 14) / 50, (y - 28) / 40); const f = Math.min(1, d) * 4.99, i = Math.floor(f);
    const R = [CHR[0], CHR[1], CHR[4], CHR[2], CHR[3], DARK];
    let c = dith(x, y, f - i) ? R[Math.min(5, i + 1)] : R[i];
    if (y > 50 && y < 56) c = mix(c, hex('#ff8a5a'), .35); // road/sunset reflection band
    return c;
  });
  ell(b, cx, 44, 50, 40, null);
  for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; px(b, cx + Math.cos(t) * 50, 44 + Math.sin(t) * 40, CHR[3]); px(b, cx + Math.cos(t) * 46, 44 + Math.sin(t) * 36, CHR[2]); }
  ell(b, cx, 44, 10, 10, CHR[2]); ell(b, cx, 44, 7, 7, CHR[1]); ell(b, cx - 2, 42, 2, 2, CHR[0]);
  // ladder
  for (let y = 10; y < 84; y++) { px(b, 80, y, DARK); px(b, 88, y, DARK); }
  for (let y = 14; y < 84; y += 7) rect(b, 80, y, 9, 1, CHR[2]);
  // hazard diamond
  for (let i = 0; i < 7; i++) { rect(b, 30 - i, 62 + i, 1 + 2 * i, 1, AMB); rect(b, 30 - i, 76 - i, 1 + 2 * i, 1, AMB); }
  rect(b, 6, 92, W - 12, 5, vramp([hex('#e8c040'), hex('#8a6a10')]));
  for (let x = 6; x < W - 6; x += 8) rect(b, x, 92, 4, 5, DARK);
  tail(b, 8, 85, 12, 5); tail(b, W - 20, 85, 12, 5);
  plate(b, cx, 85, 20, 6);
  return b;
}

// ---- driver ----
function driver(raised) {
  const W = 36, H = 84, b = img(W, H);
  const SK = ['#f0c0a0', '#d8946e', '#a0604a'].map(hex), JK = shades('#2a4ab0'), JN = shades('#3a3050'), CAP = shades('#e83a6a');
  const lean = y => (84 - y) * 0.09; // upper body tilts back (to the right)
  ell(b, 18, 82, 11, 2, [8, 4, 16, 110]);
  // legs (crossed ankles), shoes
  for (let y = 50; y < 80; y++) { const l = lean(y); rect(b, 11 + l * .3 + (y > 70 ? 3 : 0), y, 6, 1, y % 5 === 0 ? JN.lo : JN.mid); rect(b, 18 + l * .3, y, 6, 1, dith(0, y, .5) ? JN.lo : JN.lo2); }
  rect(b, 12, 79, 8, 3, hex('#f0f0f0')); rect(b, 19, 79, 8, 3, hex('#d0d0e0')); rect(b, 12, 81, 15, 1, DARK);
  // jacket torso
  for (let y = 24; y < 52; y++) { const l = lean(y); fill(b, y, y, () => [9 + l, 26 + l], (x, yy, u) => u < .25 ? JK.hi : u < .7 ? JK.mid : u < .9 ? JK.lo : JK.lo2); }
  for (let y = 26; y < 50; y++) px(b, 17 + lean(y), y, JK.ink); // zip
  for (let y = 24; y < 30; y++) rect(b, 14 + lean(y), y, 6, 1, hex('#f0e8d8')); // shirt collar
  rect(b, 9 + lean(36), 36, 18, 2, hex('#ff8a3a')); // jacket stripe
  // back arm (on car, right side)
  for (let y = 26; y < 46; y++) rect(b, 26 + lean(y), y, 4, 1, JK.lo);
  rect(b, 27 + lean(46), 46, 4, 3, SK[1]);
  // front arm with cup
  const hy = raised ? 30 : 44, hx = 7 + lean(30);
  for (let y = 26; y < hy; y++) rect(b, 7 + lean(y) + (raised ? (y - 26) * .1 : 0), y, 4, 1, y % 3 ? JK.mid : JK.hi);
  rect(b, hx, hy, 4, 3, SK[0]);
  rect(b, hx - 1, hy - 6, 5, 7, vramp([hex('#ffffff'), hex('#d0c8c0')])); rect(b, hx - 1, hy - 6, 5, 1, hex('#6a3a20')); rect(b, hx - 1, hy - 3, 5, 2, hex('#e83a6a'));
  if (raised) { px(b, hx, hy - 9, hex('#c0c0d0')); px(b, hx + 2, hy - 11, hex('#a0a0c0')); }
  // head, hair, cap
  const l = lean(14); ell(b, 18 + l, 16, 5.5, 6.5, (x, y, u, v) => u < .3 ? SK[0] : u < .8 ? SK[1] : SK[2]);
  rect(b, 15 + l, 22, 6, 2, SK[2]); // neck shade
  rect(b, 22 + l, 12, 2, 9, hex('#2a1a30')); // hair at back
  ell(b, 18 + l, 10, 6.5, 3.5, vramp([CAP.hi2, CAP.mid, CAP.lo]));
  rect(b, 9 + l, 12, 9, 2, CAP.lo2); rect(b, 9 + l, 12, 9, 1, CAP.mid); // visor
  px(b, 15 + l, 15, DARK); px(b, 14 + l, 18, SK[2]);
  return b;
}
function cat(t2) {
  const W = 22, H = 16, b = img(W, H), F = ['#4a3a5a', '#2a2036', '#14101c'].map(hex);
  ell(b, 11, 15, 7, 1, [8, 4, 16, 100]);
  ell(b, 11, 10, 6, 5, vramp(F)); ell(b, 8, 5, 3.5, 3, vramp(F));
  px(b, 5, 2, F[0]); px(b, 6, 1, F[0]); px(b, 9, 1, F[0]); px(b, 10, 2, F[0]);
  px(b, 7, 5, hex('#c0ff6a')); px(b, 9, 5, hex('#c0ff6a'));
  rect(b, 8, 13, 2, 2, F[0]); rect(b, 12, 13, 2, 2, F[0]);
  const tail = t2 ? [[17, 14], [18, 13], [19, 12], [20, 10], [20, 9], [19, 8]] : [[17, 14], [18, 14], [19, 14], [20, 13], [21, 12], [21, 11]];
  for (const [x, y] of tail) { px(b, x, y, F[1]); px(b, x, y - 1, F[0]); }
  return b;
}

// ---- frames ----
const F = {
  car0: rearCar(90, 54, { bw: 84, bt: 22, ct: 6, cw: 28, cb: 36, paint: '#e8ecf0', tl: [18, 7], amber: 1 }),           // boxy saloon, white
  car1: rearCar(90, 54, { bw: 78, bt: 20, ct: 4, cw: 26, cb: 34, paint: '#d81e2e', tl: [10, 12], tlY: 2 }),           // hatchback, red
  car2: rearCar(90, 54, { bw: 88, bt: 26, ct: 12, cw: 24, cb: 38, paint: '#1aa89a', tl: [26, 5] }),                   // wedge coupe, teal
  car3: rearCar(90, 54, { bw: 82, bt: 22, ct: 3, cw: 34, cb: 37, paint: '#1e2a6a', tl: [8, 16], tlY: 1 }),            // estate, navy
  car4: rearCar(90, 54, { bw: 64, bt: 22, ct: 3, cw: 24, cb: 28, paint: '#f2c41e', tl: [8, 9] }),                     // city car, yellow
  car5: rearCar(90, 54, { bw: 84, bt: 16, ct: 2, cw: 38, cb: 40, paint: '#b8c0cc', tl: [7, 18], tlY: 2, van: 1 }),    // van, silver
  truck0: lorry(), truck1: tanker(),
  hero_rear: heroRear(), hero_side: heroSide(),
  driver_lean: driver(false), driver_lean2: driver(true),
  cat: cat(false), cat2: cat(true),
};

// shelf-pack into atlas, 1px gap
const AW = 512; let x = 0, y = 0, rowH = 0; const frames = {};
for (const [k, b] of Object.entries(F)) {
  if (x + b.w > AW) { x = 0; y += rowH + 1; rowH = 0; }
  frames[k] = { x, y, w: b.w, h: b.h, ax: Math.floor(b.w / 2), ay: b.h };
  x += b.w + 1; rowH = Math.max(rowH, b.h);
}
const AH = y + rowH, atlas = img(AW, AH);
for (const [k, b] of Object.entries(F)) { const f = frames[k]; for (let r = 0; r < b.h; r++) atlas.d.set(b.d.subarray(r * b.w * 4, (r + 1) * b.w * 4), ((f.y + r) * AW + f.x) * 4); }

// ---- PNG ----
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = ~0; for (const v of buf) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return ~c >>> 0; };
const chunk = (t, data) => { const len = Buffer.alloc(4), tb = Buffer.concat([Buffer.from(t), data]), cr = Buffer.alloc(4); len.writeUInt32BE(data.length); cr.writeUInt32BE(crc32(tb)); return Buffer.concat([len, tb, cr]); };
function png(b) {
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(b.w, 0); hdr.writeUInt32BE(b.h, 4); hdr[8] = 8; hdr[9] = 6;
  const raw = Buffer.alloc((b.w * 4 + 1) * b.h); for (let r = 0; r < b.h; r++) Buffer.from(b.d.buffer, r * b.w * 4, b.w * 4).copy(raw, r * (b.w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
console.assert(crc32(Buffer.from('IEND')) === 0xae426082, 'crc32 self-check');
mkdirSync(ART, { recursive: true });
const out = png(atlas);
writeFileSync(join(ART, 'cars.png'), out);
writeFileSync(join(ART, 'cars.json'), JSON.stringify({ image: 'cars.png', frames, anims: { driver: { frames: ['driver_lean', 'driver_lean', 'driver_lean2'], fps: 1 }, cat: { frames: ['cat', 'cat2'], fps: 2 } } }));
console.log(`cars.png ${AW}x${AH} ${out.length} bytes`);
