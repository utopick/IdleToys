#!/usr/bin/env node
// Look at a gauntlet entry: screenshots at phone and desktop size, after 5 s, after 60 s idle,
// and after a tap in the middle; console messages and page errors go to console.txt.
// Usage: node idletoys/tools/look.mjs <url> <out-folder> [idleSeconds=60] [sizes=390x844,1920x1080]
// Needs only Node 22+ and Google Chrome (talks to Chrome over the DevTools protocol).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, out, idleArg, sizesArg] = process.argv.slice(2);
if (!url || !out) { console.error('usage: look.mjs <url> <out-folder> [idleSeconds] [sizes]'); process.exit(2); }
const IDLE = Number(idleArg || 60);
const SIZES = (sizesArg || '390x844,1920x1080').split(',').map(s => s.split('x').map(Number));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
let errors = 0;

async function target(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

function connect(wsUrl, tagOf) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const wait = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { const [ok, bad] = wait.get(m.id); wait.delete(m.id); m.error ? bad(new Error(m.error.message)) : ok(m.result); return; }
    const tag = `[${tagOf()}]`;
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map(a => a.value ?? a.description ?? a.type).join(' ');
      if (m.params.type === 'error') errors++;
      log.push(`${tag} console.${m.params.type}: ${text}`);
    } else if (m.method === 'Runtime.exceptionThrown') {
      errors++; const d = m.params.exceptionDetails;
      log.push(`${tag} PAGE ERROR: ${d.exception?.description || d.text} (${d.url || ''}:${d.lineNumber})`);
    } else if (m.method === 'Log.entryAdded') {
      const en = m.params.entry; if (en.level === 'error') errors++;
      log.push(`${tag} ${en.source}.${en.level}: ${en.text} ${en.url || ''}`);
    }
  };
  const send = (method, params = {}) => new Promise((ok, bad) => { wait.set(++id, [ok, bad]); ws.send(JSON.stringify({ id, method, params })); });
  return new Promise(r => { ws.onopen = () => r({ send, close: () => ws.close() }); });
}

const shots = [];
async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(out, name + '.png'); writeFileSync(file, Buffer.from(data, 'base64')); shots.push(file);
}

async function look([w, h], n) {
  const tag = `${w}x${h}`; let now = tag;
  const profile = mkdtempSync(join(tmpdir(), 'look-'));
  const port = 9300 + n * 7 + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, ['--headless=new', '--mute-audio', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  try {
    const cdp = await connect(await target(port), () => now);
    await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Page.enable');
    const mobile = w < 800;
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    await cdp.send('Page.navigate', { url });
    await sleep(5000); await shot(cdp, `${tag}-05s`);
    await sleep(Math.max(0, IDLE - 5) * 1000); await shot(cdp, `${tag}-${IDLE}s`);
    now = tag + ' after tap';
    const x = w / 2, y = h / 2;
    if (mobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    await sleep(1500); await shot(cdp, `${tag}-tap`);
    cdp.close();
  } catch (e) { log.push(`[${tag}] LOOK TOOL FAILED: ${e.message}`); errors++; }
  finally {
    chrome.kill(); await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
await Promise.all(SIZES.map(look));
log.sort();
writeFileSync(join(out, 'console.txt'), log.join('\n') + '\n');
console.log(shots.map(s => '  ' + s).join('\n'));
console.log(`errors: ${errors}  (console log: ${join(out, 'console.txt')}, ${log.length} lines)`);
