# The idle toys gauntlet

Three models, the same brief, 15 minutes each per idea. Then we look at what they made.

## Layout
Each entry goes in its own folder, and nowhere else:

```
idletoys/<idea>/gauntlet/<model>/
  index.html            everything: code, styles, pixel art, music
  manifest.webmanifest  PWA
  sw.js                 PWA (offline cache)
  icon.svg              optional; or an icon drawn inside the manifest/page
  NOTES.md              what it is, how to play, what's next
```
`<idea>` is `dungeon`, `civilization` or `drive`. `<model>` is a short lowercase name (for example `opus`, `gpt`, `gemini`).

## The rules
1. **Time: 15 minutes**, from the first file read to the last file written. Keep a working version saved at all times: a polished half is better than a broken whole.
2. **Monolithic:** all code, CSS, art and audio live in `index.html` (reused code is copied in, never linked). Only the three small PWA files and `NOTES.md` sit beside it.
3. **PWA compatible:** the manifest and service worker are linked from `index.html`, it installs, and it runs offline after the first visit.
4. **No dependencies, no network:** apart from our own code (see *What you may reuse*), no libraries, no CDNs, no web fonts, no images or sounds from outside. Draw the pixel art in code (or as data in the file) and make the sound with the Web Audio API. Optional single exception: real weather from `https://api.open-meteo.com`, and only if the toy still works fully without it.
5. **Phones first:** designed for 390 x 844, touch only (no hover, no right click, big targets). It must also look right on a desktop screen.
6. **Idle first:** it runs and looks alive with nobody touching it. When idle, no HUD: just the scene and the music. The player can **steer** at any time, never **control**.
7. **Sound:** generative music that fits the idea, started by the first tap (browsers block autoplay), with a way to mute it.
8. **Real time:** use the device clock where the idea calls for it (day and night, a town hall clock...).
9. **Original art only:** no characters, logos or scenes from existing games, anime or films. Inspired by is fine; copied is not.
10. **Clean:** no errors in the browser console. Untrusted text never goes into `innerHTML` unescaped. Save state with `localStorage` (wrapped in try/catch) if it helps.
11. **Stay in your folder:** read `idletoys/README.md`, `idletoys/<idea>/IDEA.md` and `idletoys/<idea>/inspiration/` (for the gauntlet, these rules win over the brief's "Working on it" section: no git); do not change any other file or folder, do not use git, do not push or publish anything.

## The target
It should look **polished, usable and ready to be enjoyed right now**, and at the same time it's obvious it is a first version that needs more work later. Depth of feeling over breadth of features.

## What you may reuse
Only the two sources below: copy them into your `index.html` and adapt them. Read-only: never change the originals. Say in NOTES.md what you reused.

- **The Clockscapes music generator:** `clockscapes/src/app.html`, the whole `<script id="lofi">` (about 130 KB). It stands alone and can be pasted in as it is; read its header comment first, not the whole script. `LOFI.song(seed, mood)` writes a song from a number (mood: `night`, `rain`, `thunder`, `wind`, `sea`, `crowd`, `trains`, `region`...), and `new LOFI.Player(ctx, destination, sheet, start, fadeIn, nf)` plays it with Web Audio (call `schedule(until)` often, `fadeOut`, `dispose`). Adapt it to your style: add a row to `STYLES` (scales, chords, tempo, drone, ostinato, voices) for dungeon synth, medieval, synthwave... `<script id="lofi-samples">` (recorded bagpipe, guitar, piano; CC0, about 220 KB) is optional. Leave out `lofi-wasm`.
- **Clockscapes' world code** (same file): `sunPos(ms, lat, lon)` for real sunlight, the Open-Meteo weather fetch and cache (`wx:open-meteo:`), the screen filters (CRT, VHS, Game Boy, CGA...), rain, traffic and people drawing.

Budget your 15 minutes: find the part you need with `grep` and copy it; don't read whole files.

## NOTES.md (write it before time runs out)
- One line: what it is.
- How to play / steer.
- What was left out or is rough.
- The three next things you would build.
- The model name and how long it took.

## Judging (each 1 to 5)
| | |
|---|---|
| **Artfulness** | Does it have a look and a mood of its own? |
| **Polish** | Does the first minute feel finished? |
| **Idle** | Is it lovely to leave running with no HUD? |
| **Steering** | Are the interactions meaningful without taking control? |
| **Music** | Does the sound fit and stay pleasant over time? |
| **Faithful** | How much of IDEA.md shows on screen? |
| **Room to grow** | Is the code a good base to keep going? |

Test each entry at 390 x 844: from `TP/idletoys/` run `python3 -m http.server 8090`, then open `http://localhost:8090/<idea>/gauntlet/<model>/` (localhost, so the service worker and audio work). Then try it on a real phone. The Pocket dev server only serves the apps, not this folder.

## The prompt to paste
Replace `<idea>` and `<model>`:

> You are taking part in a timed build. Read `idletoys/GAUNTLET.md`, `idletoys/README.md`, `idletoys/<idea>/IDEA.md` and the pictures in `idletoys/<idea>/inspiration/`, then build your entry in `idletoys/<idea>/gauntlet/<model>/` following the rules in GAUNTLET.md exactly. You may copy and adapt our own code listed under "What you may reuse", such as the Clockscapes music generator. You have 15 minutes: keep a working version saved at all times, make it the most artful and enjoyable version of the idea you can, and write NOTES.md before you stop. Do not touch any other file or folder.
