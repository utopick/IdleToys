# Idle civilization: project brief

Everything needed to start this project is in this file: the design, the rules, the references, and the owner's original notes. The reference pictures are in `inspiration/`; `gauntlet/` holds earlier timed attempts (look, don't copy).

## The pitch
On a real place on Earth, today's city fell long ago. A new people rises on its ruins and grows from a fantasy age towards the future, along a path of its own. You watch them live, build roads and trains, face the odds, and fall and rise. You are only a whisper: you inspire, they decide.

## Pillars (never break these)
1. **Steer, don't control.** The player is a whisper. Ideas may be ignored.
2. **No HUD, art first.** Text only when nothing else can say it.
3. **Idle first.** Alive and changing with nobody touching it.
4. **Each seed is different:** a different people, path, look and music.
5. **Gritty, detailed isometric pixel art,** close enough to see people, animals and daily life (ActRaiser's growing towns, but closer and grittier).

## The world
- **A real place**, picked by the player: its real terrain, climate and clock.
- **Starts from the ruins of now:** traces of today's city in the land.
- **Branching eras:** each seed takes its own path (magic-punk, steampunk, solarpunk, decline into ruin...), never one fixed tech tree.
- **One living world per device:** fated by its seed, it catches up while closed, ages pass, and it can reach a point of no return. A friend's seed can be watched in a read-only window.
- **The odds:** nature (floods, droughts, fires, storms, quakes, winters), each other (rivals, unrest, war, trade), themselves (pollution, greed, plague, lost knowledge) and the unknown (monsters early, strange signals late).

## Life
Wildlife that retreats or adapts, livestock and pets that change with the era, daily life (markets, weddings, funerals, festivals, commutes), and individuals you can follow, with a name and a life story.

## Steering: the whisper
- **To a place,** once every 30 minutes: suggest a road, a bridge, a farm, a temple. They may listen or not.
- **To a person,** any time, but **once in their life**: an inventor, a priest, a rebel. The idea spreads or dies, and can change the culture.

## Camera
Zoom levels from the whole region down to one street. When idle, it drifts between them on its own.

## Sound
Generative (the Clockscapes `LOFI` engine). It changes per era (folk and choirs, brass, synths), per culture (each seed's own scales and instruments) and per mood (peace, war, plague, golden age).

## Shared with Dungeon Town
The simulation engine (beings with needs, moods, relationships, memories, and the chronicle) is meant to be shared. Keep it separate from the drawing code.

## A first version must have
- A real place picked by the player, with the ruins of now visible at the start.
- At least two eras, with a visible change of buildings, life and music, and the hint of a branch.
- Close-up life: people, animals, roads being built, something always happening on screen.
- Both whispers, with their limits, and visible consequences.
- The idle camera drifting between at least two zoom levels.
- Saved world, catch-up on return.

## Free to invent
The cultures, the eras' looks, what the branches are, how the ruins of now show, the events, the chronicle, small surprises.

## Not wanted (seen in the first round)
A world seen from so far away that nothing lives in it; soft see-through shapes that fight the pixel art; a first minute where nothing happens; a hint stuck on screen.

## Done means
It runs in one `index.html` (PWA, offline after the first visit), with no console errors, and every few minutes something new has happened.

## References

### Pictures (`inspiration/`)
Reference pictures for the **look**, collected by the owner on 2026-11-27. They are mood references only: never copy them, trace them or ship them in a build. All art is our own.

#### The style wanted
A city like **ActRaiser's** town-building (a settlement seen from above, growing as you watch), but in a more **gritty, detailed isometric** pixel style. Over time it goes **from fantasy to the future**: villages, then towns, then modern and futuristic cities. With **animals and things happening** everywhere: people walking, carts, traffic, farms, smoke, water.

The first gauntlet entry (an island seen from far above, with soft round clouds) was too distant and empty: these show the closeness and the busy life wanted.

- `01-village-top-down.png`: a medieval village from above: thatched houses around a market square with stalls and a well, a church, a river with a waterwheel and a bridge, fields, sheep, a forge, forest all around. **The fantasy era, and the density of life wanted.**
- `02-isometric-bridge-autumn.png`: an isometric scene: a wooden bridge over a waterfall, autumn trees, guards and robed figures. **The isometric angle and the painterly, gritty detail.**
- `03-isometric-city-cutaway.png`: a modern isometric city: busy crossroads, cars, crowds, traffic lights, and buildings cut open to show the rooms inside. **The modern era, and the "see them living" idea.**

### Influences
ActRaiser (a town growing as you watch, seen from above), isometric city builders, Dwarf Fortress (lives with needs and memories), the Clockscapes regional music. Inspiration only: everything we make is original.

## Rules

### What it is made of
- **One `index.html`** holds everything: HTML, CSS, JavaScript, the pixel art (drawn in code or stored as data in the file) and the sound (Web Audio). No build step, no framework, no dependencies.
- Beside it, only what a **PWA** needs: `manifest.webmanifest`, `sw.js` (offline cache) and `icons/`. It installs and runs offline after the first visit.
- **Network:** Allowed: real weather from `https://api.open-meteo.com` for the picked place (cache it; the toy must work fully without it). Terrain and coastlines must be baked into the page (for example from Natural Earth), never fetched. Nothing else.
- **Only free and open fonts and code** (SIL OFL, MIT, LGPL, CC0...), credited in the page. No web fonts loaded from outside: embed them or draw the letters.
- **Original art only.** The pictures in `inspiration/` and the games named below are mood references: never copy, trace or ship them, and no characters, logos or scenes from existing works.

### What you may reuse (copy in, adapt, never link)
Our own code in `TP/` (read-only: never change the originals; say in the docs what you reused):
- **The Clockscapes music generator:** `clockscapes/src/app.html`, `<script id="lofi">` (about 130 KB, stands alone). `LOFI.song(seed, mood)` writes a song from a number; `new LOFI.Player(ctx, destination, sheet, start, fadeIn, nf)` plays it (`schedule(until)`, `fadeOut`, `dispose`). Add rows to its `STYLES` for this project's styles. Read its header comment first; leave out `lofi-wasm`. `<script id="lofi-samples">` (CC0 recordings) is optional.
- **Clockscapes' world code** (same file): `sunPos(ms, lat, lon)` for real sunlight, the Open-Meteo fetch and cache, the screen filters (CRT, VHS...), rain.
- Find the part you need with `grep`; don't read whole files.

### How it behaves
- **Any screen:** it reads well on a phone, a desktop and a TV. Touch first: big targets, no hover, no right click. Keys and a mouse also work.
- **No HUD, art first:** text only when nothing else can say it, and never while idle.
- **Idle first, steer not control.**
- Sound starts on the first tap (browsers block autoplay) and can be muted; the choice is remembered. Start or resume the `AudioContext` on `pointerup` or `click`, **never on `pointerdown`**: on phones a touch's pointerdown doesn't count as a user gesture, so the sound stays silent (found in round two).
- **Saved data must keep loading** in every later version: version the save, fill in what old saves lack, never renumber or rename what is stored. Storage keys start with this project's name. Wrap storage in try/catch.
- Anything loaded or fetched is untrusted: check it, and never put text into `innerHTML` unescaped.
- Respect `prefers-reduced-motion` for flashes and shakes.
- Any text the player sees is in **English and Spanish**.

### Working on it
- The owner's rules apply: commit only as `utopick <310144039+utopick@users.noreply.github.com>` (`git -c user.name=utopick -c user.email=310144039+utopick@users.noreply.github.com commit --author="utopick <310144039+utopick@users.noreply.github.com>"`), never the owner's real name or any other account; a `Co-Authored-By: Claude` trailer is fine. **Ask before anything outward-facing** (pushing, tags, releases, publishing). No temp files in the project; scratch work goes elsewhere. Use they/them for people unless told otherwise.
- **Look at what you build.** Serve the folder (`python3 -m http.server 8090`, then `http://localhost:8090/`) and take screenshots (headless Chrome) at a phone size (390 x 844), a desktop (1920 x 1080) and after a few minutes of idling. Check the console has no errors. Every bug in the first round would have been caught by one look.
- Keep a `docs/MAINTAINING.md` (how it works inside, what to run) and a `README.md` (what it is, credits), and add tests for the simulation where it can be tested without a screen (`node --test`).

### Licences and credits
- Weather by **Open-Meteo** (CC BY 4.0): credit it.
- Any map data (Natural Earth, GeoNames...): check and follow its licence, and credit it.
- The Clockscapes music code and samples: our own, and CC0 recordings from FreePats and VCSL; keep their credits.

## Appendix: the owner's notes
The raw notes and questionnaire answers this brief was written from. The sections above win if anything differs.

### Idle civilization (working name)

#### The idea
A city / civilization simulator, but idle.

- They grow, they face the odds, and you watch them live: building roads, trains and so on.
- **Each seed produces a different result and a different music.**
- Same principle as the others: **you steer, not control.**


#### Design decisions (questionnaire, 2026-11-27)

##### The world
- A **real place on Earth**, picked by the player: its real terrain, climate and clock.
- It starts from the **ruins of now**: today's city fell long ago, and a new people rises on its ruins, going from fantasy to the future.
- **Branching eras:** each seed takes its own path (magic-punk, steampunk, solarpunk, ruin...), never one fixed tech tree.

##### The run
- **One living world per device**, like Dungeon Town: fated by its seed, it catches up while closed, ages pass, and it can reach a point of no return.
- **Seeds can also be shared:** a friend's seed can be viewed in a read-only window, to compare how the same start grew elsewhere.

##### Camera
- **Zoom levels:** from the whole region down to a single street. When idle, the camera drifts between them on its own.
- Gritty, detailed isometric pixel art (see `inspiration/`), in the spirit of ActRaiser's growing towns.

##### You are a whisper
You inspire, they decide.
- **Whisper to a place**, once every 30 minutes: tap a spot and suggest a road, a bridge, a farm, a temple... They may listen or not.
- **Whisper to a person**, at any time, but **only once in their life**: an inventor, a priest, a rebel. Their idea spreads or dies, and it can change the culture.

##### The odds
Nature (floods, droughts, fires, storms, earthquakes, harsh winters), each other (rival towns, unrest, wars, trade disputes), themselves (pollution, greed, plagues, forgetting old knowledge) and the unknown (monsters in the fantasy age, strange signals in the future).

##### Life
- **Wildlife** (herds, birds, fish, wolves) that retreats or adapts as the cities grow.
- **Livestock and pets** (farms, horses, dogs, cats) that change with the era.
- **Daily life:** markets, weddings, funerals, games, festivals, commutes.
- **Individuals:** follow someone, as in Dungeon Town, with a name and a life story.

##### Music
It changes **per era** (folk and choirs in the fantasy age, brass for industry, synths for the future), **per culture** (each seed's people have their own scales and instruments) and **per mood** (peace, war, plague, a golden age).

##### Shared with Dungeon Town
- **The simulation engine (the backend) is shared:** beings with needs, moods, relationships and memories, and the chronicle.
- The graphics are different, but the two share the same mantra: **no HUD, art comes first, and text only when there is no other way to convey the information.**
