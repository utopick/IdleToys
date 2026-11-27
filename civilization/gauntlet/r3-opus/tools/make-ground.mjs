// Paints art/terrain.png and art/beings.png (+ JSON). Run: node tools/make-ground.mjs (from the entry folder)
import { writeFileSync } from "fs";
import { deflateSync } from "zlib";
const OUT = new URL("../art/", import.meta.url).pathname;
let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function sheet(W, H) {
  const d = new Uint8Array(W * H * 4);
  return { W, H, d, px(x, y, c, a = 255) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; }, get(x, y) { const i = (y * W + x) * 4; return d[i + 3]; } };
}
function png(sh, file) {
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(t, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
  const raw = Buffer.alloc((sh.W * 4 + 1) * sh.H); for (let y = 0; y < sh.H; y++) Buffer.from(sh.d.buffer, y * sh.W * 4, sh.W * 4).copy(raw, y * (sh.W * 4 + 1) + 1);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(sh.W, 0); ih.writeUInt32BE(sh.H, 4); ih[8] = 8; ih[9] = 6;
  writeFileSync(OUT + file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
// ---------- terrain: 32x16 diamonds plus 4 px of earth side below ----------
const TW = 32, TH = 20, inD = (x, y) => Math.abs(x - 15.5) / 16 + Math.abs(y - 7.5) / 8 <= 1;
const tiles = [];
const T = sheet(TW * 8, TH * 8); let ti = 0;
function tile(name, paint) {
  const ox = (ti % 8) * TW, oy = Math.floor(ti / 8) * TH; ti++;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) if (inD(x, y)) { const c = paint(x, y); if (c) T.px(ox + x, oy + y, c); }
  // earth side (the cliff under the tile edge, seen at map borders and water)
  for (let x = 0; x < 32; x++) { const top = x < 16 ? 8 + x / 2 : 8 + (31 - x) / 2; for (let k = 1; k <= 4; k++) T.px(ox + x, oy + Math.round(top) + k - 0, mix(hex(x < 16 ? "#6b4a2e" : "#4a321f"), hex("#2a1c12"), k / 5)); }
  tiles.push({ name, x: ox, y: oy, w: 32, h: TH, anchor: [16, 8] });
}
const grassP = ["#2f5a24", "#3d6e2a", "#4f8432", "#64993b", "#7fae4a"].map(hex);
const shade = (x, y) => (x < 16 ? 0.15 : -0.05) + (y < 6 ? 0.1 : 0); // light from upper-left
for (let v = 0; v < 6; v++) {
  const dry = v >= 4; const P = dry ? ["#4d5a24", "#6a6e2c", "#8a8438", "#a59a48", "#bfb05e"].map(hex) : grassP;
  tile("grass_" + v, (x, y) => { let k = 2 + Math.floor((rnd() - 0.5) * 2.2 + shade(x, y) * 3); if (rnd() < 0.08) k = 4; if ((x + y * 3) % 7 === 0 && rnd() < 0.5) k = 0; k = Math.max(0, Math.min(4, k)); if (v % 2 && rnd() < 0.015) return hex(["#e8d65a", "#e07a9a", "#f0f0e8"][(rnd() * 3) | 0]); return P[k]; });
}
const dirtP = ["#5a3e26", "#77553a", "#93704c", "#ad8b62", "#c4a47a"].map(hex);
for (let v = 0; v < 3; v++) tile("dirt_" + v, (x, y) => { let k = 2 + Math.round((rnd() - 0.5) * 1.6 + shade(x, y) * 2); if (rnd() < 0.05) k = 0; if (Math.abs(x - 15.5) / 16 + Math.abs(y - 7.5) / 8 > 0.85 && rnd() < 0.6) return grassP[1 + ((rnd() * 2) | 0)]; return dirtP[Math.max(0, Math.min(4, k))]; });
const stoneP = ["#4a4640", "#66605a", "#837c72", "#a19888", "#bdb3a0"].map(hex);
for (let v = 0; v < 2; v++) tile("cobble_" + v, (x, y) => { const cx = (x + (Math.floor(y / 3) % 2) * 2 + v) % 4, cy = y % 3; if (cx === 0 || cy === 0) return stoneP[0]; return stoneP[Math.max(1, Math.min(4, 2 + (cy === 1 && cx === 1 ? 1 : 0) + Math.round(rnd() - 0.4 + shade(x, y))))]; });
const asphP = ["#2a2b2d", "#3a3b3d", "#4a4a4b", "#5d5c59", "#77736a"].map(hex);
for (let v = 0; v < 4; v++) {
  const cracks = new Set(); let cx = rnd() * 32, cy = rnd() * 16; for (let i = 0; i < 30; i++) { cracks.add(((cx | 0) + "," + (cy | 0))); cx += rnd() * 2 - 0.5; cy += rnd() * 1.4 - 0.7; }
  tile("asphalt_" + v, (x, y) => { if (cracks.has(x + "," + y)) return rnd() < 0.5 ? grassP[2] : asphP[0]; if (v < 2 && y === 7 + (v ? 0 : 0) && x % 6 < 3 && x > 4 && x < 28) return hex(rnd() < 0.3 ? "#8a8466" : "#c8c09a"); if (v >= 2 && rnd() < 0.18) return grassP[(rnd() * 4) | 0]; return asphP[Math.max(0, Math.min(4, 2 + Math.round((rnd() - 0.5) * 1.4 + shade(x, y))))]; });
}
for (let v = 0; v < 3; v++) {
  const P = [["#5c4a1c", "#8a6e26", "#b89534", "#d8b84a", "#efd77a"], ["#2c4a1c", "#3e6a24", "#548a2e", "#6eaa3a", "#94c854"], ["#4a3422", "#5e4430", "#77583e", "#8e6c4e", "#a8855e"]][v].map(hex);
  tile("field_" + v, (x, y) => { const row = (x + 2 * y) % 6; if (row < 2) return dirtP[row ? 1 : 0]; return P[Math.max(0, Math.min(4, 2 + (row === 3 ? 1 : row === 5 ? -1 : 0) + Math.round(rnd() - 0.5 + shade(x, y))))]; });
}
const waterP = ["#173a52", "#1f4d6a", "#2a6584", "#3d7f9c", "#76b4c8"].map(hex);
for (let f = 0; f < 4; f++) tile("water_" + f, (x, y) => { const w = Math.sin((x * 0.5 + y * 1.4) + f * 1.57) + Math.sin(x * 0.23 - y * 0.9 - f * 1.57); let k = 2 + Math.round(w * 0.7); if (w > 1.55) k = 4; return waterP[Math.max(0, Math.min(4, k))]; });
const sandP = ["#8a7448", "#a88e5a", "#c4a872", "#d8c08a", "#ead8a6"].map(hex);
for (let v = 0; v < 2; v++) tile("sand_" + v, (x, y) => sandP[Math.max(0, Math.min(4, 2 + Math.round((rnd() - 0.5) * 1.3 + shade(x, y) * 2)))]);
tile("rail", (x, y) => { const u = x - 2 * y; if (Math.abs(u - 0) < 1.2 || Math.abs(u + 8) < 1.2) return hex("#9a9aa2"); if (((x + 2 * y) % 5) < 2) return hex("#4a3424"); return stoneP[1 + ((rnd() * 2) | 0)]; });
tile("plaza", (x, y) => { const a = (x + 2 * y) % 8, b = (x - 2 * y + 64) % 8; if (a === 0 || b === 0) return hex("#7a7266"); return mix(hex("#c8bea6"), hex("#a89c84"), rnd() * 0.6 - shade(x, y)); });
tile("glass_path", (x, y) => { const a = (x + 2 * y) % 10, b = (x - 2 * y + 80) % 10; if (a === 0 || b === 0) return hex("#7ad0c0"); return mix(hex("#e8efe6"), hex("#b8c8c0"), rnd() * 0.5 - shade(x, y)); });
png(T, "terrain.png");
writeFileSync(OUT + "terrain.json", JSON.stringify({ image: "terrain.png", frames: tiles, animations: { water: { frames: ["water_0", "water_1", "water_2", "water_3"], fps: 3 } } }));
// ---------- beings: tiny people and animals, 12x16 cells ----------
const B = sheet(16 * 14, 16 * 8), bf = [], ba = {}; let bi = 0;
function cell(name, paint) { const ox = (bi % 14) * 16, oy = Math.floor(bi / 14) * 16; bi++; paint((x, y, c) => B.px(ox + x, oy + y, c)); bf.push({ name, x: ox, y: oy, w: 16, h: 16, anchor: [8, 15] }); }
const SK = ["#f2c9a0", "#d9a072", "#b07a4e", "#7a4e30", "#5a3824", "#e8b890"].map(hex);
const CL = ["#a03a2a", "#3a5a9a", "#5a7a2a", "#8a6a2a", "#6a3a7a", "#c08a2a", "#2a6a6a", "#7a7a72", "#c8c0a8", "#4a3a2a"].map(hex);
const HR = ["#2a1a10", "#5a3a1a", "#a07a3a", "#d8c07a", "#8a2a1a", "#c8c8c0"].map(hex);
const OL = hex("#1c1410");
for (let n = 0; n < 16; n++) {
  const sk = SK[n % 6], cl = CL[(n * 7) % 10], cl2 = CL[(n * 3 + 1) % 10], hr = HR[(n * 5) % 6], tall = n % 3, hat = n % 4, beard = n % 5 === 1, cloak = n % 6 === 2;
  for (let f = 0; f < 3; f++) cell(`p${n}_${f}`, (P) => {
    const top = 4 - tall + (f === 1 ? 1 : 0) * 0, bob = f === 1 ? 1 : 0;
    // legs
    const lx = f === 0 ? [6, 9] : f === 1 ? [7, 8] : [5, 10];
    for (const L of lx) for (let y = 12; y <= 14; y++) P(L, y, mix(cl2, OL, 0.5));
    // body
    for (let y = top + 4; y <= 12; y++) for (let x = 5; x <= 10; x++) { const edge = x === 5 || x === 10; P(x, y + bob * 0, edge ? mix(cl, OL, 0.55) : x < 8 ? mix(cl, [255, 255, 255], 0.15) : cl); }
    if (cloak) for (let y = top + 4; y <= 13; y++) { P(4, y, mix(cl2, OL, 0.4)); P(11, y, mix(cl2, OL, 0.6)); }
    if (f === 2) { P(11, top + 6, sk); P(12, top + 5, hex("#8a6a4a")); P(13, top + 4, hex("#8a6a4a")); P(13, top + 3, hex("#9a9a9a")); } // working: a tool
    // head
    for (let y = top; y <= top + 3; y++) for (let x = 6; x <= 9; x++) P(x, y, x === 9 ? mix(sk, OL, 0.25) : sk);
    P(7, top + 2, OL); P(9, top + 2, OL);
    for (let x = 6; x <= 9; x++) P(x, top - 1, hr); P(6, top, hr);
    if (beard) { P(7, top + 3, hr); P(8, top + 3, hr); P(8, top + 4, hr); }
    if (hat === 1) { for (let x = 5; x <= 10; x++) P(x, top - 1, hex("#6a5030")); for (let x = 6; x <= 9; x++) P(x, top - 2, hex("#7a6040")); }
    if (hat === 2) { for (let x = 5; x <= 10; x++) for (let y = top - 2; y <= top + 1; y++) if (x === 5 || x === 10 || y < top) P(x, y, mix(cl2, OL, 0.2)); }
  });
}
// animals
const animal = (name, col, frames, draw) => { for (let f = 0; f < frames; f++) cell(`${name}_${f}`, (P) => draw(P, f, col)); ba[name] = { frames: Array.from({ length: frames }, (_, f) => `${name}_${f}`), fps: 4 }; };
animal("sheep", hex("#e8e2d2"), 2, (P, f, c) => { for (let y = 8; y <= 12; y++) for (let x = 3; x <= 11; x++) if (!(y === 8 && (x === 3 || x === 11))) P(x, y, (x + y) % 2 ? c : mix(c, hex("#a8a090"), (y - 8) / 5)); for (let y = 8; y <= 10; y++) for (let x = 11; x <= 13; x++) P(x, y + (f ? 1 : 0), hex("#2a2420")); P(12, 8 + f, hex("#f0f0f0")); for (const L of [4, 6, 9, 11]) P(L, 13 + ((L + f) % 2 ? 0 : 0), hex("#2a2420")), P(L, 14, hex("#2a2420")); });
animal("cow", hex("#8a5a3a"), 2, (P, f, c) => { for (let y = 7; y <= 11; y++) for (let x = 2; x <= 11; x++) P(x, y, (x * 3 + y * 5) % 7 < 2 ? hex("#efe6d6") : y > 10 ? mix(c, OL, 0.4) : c); for (let y = 6; y <= 9; y++) for (let x = 11; x <= 14; x++) P(x, y + f, c); P(13, 7 + f, OL); P(12, 5 + f, hex("#d8d0c0")); for (const L of [3, 5, 9, 11]) for (let y = 12; y <= 14; y++) P(L, y, mix(c, OL, 0.5)); });
animal("dog", hex("#b07a3a"), 2, (P, f, c) => { for (let y = 10; y <= 12; y++) for (let x = 4; x <= 10; x++) P(x, y, y === 12 ? mix(c, OL, 0.35) : c); for (let y = 8; y <= 10; y++) for (let x = 10; x <= 12; x++) P(x, y, c); P(11, 7, mix(c, OL, 0.4)); P(12, 9, OL); P(3, 9 - f, c); for (const L of [4, 6, 8, 10]) P(L + ((L / 2 + f) % 2), 13, mix(c, OL, 0.5)), P(L, 14, mix(c, OL, 0.6)); });
animal("cat", hex("#5a5a62"), 2, (P, f, c) => { for (let y = 11; y <= 13; y++) for (let x = 5; x <= 10; x++) P(x, y, c); for (let y = 9; y <= 11; y++) for (let x = 9; x <= 11; x++) P(x, y, c); P(9, 8, c); P(11, 8, c); P(10, 10, hex("#e8d040")); P(4, 10 - f, c); P(4, 11, c); for (const L of [5, 7, 9, 10]) P(L, 14, mix(c, OL, 0.5)); });
animal("deer", hex("#9a6a3a"), 2, (P, f, c) => { for (let y = 7; y <= 10; y++) for (let x = 3; x <= 10; x++) P(x, y, y === 10 ? mix(c, OL, 0.3) : (x + y) % 5 === 0 ? hex("#e8d8c0") : c); for (let y = 3; y <= 7; y++) P(11, y, c); P(12, 3, c); P(12, 4, OL); P(10, 1, hex("#5a4020")); P(11, 1, hex("#5a4020")); P(12, 0, hex("#5a4020")); P(10, 2, hex("#5a4020")); for (const L of [4, 5, 9, 10]) for (let y = 11; y <= 14; y++) P(L + (y > 12 && f && L % 2 ? 1 : 0), y, mix(c, OL, 0.4)); });
animal("horse", hex("#6a4028"), 2, (P, f, c) => { for (let y = 6; y <= 10; y++) for (let x = 2; x <= 11; x++) P(x, y, y === 10 ? mix(c, OL, 0.35) : x < 6 ? mix(c, [255, 230, 200], 0.12) : c); for (let y = 2; y <= 7; y++) for (let x = 11; x <= 13; x++) P(x, y, c); P(14, 3, c); P(13, 3, OL); for (let y = 2; y <= 6; y++) P(10, y, hex("#2a1a10")); P(1, 7 + f, hex("#2a1a10")); P(1, 8, hex("#2a1a10")); for (const L of [3, 4, 10, 11]) for (let y = 11; y <= 14; y++) P(L + (y > 12 && f && L % 2 ? 1 : 0), y, mix(c, OL, 0.5)); });
animal("bird", hex("#2a2a30"), 2, (P, f, c) => { P(7, 8, c); P(8, 8, c); if (f) { P(5, 7, c); P(6, 7, c); P(9, 7, c); P(10, 7, c); } else { P(5, 9, c); P(6, 8, c); P(9, 8, c); P(10, 9, c); } });
animal("slime", hex("#4ac07a"), 2, (P, f, c) => { const h = f ? 4 : 5; for (let y = 14 - h; y <= 14; y++) for (let x = 4 - (f ? 1 : 0); x <= 11 + (f ? 1 : 0); x++) { const ed = y === 14 - h || x === 4 - f || x === 11 + f; P(x, y, ed ? mix(c, OL, 0.5) : y < 12 - h / 2 && x < 7 ? mix(c, [255, 255, 255], 0.5) : c); } P(6, 11, OL); P(9, 11, OL); });
animal("wolf", hex("#6a6a70"), 2, (P, f, c) => { for (let y = 9; y <= 11; y++) for (let x = 3; x <= 11; x++) P(x, y, y === 11 ? mix(c, OL, 0.4) : c); for (let y = 7; y <= 10; y++) for (let x = 11; x <= 13; x++) P(x, y, c); P(11, 6, c); P(13, 6, c); P(14, 9, c); P(12, 8, hex("#e8c040")); P(2, 8 + f, c); P(1, 8 + f, c); for (const L of [4, 5, 10, 11]) for (let y = 12; y <= 14; y++) P(L + (y === 14 && f && L % 2 ? 1 : 0), y, mix(c, OL, 0.5)); });
const vehicle = (name, body, draw) => cell(name, (P) => draw(P, hex(body)));
vehicle("cart", "#7a5434", (P, c) => { for (let y = 8; y <= 11; y++) for (let x = 2; x <= 13; x++) P(x, y, y === 8 ? mix(c, [255, 255, 255], 0.2) : (x % 3 ? c : mix(c, OL, 0.3))); for (let x = 3; x <= 12; x++) P(x, 7, hex("#c8a848")); for (const w of [4, 11]) { P(w, 12, OL); P(w - 1, 13, OL); P(w + 1, 13, OL); P(w, 14, OL); P(w, 13, hex("#8a6a4a")); } });
vehicle("tram", "#2a6a4a", (P, c) => { for (let y = 5; y <= 12; y++) for (let x = 1; x <= 14; x++) P(x, y, y === 5 ? hex("#d8d0b0") : y >= 7 && y <= 8 && x % 3 ? hex("#e8d890") : y > 11 ? mix(c, OL, 0.4) : c); P(3, 13, OL); P(12, 13, OL); P(4, 13, OL); P(11, 13, OL); });
vehicle("pod", "#e8f0f0", (P, c) => { for (let y = 8; y <= 12; y++) for (let x = 2; x <= 13; x++) if (!((y === 8) && (x < 4 || x > 11))) P(x, y, y < 10 && x > 4 && x < 11 ? hex("#5ac8d0") : y === 12 ? hex("#8a9a9a") : c); P(3, 13, hex("#5ac8d0")); P(12, 13, hex("#5ac8d0")); });
vehicle("boat", "#6a4a2a", (P, c) => { for (let x = 2; x <= 13; x++) for (let y = 11; y <= 13; y++) if (y < 13 || (x > 3 && x < 12)) P(x, y, y === 11 ? hex("#a07a4a") : c); for (let y = 3; y <= 10; y++) P(8, y, hex("#4a3420")); for (let y = 4; y <= 9; y++) for (let x = 9; x <= 9 + (y - 3) / 1.5; x++) P(x, y, hex("#e8e0c8")); });
for (let n = 0; n < 16; n++) ba["p" + n] = { frames: [`p${n}_0`, `p${n}_1`], fps: 5 };
png(B, "beings.png");
writeFileSync(OUT + "beings.json", JSON.stringify({ image: "beings.png", frames: bf, animations: ba }));
console.log("tiles", tiles.length, "beings", bf.length);
