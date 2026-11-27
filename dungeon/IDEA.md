# Dungeon Town: project brief

Everything needed to start this project is in this file: the design, the rules, the references, and the owner's original notes. The reference pictures are in `inspiration/`; `gauntlet/` holds earlier timed attempts (look, don't copy).

## The pitch
A town on the surface and a dungeon beneath it, in one picture. The citizens want the dungeon's gold, the monsters want the town's food. They clash, but they need each other, so neither ever wins. You watch the balance swing through the ages, and now and then you nudge fate.

## Pillars (never break these)
1. **Neither side wins.** It is an ecosystem, not a war. Balance swings, it doesn't settle.
2. **No HUD, art first.** No numbers on screen. The state of the world is read from the scene: piles of gold, a full or empty granary, hungry goblins, a town in decay. Text only when nothing else can say it.
3. **Idle first.** Lovely to leave running for hours. The player steers, never controls.
4. **Bittersweet.** Beings can die and are remembered. The cycle mourns and goes on.
5. **Detailed, gritty pixel art at PSX level** (see *Art direction*): textured stone, mortar, worn edges, darkness lit by torches and windows. The detail is in the **place itself**; the beings stay tiny and cute: 8 x 8 at most, big monsters 16 x 16.

## Art direction: PSX-era detail
The target is the detail of **Psygnosis games on the PlayStation** (mid-90s): rich, rendered-looking pixel art, not flat retro shapes.
- **Many shades per material:** stone, wood, metal, skin and cloth each have highlights, mid-tones, shadows, texture and worn edges; dithering where it helps.
- **Light makes the mood:** coloured light sources (torches, windows, neon, the sun) tint what is near them, with soft glows, deep shadows and ambient light that follows the hour.
- **Depth:** several layers, with parallax or atmospheric fade, and foreground details framing the scene.
- **Nothing visibly repeats:** variants of every tile and prop, mixed and decorated, so a wall or a forest never reads as a stamp.
- **Tiny, cute beings in a detailed world:** people, monsters and animals stay small and simple (they look cute that way), with a few animation frames (walk, work, idle, a reaction). The PSX detail goes into the **environment**: the places, buildings, materials and light.
- **Variety among the beings:** small doesn't mean identical. Vary colours (skin, hair, clothes, cloaks, armour, fur, scales) and shapes (height, build, hats and hoods, beards, weapons, tools, packs, ears, horns, tails) so that people, adventurers and monsters each look like individuals in a crowd. Build them from mixable parts or palette swaps in the art sheets, picked by the seed.
- A higher internal resolution than the first rounds (around **640 x 360**, scaled up crisply) to carry the detail.

## The world
- **One run per device.** The player picks a real city (its real time and weather drive the town); the world adapts to the screen's shape once, when the run is founded.
- **Fate by dice:** a seed thrown at the start sets the run's temperament and cast.
- **Cycles:** boom, collapse, rebuild, driven by greed, hunger, the seasons and rare events. Sometimes the town's greed does more harm than the monsters (decadence: loot over food); sometimes the monsters' greed turns the town Diablo-like.
- **Ages pass** until a **point of no return**: the town is lost, and that city can never be picked again on that device.
- **It catches up** while closed, and on return a short chronicle tells what happened.

## The beings
- **Below**, from the Swords & Wizardry open bestiary (Open Game License 1.0a: include its notice): one of each role per run: **workers** (farm mushrooms, dig gold, raid granaries), **lurkers** (undead, deep, nocturnal), **beasts** (the dungeon's wildlife), a **guardian** (sleeps on the hoard, wakes rarely).
- **Above:** **trades** (each with a place), **adventurers** (some never return), **traders** (caravans crossing at the sides), **animals**.
- Every being has **needs, a mood, relationships and memories**, in the spirit of Dwarf Fortress. Their small stories emerge from that, not from scripts.
- **The river** links the halves; the seed or the season decides its direction.

## The dungeon is an ecosystem
Not stacked corridors that look alike: a living underground made of **natural caves and built rooms**, joined by tunnels, shafts, ladders, rope lifts and the river.
- **Caves:** irregular, natural shapes: water, roots, fungus, crystals, rubble, bones, nests.
- **Rooms:** built by someone, once: cells, a library, a crypt, an armoury, a larder, a shrine, a forge, a throne room gone to ruin.
- **Each level has a theme**, with its own materials, palette, light, inhabitants, sounds and part in the food chain. For example (invent your own; the seed should vary them):
  1. **Cellars and old mines** right under the town: timber props, barrels, lanterns, where the two worlds touch.
  2. **The fungus caves:** damp, glowing mushrooms, where the workers farm.
  3. **The river grotto:** flooded halls, waterfalls, fish and things that eat fish.
  4. **The crypts:** cold blue light, candles, bones; the lurkers' home, busier at night.
  5. **The hoard:** deep, warm, gold glinting, the guardian asleep.
- **The levels feed each other:** mushrooms feed the workers, the workers feed the beasts, the river carries food and waste down, gold travels up, town food travels down. Each level has its own small balance inside the big one.
- **Levels change with the cycles:** dug deeper in a boom, flooded, collapsed or abandoned in a fall, resettled later.
- How many levels show depends on the screen's shape (a phone shows more of them, stacked; a wide screen shows more of each).

## Floors and the frontier
- **Both sides start equal: two floors each.** The town has two floors above ground (its buildings' storeys and streets), the dungeon two levels below.
- **Each step of progress adds a floor** to that side: the town builds up and digs cellars and mines down; the monsters dig new levels, up as well as down.
- **The frontier moves:** as one side grows it **pushes its rival up or down**. A thriving town digs into the top of the dungeon and drives the monsters deeper; a thriving dungeon breaks up into the cellars and the town has to climb, building on top of itself. Over the cycles the line between them swings, and the picture shows who is winning right now.
- **Building interiors:** the town's buildings can be seen inside, as cutaways like `inspiration/03-dungeon-cross-section.png`: the tavern, the forge, homes, the granary and the vault, with the tiny beings at work in them. The dungeon's rooms are seen the same way.

## Steering
- **Send groups:** a horn sends delvers down, a drum sends monsters up.
- **Nudge fate,** once every 30 minutes: rain, a festival, a feast, wake the guardian... Every nudge **has consequences** that ripple into the cycle.
- **Follow someone:** tap a being and the camera zooms, centres and follows. Speech icons show how they feel in each interaction. Notable lives go into the town's chronicle; the fallen get a named grave.

## Sound
Generative (the Clockscapes `LOFI` engine, with its own style rows). The music follows which half the action is in (town tune or dungeon drone), the time of day (medieval by day, dungeon synth at night), the weather and the phase of the cycle.

## A first version must have
- Both halves, filled with the detail of `inspiration/` (a real town street; a dungeon of caves and rooms), on any screen shape.
- Two floors per side at the start, at least one new floor appearing from progress, and the frontier visibly moving.
- Town buildings shown as cutaways with their interiors.
- At least **three themed levels** that look, sound and live differently, with both caves and rooms, and something visibly moving between levels (food, gold, water, beings).
- Real time, day and night, and the weather of the picked city (Open-Meteo, working without it too).
- The gold-for-food loop running visibly, with at least one full cycle swing.
- A seeded cast from the bestiary, the river, and at least one rare event.
- All three steering modes, the 30-minute nudge, and follow with speech icons and a grave.
- Music that changes with day, night and the half in focus.
- Saved state and a catch-up chronicle.

## Free to invent
How the beings look and move, what rare events exist, how a cycle shows on screen, the chronicle's voice, the town's layout, small details and surprises. Make it yours.

## Not wanted
Flat plain colours and empty dirt bands; tiny hints nobody can read; a scene that looks the same after ten minutes.

## Known bugs and lessons (rounds one and two)
Don't repeat these.
- **Silent on phones** (round two, dungeon and civilization): the sound was started on `pointerdown`, which a phone's touch doesn't count as a user gesture. Start it on `pointerup` or `click`.
- **Only night was ever seen** (round two, all): both rounds ran at night, so day, dusk and rain went untested. Support `?hour=HH` (and `?weather=rain|snow|clear` where weather matters) to force them, and look at day, dusk and night.
- **Built blind** (round one, all): nobody opened the page. Look at it, more than once.
- **Hints too faint or stuck** (round one): the first-tap hint was nearly invisible, or never went away.
- **Hints stuck on screen, the camera hiding a scene, a broken phone frame, finishing early** (round three): see the rules on hints, `?cam=` and looking below, and use all your time to polish.
- **Features nobody can find** (round two): things built but never seen in a judge's run. Make each one show up on its own while idle at least once in the first minutes.
- Round one: flat plain colours and empty dirt bands between the floors; music came out as a fife over keys, not dungeon synth.
- Round two: every floor repeats the same brick and torch pattern (the beings being tiny is fine: it's the place that needs the detail); after 5 minutes the only clear change was a bigger gold pile; no city picker, no real weather, no ages and no rare event seen on screen.

## Done means
It runs in one `index.html` (PWA, offline), with no console errors, and you'd happily leave it on a second screen all evening.

## References

### Pictures (`inspiration/`)
Reference pictures for the **look**, collected by the owner on 2026-11-27. They are mood references only: never copy them, trace them or ship them in a build. All art is our own.

#### The style wanted
A more **gritty, detailed 90s pixel art**: DOS-era grit with **GBA-style** detail. Not flat shapes: textured stone with visible bricks and mortar, worn edges, dark backgrounds with light coming from torches and windows.

The first gauntlet entry got the layout and the life right, but its art was too flat and clean: plain brown dirt, simple box houses. These show the texture and density wanted.

#### The dungeon (bottom half)
- `01-castle-arches-torches.png`: dark castle halls, red brick arches, torches in sconces, hanging chains, a knight. Strong contrast, very dark background, a limited palette.
- `02-cave-platforms.png`: cold blue-grey brickwork caves, stalactites, spikes, small collectables. Clean, readable layout of platforms and passages.
- `03-dungeon-cross-section.png`: a dungeon seen in cross-section like a dollhouse: cells with bars, ladders, hanging cages, a library, candles, banners, a guardian statue, a gate over water. **The model for how the dungeon floors should be furnished.**

#### The town (top half)
- `04-town-sidescroll.png`: a side-scrolling town: half-timbered house with a market stall and a potion seller, a blacksmith at a forge, a big tree behind. **The model for the town street.**
- `05-town-houses.png`: houses with thatched and tiled roofs, half-timbering, chimneys, trees and lamp posts.
- `06-tiles-houses-interiors-ruins.png`: a sheet of buildings, interiors (tavern, shop), barrels and bottles, ruins and arches overgrown with flowers, stained-glass windows, torches. Ideas for detail and props.

### Influences
Dwarf Fortress (depth of the beings' lives), Diablo (a town turned grim), dungeon synth music, DOS and GBA pixel art, the Swords & Wizardry bestiary. Inspiration only: everything we make is original.

## Rules

### What it is made of
- **Code in one `index.html`:** HTML, CSS, JavaScript and the sound (Web Audio). No build step, no framework, no dependencies.
- **Graphics in separate files, in `art/`,** so they can be improved on their own without touching the code:
  - PNG sprite sheets and tilesets (`art/<name>.png`), each with a small JSON beside it (`art/<name>.json`) listing its frames: name, x, y, w, h, anchor, and animations (frames and speed).
  - `art/index.json` lists every sheet. The code loads that list at start and draws only from it. Nothing graphical is hard-coded in the script beyond effects (light, glow, rain, particles, fades, screen filters).
  - Replacing a PNG with a better one of the same layout needs **no code change**. A missing or broken sheet must not crash: draw a plain placeholder and log one warning.
  - How the art is made is free (drawn, painted, or generated by a script). If a script generates it, keep the script in `tools/` so it can be run again, and keep its output in `art/`.
  - Total art under about 5 MB.
- **Art helpers allowed:** you may spawn **Claude Opus subagents to make the art** in parallel (for example one per sheet: terrain, buildings, beings, props). Give each one the *Art direction*, the relevant `inspiration/` pictures, the sheet layout and JSON format you need, and the folder to write in. They write only into this project's `art/` and `tools/`, follow every rule here (original art only, no copying the references), and look at what they made before handing it back. You integrate and check their work; the result is yours.
- Beside them, what a **PWA** needs: `manifest.webmanifest`, `sw.js` (it caches `index.html` and every file listed in `art/index.json`) and `icons/`. It installs and runs offline after the first visit.
- **Network:** Allowed: real weather from `https://api.open-meteo.com` for the picked city (cache it; the toy must work fully without it). Nothing else.
- **Only free and open fonts and code** (SIL OFL, MIT, LGPL, CC0...), credited in the page. No web fonts loaded from outside: embed them or draw the letters.
- **Original art only.** The pictures in `inspiration/` and the games named below are mood references: never copy, trace or ship them, and no characters, logos or scenes from existing works.

### What you may reuse (copy in, adapt, never link)
Our own code in `TP/` (read-only: never change the originals; say in the docs what you reused):
- **The Clockscapes music generator:** `clockscapes/src/app.html`, `<script id="lofi">` (about 130 KB, stands alone). `LOFI.song(seed, mood)` writes a song from a number; `new LOFI.Player(ctx, destination, sheet, start, fadeIn, nf)` plays it (`schedule(until)`, `fadeOut`, `dispose`). Add rows to its `STYLES` for this project's styles. Read its header comment first; leave out `lofi-wasm`. `<script id="lofi-samples">` (CC0 recordings) is optional.
- **Clockscapes' world code** (same file): `sunPos(ms, lat, lon)` for real sunlight, the Open-Meteo fetch and cache, the screen filters (CRT, VHS...), rain.
- Find the part you need with `grep`; don't read whole files. **Never print, Read or echo the music script** (or any other big file) into your output: in round three that got a builder blocked by an API error, twice. Cut it out and splice it into your page with a command (`awk`, `sed` or a short `python3`) without displaying it.

### How it behaves
- **Any screen:** it reads well on a phone, a desktop and a TV. Touch first: big targets, no hover, no right click. Keys and a mouse also work.
- **No HUD, art first:** text only when nothing else can say it, and never while idle.
- **Idle first, steer not control.**
- Sound starts on the first tap (browsers block autoplay) and can be muted; the choice is remembered. Start or resume the `AudioContext` on `pointerup` or `click`, **never on `pointerdown`**: on phones a touch's pointerdown doesn't count as a user gesture, so the sound stays silent (found in round two).
- **Every hint fades on its own** after a few seconds, even if nobody taps (round three left two stuck in the middle of the screen).
- **Test switches in the address:** `?hour=HH`, `?weather=...` where weather matters, and `?cam=...` to hold the camera on a given view (for example the town, a level, the cockpit, the chase view), so every scene can be looked at on purpose.
- **Saved data must keep loading** in every later version: version the save, fill in what old saves lack, never renumber or rename what is stored. Storage keys start with this project's name. Wrap storage in try/catch.
- Anything loaded or fetched is untrusted: check it, and never put text into `innerHTML` unescaped.
- Respect `prefers-reduced-motion` for flashes and shakes.
- Any text the player sees is in **English and Spanish**.

### Working on it
- The owner's rules apply: commit only as `utopick <310144039+utopick@users.noreply.github.com>` (`git -c user.name=utopick -c user.email=310144039+utopick@users.noreply.github.com commit --author="utopick <310144039+utopick@users.noreply.github.com>"`), never the owner's real name or any other account; a `Co-Authored-By: Claude` trailer is fine. **Ask before anything outward-facing** (pushing, tags, releases, publishing). No temp files in the project; scratch work goes elsewhere. Use they/them for people unless told otherwise.
- **Look at what you build.** Serve the folder (`python3 -m http.server 8090`, then `http://localhost:8090/`) and take screenshots (headless Chrome) at a phone size (390 x 844), a desktop (1920 x 1080) and after a few minutes of idling. Check the console has no errors. Also look at day, dusk and night with `?hour=`, and check after a tap that the sound really started (the `AudioContext` state is `running`). Look at the **phone** screenshot as closely as the desktop one (round three's civilization showed the map's edge on a phone). Every bug in the first round would have been caught by one look.
- **Explain how its systems work** in `docs/SYSTEMS.md`, one section per system (the gold-for-food loop, a being's needs and moods, the cycle (boom, collapse, rebuild, point of no return), the floors and the frontier, a nudge of fate and its consequences, the catch-up on return). Each section has:
  - a **Mermaid diagram** (GitHub draws them): a `flowchart` for loops and flows, a `stateDiagram-v2` for a being's or a system's states, a `sequenceDiagram` for what happens after a tap;
  - the **rules in numbers** (rates, thresholds, timings, chances), named as they are in the code;
  - a **worked example**: a short, concrete run through it, step by step (for example "a goblin with hunger 80 at night: it climbs, finds the granary at 40, takes 3 food, meets a delver, ...");
  - where it lives in the code.
  Keep it true: update it whenever the system changes.
- Keep a `docs/MAINTAINING.md` (how it works inside, what to run) and a `README.md` (what it is, credits), and add tests for the simulation where it can be tested without a screen (`node --test`).

### Licences and credits
- **Swords & Wizardry** monsters come from its open SRD under the **Open Game License 1.0a**: include the licence text and its Section 15 notice in the page (a credits screen), and use only Open Game Content.
- Weather by **Open-Meteo** (CC BY 4.0): credit it.
- The Clockscapes music code and samples: our own, and CC0 recordings from FreePats and VCSL; keep their credits.

## Appendix: the owner's notes
The raw notes and questionnaire answers this brief was written from. The sections above win if anything differs.

### Dungeon town (working name)

#### The picture
The screen is split in two: the **city** in the top half and the **dungeon** in the bottom half.

#### The ecosystems
- The city and the dungeon have different ecosystems.
- The **citizens want the gold**, the **monsters want the food**, so they clash.
- They know they need each other, so **neither wins in the end**. It is a balance, not a war.

#### Things to see
- Adventurers delving into the dungeon.
- Traps.
- Monsters farming mushrooms.
- A river that comes out of the dungeon, or flows into it.
- People crossing at the sides to trade with other cities.
- A town hall that shows the hour.

#### The real world
- The real time and the real weather of your city.

#### Playing
- Idle, with some possible interactions: you **steer** the events if you want.

#### Look and sound
- Small pixelated beings, 8x8 at most; bigger monsters at 16x16.
- Generates dungeon synth and medieval music. Cozy in general.

#### Later
- A sprite editor to make monsters, items and so on. Start simple first.


#### Design decisions (questionnaire, 2026-11-27)

##### Screen
- Works on any screen. Each device holds **one run**, and the world **adapts to the screen once**, when the run is founded (wide shows more town and dungeon sideways; tall shows more floors).

##### Place and time
- **Pick a city** (like Clockscapes): its real time and weather drive the town.
- **It catches up:** time passes while the page is closed. On return, the cycle has moved on and a short chronicle tells what happened.

##### The run and its fate
- At the start, **dice are thrown**: a random seed marks the town's fate.
- The world moves in **cycles**: boom, collapse, rebuild. They are driven by **greed, hunger, the seasons and rare events** (a plague, a flood, a hero, a dragon...).
- The city grows, but never into a kingdom. Sometimes **greed does more harm than the monsters**: the city falls into decadence, forgetting food for loot. Sometimes the **monsters get too greedy** and the town turns Diablo-like. Either way, the cycle repeats.
- **Ages pass:** the cycle goes on until it reaches a **point of no return**. Then the town is gone.
- At any point you can choose another city, but **the original city becomes unselectable** for that device. After some time, maybe, new life grows there, but you'll never know until the day you decide to check back on your town.

##### Tone
- **Bittersweet**, with gritty pixel texture. Delvers can fall and get a grave; monsters can perish; the cycle mourns and goes on.

##### Beings
- **Below:** taken from the **Swords & Wizardry** bestiary (its open SRD; check its licence, the Open Game License 1.0a, and include the notice it asks for). Each run picks **one of each role**: workers (goblin- or kobold-like), lurkers (undead), beasts (rats, bats, slimes, spiders...) and a guardian (the big 16x16 boss that sleeps on the hoard and wakes rarely). So every run has a different cast.
- **Above:** trades (blacksmith, baker, farmer, priest, innkeeper, each with a place), adventurers (some never return), traders (caravans from the sides, the link to other cities) and animals (cats, dogs, chickens, horses, birds).
- **The river** changes: its direction is decided by the seed or the season (into the dungeon, flooding it in storms; or out of it, a spring feeding the town).

##### Steering
- **Send groups:** a horn sends delvers down, a drum sends monsters up.
- **Nudge fate:** call rain, a festival, a feast, wake the guardian... **once every 30 minutes**. Intervening in the lives of beings **has consequences**: every nudge should ripple into the cycle in ways you can't fully foresee.
- **Follow someone:** tap a being and the camera **zooms in, centres and follows** them through town and dungeon. They get a generated **name and a life story** (born, first delve, wounds, loot). **Speech icons** show how they feel in each interaction. Notable lives are written in the **town's chronicle**, readable later, and the fallen get a **grave with their name** in the cemetery.
- Following inhabitants (monsters and villagers alike) means building a **simulation engine** whose reach and span of actions and reactions is similar to **Dwarf Fortress** (the owner's note was cut off at "dwar"; Dwarf Fortress assumed): every being has needs, moods, relationships and memories, and its own small story emerges from them.

##### Economy
- **Hidden:** no numbers. You read the balance from the scene: piles of gold, a full or empty granary, hungry goblins, a decadent town.

##### Music
It follows **which half the action is in** (a town tune or a dungeon drone), the **time of day** (medieval by day, dungeon synth at night), the **weather** (rain, storms, snow, with their sounds) and **the cycle** (boom, collapse and rebuild each have a mood).

##### Shared with Idle civilization
- The simulation engine (the backend) is shared with `civilization/`. The graphics are different, but the mantra is the same: **no HUD, art comes first, and text only when there is no other way to convey the information.**
