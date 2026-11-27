// Builds art/beings.png + art/beings.json from ASCII grids. Node built-ins only.
// Grids hold the fill only; a 1px dark outline is added around them (walkers: top/left/right, others all sides).
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const OUT = path.join(__dirname, '..', 'art');
const P = {
  k:'1a1020', s:'f2c79a', S:'c98b62', h:'6b3e26', G:'a0a0a0', g:'808080', d:'606060',
  m:'d8dce8', M:'9aa0b4', n:'5c6378', e:'9ee060', E:'5aa83a', F:'2f6b2a',
  r:'e8805a', R:'b04a32', q:'6e2a22', b:'f4f0dc', B:'c8c0a0', u:'c8d8b8', U:'90a888',
  w:'b07a44', W:'7a4e2a', x:'4a2e18', y:'ffd84a', Y:'d09a20', o:'ffffff', O:'d8d8e8',
  z:'e83838', c:'5a8ae8', C:'3a5ab0', p:'9a5ad0', P:'6a3a9a', i:'f08aa8', l:'7ae0c0', L:'3aa890',
  t:'5ac0a0', T:'2f8a78', v:'1f5a50', a:'8a9ab0', A:'5a6a80',
};
const OUTLINE = P.k;
const sprites = []; // {name, px:[[rgba]], w, h}
function S(name, rows, full) {
  const gw = rows[0].length, gh = rows.length;
  rows.forEach((r, i) => { if (r.length !== gw) throw Error(`${name} row ${i} width ${r.length} != ${gw}`); });
  const w = gw + 2, h = gh + (full ? 2 : 1), oy = 1;
  const px = Array.from({length: h}, () => Array(w).fill(null));
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    if (!P[ch]) throw Error(`${name}: bad letter ${ch}`);
    px[y + oy][x + 1] = P[ch];
  }));
  const fill = px.map(r => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fill[y][x]) continue;
    if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => fill[y+dy] && fill[y+dy][x+dx])) px[y][x] = OUTLINE;
  }
  sprites.push({name, px, w, h});
}
const W = (n, r) => S(n, r, false), Fu = (n, r) => S(n, r, true);
const swapLast = (rows, ...last) => rows.slice(0, rows.length - last.length).concat(last);
// breathing: rows above `split` move up one, row `split` is doubled
const breathe = (rows, split) => rows.slice(1, split).concat([rows[split]], rows.slice(split));

// ---- town ----
const vil = ['.hhh..','.hssk.','..ss..','.Gggg.','.gggs.','.dddd.','.d..d.'];
W('villager0', vil); W('villager1', swapLast(vil, '..dd..'));
const hood = ['.ggg..','gGssk.','.gss..','.Gggg.','.gggs.','.dddd.','.d..d.'];
W('villager_hood0', hood); W('villager_hood1', swapLast(hood, '..dd..'));
W('villager_carry', ['..hhh.','..hssk','ww.ss.','wwGggs','WWggg.','.Wddd.','..d.d.']);
const adv = ['m.mmm.','m.mMsk','m..ss.','wnMMcc','.MMMcC','.nnncC','.W..W.'];
W('adventurer0', adv); W('adventurer1', swapLast(adv, '..WW..'));
const mage = ['...p.y','..pp.w','.pPPpw','..sskw','.pPpsw','.pPPPw','.x..xw'];
W('adventurer_mage0', mage); W('adventurer_mage1', swapLast(mage, '..xx.w'));
const tra = ['www.h.','wYwhsk','wwWss.','wWWEEs','WWWEEs','.x.FF.','..F..F'];
W('trader0', tra); W('trader1', swapLast(tra, '...FF.'));
const cartTop = ['............a.','.OOOOO.....aa.','OOOOOOO....aak','OoOoOoO....aaa','wwwwwwwWaaaa..','WWWWWWWWaaaA..'];
W('cart0', cartTop.concat(['.xxx....A..A..','.xYx....A..A..','.xxx....A..A..']));
W('cart1', cartTop.concat(['.xYx.....AA...','.xxx.....AA...','.Yxx....A..A..']));
const horse = ['.......xw.','......xwwk','......xwww','.wwwwwwwW.','xwwwwwwwW.','x.WWWWWW..'];
W('horse0', horse.concat(['..W.W.W.W.','..W.W.W.W.','..x.x.x.x.']));
W('horse1', horse.concat(['...WW.WW..','...WW.WW..','...xx.xx..']));
const cat = ['Y..Y.Y','Y..yyk','.yyyyy','.yYyY.','.Y..Y.'];
W('cat0', cat); W('cat1', swapLast(cat, '..YY..'));
const dog = ['....Ww','W..wwk','.wwwww','.wWwW.','.W..W.'];
W('dog0', dog); W('dog1', swapLast(dog, '..WW..'));
const hen = ['...z.','O.oky','OOoo.','.OOo.','.y.y.'];
W('chicken0', hen); W('chicken1', swapLast(hen, '..y..'));

// ---- dungeon ----
const gob = ['E....E','EEeeEE','.eeeke','..eee.','.wwwe.','.wWwe.','.F..F.'];
W('goblin0', gob); W('goblin1', swapLast(gob, '..FF..'));
W('goblin_dig', ['E..nnn','EEeeWE','.eekW.','..eWe.','.wWwe.','.wWw..','.F..F.']);
W('goblin_carry', ['.zoz..','wWwWw.','EeeeE.','.eeke.','.www..','.wWw..','.F.F..']);
const kob = ['...q..','..rrr.','..rkrr','...rr.','..Rrrr','q.RRr.','.qR.R.'];
W('kobold0', kob); W('kobold1', swapLast(kob, '.q.RR.'));
const skel = ['.bbb..','.bbkk.','..bbB.','.bBbBb','..BbB.','..b.b.','.b..b.'];
W('skeleton0', skel); W('skeleton1', swapLast(skel, '..bb..', '..bb..'));
const gho = ['..uuu.','.uuuz.','..uuu.','.UuUuu','UUuU.U','.UUU..','.U..U.'];
W('ghoul0', gho); W('ghoul1', swapLast(gho, '..UU..'));
W('rat0', ['..Mi','MMMk','i.M.']); W('rat1', ['..Mi','MMMk','i..M']);
Fu('bat0', ['P....P','PP..PP','.PpyP.','..pp..']);
Fu('bat1', ['......','..pp..','PPpyPP','P.pp.P']);
W('slime0', ['..ll..','.loll.','.llkL.','.lllL.','.LLLL.']);
W('slime1', ['......','......','.ollkL','llllll','LLLLLL']);
W('spider0', ['.Mnn..','nnnnnz','n.n.n.','.n.n.n']);
W('spider1', ['.Mnn..','nnnnnz','.n.n.n','n.n.n.']);

// ---- guardians 16x16 (grid 14x15) ----
const drS = ['..............','..............','..............','..............','..............','..............',
  '......vv......','...vvvTTv.....','..vTTTTTTv....','.vTTTTTTTTv...','.ttttttttt....',
  'tttttttttTtY..','tyyyyyytTtttv.','tyyyyyytTttttt','.tTTtTTTTT.TT.'];
W('dragon_sleep0', drS); W('dragon_sleep1', breathe(drS, 10));
const drLow = ['...tttyyt.....','..ttttyyyt....','.tttttyyyt....','tt.tTttyTt....','t..tT..tT.....','t..TT..TT.....','.t.vv..vv.....'];
W('dragon_wake0', ['v.........Y.Y.','vv.......tttt.','vTv......ttytt','vTTv.....tttTT','vTTTv...ttt...','vTTTTv.ttt....','.vTTTTvtt.....','..vTTtttt.....'].concat(drLow));
W('dragon_wake1', ['..........Y.Y.','.........tttt.','.........ttytt','vvv......tttTT','vTTTvv..ttt...','.vTTTTvttt....','..vvTTTtt.....','...vvtttt.....'].concat(drLow));
const trS = ['..............','..............','..............','..............',
  '....aaaa......','...aaaaaa.....','...aaaAAa.....','..aaaabaab....','.aaaaaaaaaa...','aaAaaaaaaaaa..',
  'aaAAaaaaaaaaa.','aAAAaaaaWWWWa.','aAAAaaWWWWWWa.','.AAAaaaAAAaaaa','..AAA..AAAAAAA'];
W('troll_sleep0', trS); W('troll_sleep1', breathe(trS, 9));
const trTop = ['.....aaaa.....','....aaaaaa....','....aaaaza....','....aaabab....','..aaaaaaaaa.ww','.aaaaaaaaaaaWw',
  'aaAaaaaaaaaaW.','aaAAaaaaaaAaW.','aA.AaaaaaA.aW.','aA.WWWWWWW.aW.','aa.WWWWWWW.aa.'];
W('troll_wake0', trTop.concat(['...aaa..aaa...','...aAa..aAa...','...AAa..AAa...','..AAAA.AAAA...']));
W('troll_wake1', trTop.concat(['...aaa...aaa..','..aAa....aAa..','..AAa....AAa..','.AAAA...AAAA..']));

// ---- speech icons 9x9 (bubble 7x6 + tail) ----
const bub = (name, inner) => Fu(name, ['ooooooo', ...inner, 'ooooooo'.slice(0, 7), '.o.....'].slice(0, 7));
bub('ic_happy', ['oozozoo','ozzzzzo','oozzzoo','ooozooo']);
bub('ic_angry', ['ozzzzoo','oooozoo','oozzzoo','ozooooo']);
bub('ic_hungry', ['oooowwo','ooowWWo','oooWWoo','ooBoooo']);
bub('ic_gold', ['ooyyyoo','oyyYyyo','oyyYyyo','ooYYYoo']);
bub('ic_sleep', ['oocccco','oooocoo','ooocooo','oocccco']);
bub('ic_fear', ['ooozooo','ooozooo','ooooooo','ooozooo']);
bub('ic_sad', ['ooocooo','oocccoo','oocCcoo','ooocooo']);
bub('ic_music', ['ooookko','ooookoo','ookkkoo','ookkooo']);

// ---- items 5x5 ----
Fu('sack', ['.w.','wWw','www']);
Fu('coin', ['yyy','yYy','yyy']);
Fu('shroom', ['zoz','zzz','.b.']);
Fu('fish', ['c.c','.cc','c.c']);

// ---- pack (shelves) ----
const SHEET_W = 128;
let cx = 0, cy = 0, rowH = 0; const frames = {};
for (const s of sprites) {
  if (cx + s.w > SHEET_W) { cx = 0; cy += rowH + 1; rowH = 0; }
  s.x = cx; s.y = cy; cx += s.w + 1; rowH = Math.max(rowH, s.h);
  frames[s.name] = {x: s.x, y: s.y, w: s.w, h: s.h, ax: Math.floor(s.w / 2), ay: s.h};
}
const SHEET_H = cy + rowH;
const img = Buffer.alloc(SHEET_W * SHEET_H * 4);
for (const s of sprites) s.px.forEach((r, y) => r.forEach((c, x) => {
  if (!c) return; const o = ((s.y + y) * SHEET_W + s.x + x) * 4;
  img[o] = parseInt(c.slice(0,2),16); img[o+1] = parseInt(c.slice(2,4),16); img[o+2] = parseInt(c.slice(4,6),16); img[o+3] = 255;
}));

function png(w, h, rgba) {
  const crcT = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const anims = {};
const walk = ['villager','villager_hood','adventurer','adventurer_mage','trader','cart','cat','dog','chicken','horse',
  'goblin','kobold','skeleton','ghoul','rat','bat','slime','spider','dragon_sleep','dragon_wake','troll_sleep','troll_wake'];
const fps = {bat: 8, slime: 4, dragon_sleep: 1, troll_sleep: 1, dragon_wake: 3, troll_wake: 3};
for (const a of walk) {
  const f = [a + '0', a + '1']; f.forEach(n => { if (!frames[n]) throw Error('missing ' + n); });
  anims[a] = {frames: f, fps: fps[a] || 6};
}
fs.mkdirSync(OUT, {recursive: true});
fs.writeFileSync(path.join(OUT, 'beings.png'), png(SHEET_W, SHEET_H, img));
fs.writeFileSync(path.join(OUT, 'beings.json'), JSON.stringify({image: 'beings.png', frames, anims}));
// optional scaled preview: node make-beings.js <out.png> <scale>
if (process.argv[2]) {
  const k = +process.argv[3] || 6, pw = SHEET_W * k, ph = SHEET_H * k, pv = Buffer.alloc(pw * ph * 4);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const o = (y * pw + x) * 4, i = ((y / k | 0) * SHEET_W + (x / k | 0)) * 4;
    if (img[i + 3]) img.copy(pv, o, i, i + 4); else { const v = ((x / k | 0) + (y / k | 0)) & 1 ? 0xc8 : 0xe8; pv[o] = pv[o+1] = v; pv[o+2] = v + 10 > 255 ? 255 : v; pv[o+3] = 255; }
  }
  fs.writeFileSync(process.argv[2], png(pw, ph, pv));
}
console.log(`${sprites.length} frames, sheet ${SHEET_W}x${SHEET_H}`);
