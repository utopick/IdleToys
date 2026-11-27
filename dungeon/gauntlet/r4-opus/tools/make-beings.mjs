// Draws the Dungeon Town beings sheet: art/beings.png + art/beings.json, and registers it in art/index.json.
// Run: node tools/make-beings.mjs [upscaled-preview.png]
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path'; import url from 'node:url';
const ART = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'art');

// ---- tiny PNG encoder ----
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = ~0; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (~c) >>> 0; };
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---- palette (shared letters; sprites may override) ----
const BASE = {
  O: '#1a1014', E: '#1a1014', W: '#f4efe0', w: '#c8c0b0', K: '#1a1014',
  Y: '#f0c040', y: '#b07818', D: '#7a4a10', R: '#d83030', r: '#8a1c1c', b: '#4aa0e8', G: '#7a7a82', g: '#4a4a52', L: '#b8b8c0',
};
const sprites = []; // {name, rows, pal}
const add = (name, rows, pal = {}) => {
  const w = rows[0].length; if (!rows.every(r => r.length === w)) throw new Error('ragged ' + name);
  sprites.push({ name, rows, pal: { ...BASE, ...pal } });
};
const put = (rows, pts) => { const g = rows.map(r => r.split('')); for (const [x, y, c] of pts) g[y][x] = c; return g.map(r => r.join('')); };

// ---- people from one template ----
// S skin, H hair, C shirt, c shirt shade, P pants, X hat, B beard
function person(o, f) {
  let r = [
    '..OOOO..',
    '.OHHHHO.',
    '.OHSSES.',
    '.OSSSSO.',
    'OcCCCCcO',
    'OSCCCCSO',
    f ? '..OPPO..' : '.OPOOPO.',
    f ? '..OOOO..' : '.OO..OO.',
  ];
  r[2] = '.OHSSEO.';
  if (o.hat === 'hood') r = [ '..OOOO..', '.OXXXXO.', '.OXSSEO.', '.OXSSSO.', ...r.slice(4) ];
  if (o.hat === 'cap') r = [ '.OXXXXO.', 'OXXXXXXO', '.OHSSEO.', '.OSSSSO.', ...r.slice(4) ];
  if (o.hat === 'tall') r = [ '.OWWWWO.', '.OWWWWO.', '.OwwwwO.', '.OHSSEO.', ...r.slice(4) ];
  if (o.hat === 'helm') r = [ '..OOOO..', '.OLLLLO.', '.OGLLGO.', '.OGSSEO.', ...r.slice(4) ];
  if (o.beard) r[3] = r[3].slice(0, 3) + 'BBB' + 'O.';
  if (o.robe) { r[6] = f ? '.OCCCCO.' : '.OCCCCO.'; r[7] = f ? '..OOOOO.' : '.OOOOO..'; }
  if (o.apron) { r[4] = 'OcAAAAcO'; r[5] = 'OSAAAASO'; }
  return o.put ? put(r, o.put(f)) : r;
}
const SK = ['#f0c8a0', '#c89060', '#8a5a38', '#e8b890', '#a06c44', '#f4d4b4'];
const folk = [
  { S: SK[0], H: '#6a3a1a', C: '#4a7a3a', c: '#2e5226', P: '#5a4030' },
  { S: SK[1], H: '#1e1a1a', C: '#a03a3a', c: '#6a2424', P: '#3a3a4a', hat: 'cap', X: '#8a6a3a' },
  { S: SK[2], H: '#2a1a10', C: '#c8a060', c: '#8a6a3a', P: '#4a3020', beard: true, B: '#2a1a10' },
  { S: SK[3], H: '#d8b040', C: '#4a5aa0', c: '#2e3a6a', P: '#5a4030', hat: 'hood', X: '#7a5a8a' },
  { S: SK[4], H: '#a0a0a0', C: '#7a6a50', c: '#4a4030', P: '#3a3020', beard: true, B: '#d0d0d0' },
  { S: SK[5], H: '#b04a20', C: '#c86a90', c: '#8a4060', P: '#4a3a5a', hat: 'hood', X: '#3a6a5a' },
];
folk.forEach((p, i) => [0, 1].forEach(f => add(`folk${i}_${f}`, person(p, f), p)));
const smith = { S: SK[1], H: '#1e1a1a', C: '#6a6a72', c: '#44444c', P: '#3a3020', A: '#6a4020', apron: true, beard: true, B: '#1e1a1a',
  put: f => [[7, 4 + f, 'G'], [7, 3 + f, 'L'], [6, 3 + f, 'L']] };
const baker = { S: SK[0], H: '#6a3a1a', C: '#e8e0d0', c: '#b8b0a0', P: '#6a5a4a', A: '#f8f4ec', hat: 'tall', apron: true };
const priest = { S: SK[3], H: '#888', C: '#e8e4f0', c: '#a8a0c0', P: '#000', X: '#e8e4f0', hat: 'hood', robe: true,
  put: () => [[4, 4, 'Y'], [4, 5, 'Y'], [3, 4, 'Y'], [5, 4, 'Y']] };
for (const [n, p] of [['smith', smith], ['baker', baker], ['priest', priest]]) [0, 1].forEach(f => add(`${n}_${f}`, person(p, f), p));
const delvers = [
  // helmet, sword, shield
  { S: SK[0], H: '#6a3a1a', C: '#8a8a94', c: '#5a5a64', P: '#4a3020', hat: 'helm', T: '#8a4a20',
    put: f => [[7, 2 + f, 'L'], [7, 3 + f, 'L'], [7, 4 + f, 'y'], [0, 4, 'T'], [0, 5, 'T'], [1, 4, 'T'], [1, 5, 'Y']] },
  // hood, staff with glow
  { S: SK[2], H: '#1a1a1a', C: '#3a4a8a', c: '#24306a', P: '#2a2a3a', X: '#3a4a8a', hat: 'hood', robe: true, T: '#8a5a2a', V: '#80f0ff',
    put: f => [[7, 0, 'V'], [7, 1, 'T'], [7, 2, 'T'], [7, 3, 'T'], [7, 4, 'T'], [7, 5, 'T'], [7, 6, 'T']] },
  // torch and pack
  { S: SK[4], H: '#c05a20', C: '#6a7a3a', c: '#44502a', P: '#4a3a2a', T: '#6a4020',
    put: f => [[7, 2, f ? 'Y' : 'R'], [7, 1, f ? 'R' : 'Y'], [7, 3, 'D'], [7, 4, 'D'], [0, 3, 'T'], [0, 4, 'T'], [0, 5, 'T'], [1, 3, 'T']] },
];
delvers.forEach((p, i) => [0, 1].forEach(f => add(`delver${i}_${f}`, person(p, f), p)));

// ---- trader with laden mule, 16x8 ----
[0, 1].forEach(f => add(`trader_${f}`, [
  '..OOOOO....OOOO.',
  '.OYyYyYO..OKKKKO',
  '.OYyYyYOO.OKKSEO',
  'OMMMMMMMMOOKKSSO',
  'OMMMMMMMNMOkKKKO',
  '.OMMMMMMO.OKKKKO',
  f ? '.OMO.OMO..OkKKO.' : 'OM.O.O.MO.OkKKKO',
  f ? '.OO..OO...OOOO..' : 'OO..O..OO.OO.OO.',
], { M: '#7a6050', N: '#1a1014', K: '#5a3a2a', k: '#3a2418', S: SK[1] }));

// ---- monsters ----
const gob = { S: '#6a9a3a', s: '#44682a', C: '#6a4a2a', c: '#4a3018', P: '#3a2a1a', T: '#c8a868' };
[0, 1].forEach(f => add(`goblin0_${f}`, [
  '........',
  'O.OOOO.O',
  'OSSSSSSO',
  '.OSSWEO.',
  '..OsSO..',
  '.OCCCCSO',
  f ? '..OPPO..' : '.OPOOPO.',
  f ? '..OOOO..' : '.OO..OO.',
], gob));
[0, 1].forEach(f => add(`goblin1_${f}`, [
  '..OOO...',
  '.OTTTO..',
  'OTTTTO.O',
  'OTTTOSSO',
  '.OOSSWEO',
  '.OCCsSO.',
  f ? '..OPPO..' : '.OPOOPO.',
  f ? '..OOOO..' : '.OO..OO.',
], { ...gob, S: '#8a9a3a', s: '#5a6a24' }));
[0, 1].forEach(f => add(`kobold_${f}`, [
  '........',
  '...OOOO.',
  '..OSSSEO',
  '..OSSSSSO'.slice(0, 8),
  '.OSsSSOO',
  'OSOsssSO',
  f ? 'S.OSOSO.' : '.SOSOOSO',
  f ? '..OOOO..' : '..OO..OO',
], { S: '#b0502a', s: '#7a3218' }));
[0, 1].forEach(f => add(`skeleton_${f}`, [
  '..OOOO..',
  '.OWWWWO.',
  '.OWWKWO.',
  '..OWWO..',
  '.OwWwWO.',
  'OW.wW.WO',
  f ? '..OWWO..' : '.OWOOWO.',
  f ? '..OOOO..' : '.OW..WO.',
]));
[0, 1].forEach(f => add(`ghoul_${f}`, [
  '..OOOO..',
  '.OSSSSO.',
  '.OSSRSO.',
  '.OSsssOO',
  'OCCCCSSO',
  'OCcCCO..',
  f ? '..OSSO..' : '.OSOOSO.',
  f ? '..OOOO..' : '.OO..OO.',
], { S: '#8aa08a', s: '#4a604a', C: '#4a3a4a', c: '#2a202a', R: '#e04030' }));
const beast = { F: '#7a6a70', f: '#4a3e44', P: '#e8a0a0' };
[0, 1].forEach(f => add(`rat_${f}`, [
  '........',
  '........',
  '........',
  '....OO..',
  '.OOOFPO.',
  'OFFFFFEO',
  'PfFFFFOO',
  f ? '.O.OO.O.' : '..O..O..',
], beast));
[0, 1].forEach(f => add(`bat_${f}`, f ? [
  '........',
  '........',
  '...OO...',
  'OOOFFOOO',
  'OffFEffO',
  '.Of..fO.',
  '..O..O..',
  '........',
] : [
  'O......O',
  'OfO..OfO',
  'OffOOffO',
  '.OfFFfO.',
  '..OFEO..',
  '...OO...',
  '........',
  '........',
], { F: '#5a4a6a', f: '#3a2a4a', E: '#e04030' }));
[0, 1].forEach(f => add(`slime_${f}`, f ? [
  '........',
  '........',
  '........',
  '..OOOO..',
  '.OGWGGO.',
  'OGGGEGEO',
  'OgGGGGGO',
  '.OOOOOO.',
] : [
  '........',
  '........',
  '........',
  '........',
  '..OOOO..',
  '.OGWGEGEO'.slice(0, 8),
  'OgGGGGGO',
  'OOOOOOOO',
], { G: '#60c050', g: '#307a30', W: '#c8f8b0' }));
[0, 1].forEach(f => add(`spider_${f}`, [
  '........',
  '........',
  '..OOOO..',
  '.OFFFFOO',
  'OfFFFFRO',
  '.OOOOOO.',
  f ? 'O.O..O.O' : '.O.OO.O.',
  f ? 'O..OO..O' : 'O.O..O.O',
], { F: '#4a3a3a', f: '#2a1e1e', R: '#e04030' }));

// ---- dragon 16x16 ----
const DR = { A: '#c04a28', a: '#7a2a18', B: '#d8a050', N: '#f0d080', E: '#f0e040', S: '#6a6a6a', Z: '#f0f0f0' };
const dragonSleep = f => [
  '................',
  '................',
  '................',
  '................',
  '................',
  f ? '..........Z.....' : '............Z...',
  f ? '...........Z....' : '..........Z.....',
  '.....OOOOOO.....',
  '...OOaAAAAaOO...',
  '..OaAAaAAaAAAO..',
  '.OAAOOOAAAAAAAO.',
  'OaAOBBBOOOOAAAO.',
  'OAOBNNNNBBOOAEOO',
  f ? 'OAOBNNNNNNBOAAAO' : 'OAOBNNNNNNBOAAAO',
  '.OaaOBBBBBOaAAO.',
  '..OOOOOOOOOOOO..',
];
const dragonWake = f => [
  f ? 'O.............O.' : '................',
  f ? 'OaO.......OO.Oa.' : 'O......OO.......',
  f ? 'OaAO.....OAAO.O.' : 'OaO...OOAAO.....',
  f ? '.OaAO...OAEAAO..' : 'OaAOOOaAAAAO.O..',
  f ? '.OaAAO..OAAAAAAO' : '.OaAAAOAAEAAAOO.',
  f ? '..OaAAOOOAAOOOOO' : '..OaAAAAAAAAAAAO',
  f ? '...OaAAOAAO.....' : '...OaAAAAOOOOOOO',
  '....OOOAAAO.....',
  '...OOaAAAAO.....',
  '..OaAAaABAO.....',
  '.OAAAAAAANBO....',
  'OaAAAAAAANBO....',
  'OAAAAAAAANBO....',
  'OaAAOOAAAOO.....',
  '.OAO.OAO.OAO....',
  '.OOO.OOO.OOO....',
];
[0, 1].forEach(f => { add(`dragon_${f}`, dragonSleep(f), DR); add(`dragon_wake_${f}`, dragonWake(f), DR); });

// ---- animals ----
[0, 1].forEach(f => add(`cat_${f}`, [
  '........',
  '.....O.O',
  'O...OFOF',
  'FO..OFEF',
  'FO.OFFFO',
  '.OFFfFFO',
  '.OFfFfO.',
  f ? '.OO.OO..' : 'O.O..O.O',
], { F: '#e09040', f: '#a05a20' }));
[0, 1].forEach(f => add(`dog_${f}`, [
  '........',
  '....OOO.',
  'O..OdFEO',
  'FO.OdFFF',
  'FOOOFFOO',
  '.OFFFFO.',
  '.OFFFFO.',
  f ? '.OO.OO..' : 'O.O..O.O',
], { F: '#b88050', d: '#6a4420' }));
[0, 1].forEach(f => add(`chicken_${f}`, [
  '........',
  '.....R..',
  '....OWO.',
  '....OWEY',
  'OO.OWWO.',
  'OWWWwWO.',
  '.OWWWO..',
  f ? '...YY...' : '..Y..Y..',
]));
[0, 1].forEach(f => add(`bird_${f}`, f ? [
  '........',
  '........',
  '...OO...',
  '..OFFO..',
  'OOFFFEY.',
  '.OfFFO..',
  '..OOO...',
  '........',
] : [
  '........',
  '..O.....',
  '..OfO...',
  '..OFfO..',
  'O.OFFEY.',
  '.OFFFO..',
  '..OOO...',
  '........',
], { F: '#6a8ac0', f: '#3a5a8a', Y: '#e0a020' }));

// ---- props ----
add('coin', ['........', '........', '..OOOO..', '.OYYYyO.', '.OYDYyO.', '.OYDYyO.', '.OyyyyO.', '..OOOO..']);
add('sack', ['........', '...OO...', '..OSSO..', '...OO...', '.OSSSSO.', 'OSSsSSSO', 'OSSSSSsO', '.OOOOOO.'], { S: '#c8a870', s: '#8a7048' });
add('mush', ['........', '..OOOO..', '.OMMWMO.', 'OMWMMMMO', 'OOOOOOOO', '...OWO..', '...OWO..', '..OOOOO.'], { M: '#40d0c0', W: '#c0fff0' });
add('grave', ['...OO...', '..OLLO..', '.OLGGLO.', 'OLGLLGLO', '.OLGGLO.', '.OLLLLO.', '.OLLLgO.', 'OOOOOOOO']);
const flame = [
  ['...Y....', '..YRY...', '..RYR...'],
  ['....Y...', '...YRY..', '..RRYR..'],
  ['...Y....', '..YYR...', '..RYYR..'],
];
flame.forEach((fl, i) => add(`torch_${i}`, [...fl.map(r => r.slice(0, 8)), '..OWO...', '...D....', 'OOODO...', 'OgODO...', 'OO.O....'].slice(0, 8)));
add('bone', ['........', '........', '.WW...W.', 'WWWWWWWW', '.WOWWWO.', '.W...WW.', '........', '........']);
add('fish', ['........', '........', '..OOOO.O', '.OFFFFOF', 'OEFfFFFF', '.OFFFFOF', '..OOOO.O', '........'], { F: '#80a0b8', f: '#c8d8e8' });

// ---- speech icons 7x7 ----
const bubble = sym => ['.OOOOO.', ...sym.map(r => 'O' + r + 'O'), '.OOOOO.', '..OO...'].slice(0, 7);
const ico = (n, sym, pal) => add('ico_' + n, bubble(sym.map(r => r.replace(/\./g, 'W'))), pal);
ico('happy', ['K...K', '.....', 'K...K', '.KKK.'].slice(0, 4));
ico('angry', ['R...R', '.R.R.', '.....', '.RRR.']);
ico('hungry', ['..MM.', '.MMMM', '.wMM.', 'w....'], { M: '#a05a20', w: '#e8e0d0' });
ico('gold', ['.OOO.', 'OYYYO', 'OYyYO', '.OOO.']);
ico('fear', ['..R..', '..R..', '.....', '..R..']);
ico('sad', ['..b..', '.bbb.', '.bbb.', '..b..']);
ico('love', ['RR.RR', 'RRRRR', '.RRR.', '..R..']);
ico('sleep', ['KKKK.', '..K..', '.K...', 'KKKK.']);

// ---- pack: shelves, tallest first ----
const W = 128; let x = 0, y = 0, shelf = 0; const frames = {};
const order = [...sprites].sort((a, b) => b.rows.length - a.rows.length);
for (const s of order) {
  const w = s.rows[0].length, h = s.rows.length;
  if (x + w > W || (shelf && h !== shelf)) { y += shelf; x = 0; shelf = 0; }
  shelf = Math.max(shelf, h);
  frames[s.name] = { x, y, w, h, ax: w >> 1, ay: h }; s.x = x; s.y = y; x += w;
}
const H = y + shelf;
const buf = Buffer.alloc(W * H * 4);
for (const s of sprites) s.rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
  if (ch === '.') return; const hex = s.pal[ch]; if (!hex || hex.length < 4) throw new Error(`no colour '${ch}' in ${s.name}`);
  const v = hex.length === 4 ? [...hex.slice(1)].map(c => parseInt(c + c, 16)) : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const o = ((s.y + ry) * W + s.x + rx) * 4; buf[o] = v[0]; buf[o + 1] = v[1]; buf[o + 2] = v[2]; buf[o + 3] = 255;
}));
const animations = {};
for (const n of Object.keys(frames)) { const m = n.match(/^(.*)_(\d)$/); if (m) (animations[m[1]] ||= { frames: [], speed: 4 }).frames.push(n); }
for (const a of Object.values(animations)) a.frames.sort();
for (const [k, a] of Object.entries(animations)) if (a.frames.length < 2) throw new Error('lone frame ' + k);

fs.writeFileSync(path.join(ART, 'beings.png'), png(W, H, buf));
fs.writeFileSync(path.join(ART, 'beings.json'), JSON.stringify({ image: 'beings.png', frames, animations }, null, 1));
const idx = path.join(ART, 'index.json');
const index = fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, 'utf8')) : { sheets: [] };
index.sheets ||= []; if (!index.sheets.includes('beings.json')) index.sheets.push('beings.json');
fs.writeFileSync(idx, JSON.stringify(index, null, 1));

if (process.argv[2]) { // nearest-neighbour preview at 8x on a grey backdrop
  const S = 8, big = Buffer.alloc(W * S * H * S * 4);
  for (let yy = 0; yy < H * S; yy++) for (let xx = 0; xx < W * S; xx++) {
    const si = ((yy / S | 0) * W + (xx / S | 0)) * 4, o = (yy * W * S + xx) * 4;
    if (buf[si + 3]) buf.copy(big, o, si, si + 4); else { const g = ((xx >> 6) + (yy >> 6)) & 1 ? 90 : 70; big[o] = big[o + 1] = big[o + 2] = g; big[o + 3] = 255; }
  }
  fs.writeFileSync(process.argv[2], png(W * S, H * S, big));
}
console.log(`beings.png ${W}x${H}, ${Object.keys(frames).length} frames, ${Object.keys(animations).length} animations`);
