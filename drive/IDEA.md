# Drive: project brief

Everything needed to start this project is in this file: the design, the rules, the references, and the owner's original notes. The reference pictures are in `inspiration/`; `gauntlet/` holds earlier timed attempts (look, don't copy).

## The pitch
You're a messenger driving packages between real cities, on real roads, in real time, through real weather and light. A pixel-art 90s anime cockpit, a radio, the night. Mostly it drives itself: you steer with the indicators and the pedal, stop for a coffee, look at the sea. Like Euro Truck Simulator, made of synthwave.

## Pillars (never break these)
1. **Steer, don't control.** No real driving: indicators ask for a lane change or a turn, the pedal sets the pace, a button stops. The car does the rest.
2. **When idle, no HUD:** just music and driving. Information (speed, route, time and distance left) fades in when touched and fades out again.
3. **Real:** real routes, real distances, real time, the real light and weather where the car is.
4. **The cockpit is the star, at PSX level** (see *Art direction*): see `inspiration/01-cockpit-night.png` and `02-cockpit-dusk.png`. A rich, lit dashboard filling the lower third; the driver's hands in fingerless gloves on the wheel.
5. **One palette per moment:** night is night everywhere on screen (no bright green grass at midnight).

## Art direction: PSX-era detail
The target is the detail of **Psygnosis games on the PlayStation** (mid-90s): rich, rendered-looking pixel art, not flat retro shapes. For Drive, the reference pictures in `inspiration/` set the bar.
- **Many shades per material:** stone, wood, metal, skin and cloth each have highlights, mid-tones, shadows, texture and worn edges; dithering where it helps.
- **Light makes the mood:** coloured light sources (torches, windows, neon, the sun) tint what is near them, with soft glows, deep shadows and ambient light that follows the hour.
- **Depth:** several layers, with parallax or atmospheric fade, and foreground details framing the scene.
- **Nothing visibly repeats:** variants of every tile and prop, mixed and decorated, so a wall or a forest never reads as a stamp.
- **Ramped up considerably:** this toy needs the most detail of the three. The cockpit and everything through the windscreen (skyline, road, barriers, lamps, signs, cars, sky) should match the density of the reference pictures, pixel for pixel: every dial, switch, vent, stitch and reflection drawn, a city with thousands of lit windows, neon signs and layered depth. Cars and the driver are drawn with the same care.
- A higher internal resolution than the first rounds (around **640 x 360**, scaled up crisply) to carry the detail.

## The world
- **Roads:** Natural Earth's 10m roads, preprocessed into a compact graph baked into the page; routes found offline. The real route and distances; generated curves, hills and scenery.
- **Look:** neo 80s/90s in the cities (neon, city pop, pop-up headlights); the countryside follows the region (palms and sea in the south, pines and snow in the north), always in the same retro pixel style.
- **On the way:** stops (fuel, rest areas, a night café, viewpoints), traffic life (jams, roadworks, police, convoys, breakdowns), the real weather (rain on the windscreen, fog, snow, sunrise), real towns and road signs with real names.

## Time and speed
Real time: a long route takes hours. The car has a visible top speed; going "faster" past it only compresses time to make the trip shorter.

## The driver
- A **messenger**: deliveries between cities give each trip a reason, and they unlock more easter eggs.
- At a stop the driver gets out and leans against the car; you see the traffic, a beach, a field.
- A pet is an easter egg.
- **A garage** of a few original cars, each with its own cockpit.

## Cameras
When nobody is touching it, the camera changes: interior, chase, side, isometric, a fixed roadside camera that zooms out as the car passes (`inspiration/03` to `06`).

## Sound
The radio: local stations in the style of the region you're crossing (Clockscapes `LOFI` regional styles), or a synthwave / city pop mixtape that follows the time and weather; switched with the console's buttons. Rain, wipers, indicators and the engine underneath.

## A first version must have
- The cockpit at the quality of `inspiration/01-cockpit-night.png` and `02-cockpit-dusk.png`, by night and by day.
- One real route driven on the baked road graph, with real distances and city names on signs.
- Real light from the clock and position, and real weather (working without the network too).
- Indicators, pace, stop (with the driver outside) and the fading HUD.
- At least two cameras switching by themselves.
- The radio with both modes.
- Saved progress.

## Free to invent
The cars, the dashboards, the stops, the easter eggs, what the packages are, the scenery of each region, the camera moves, small moments on the road.

## Not wanted
Colours that ignore the time of day; shapes that don't read (hands as red squares); so many buttons that it becomes a control panel.

## Known bugs and lessons (rounds one and two)
Don't repeat these.
- **Silent on phones** (round two, dungeon and civilization): the sound was started on `pointerdown`, which a phone's touch doesn't count as a user gesture. Start it on `pointerup` or `click`.
- **Only night was ever seen** (round two, all): both rounds ran at night, so day, dusk and rain went untested. Support `?hour=HH` (and `?weather=rain|snow|clear` where weather matters) to force them, and look at day, dusk and night.
- **Built blind** (round one, all): nobody opened the page. Look at it, more than once.
- **Hints too faint or stuck** (round one): the first-tap hint was nearly invisible, or never went away.
- **Features nobody can find** (round two): things built but never seen in a judge's run. Make each one show up on its own while idle at least once in the first minutes.
- Round one: bright green grass under a night sky; the hands read as two red squares; eight buttons made it a control panel.
- Round two: the road graph was 28 cities typed from memory, not baked from Natural Earth; only the night scene was ever seen (day, dusk, rain and the driver outside are unchecked).

## Done means
It runs in one `index.html` (PWA, offline, with the road graph inside), with no console errors, and you could leave it driving on a TV all night.

## References

### Pictures (`inspiration/`)
Reference pictures for the **look**, collected by the owner on 2026-11-27. They are mood references only: never copy them, trace them or ship them in a build (one carries a stock-photo watermark). Our car, cockpit and characters are our own design.

#### The main view: the cockpit
- `01-cockpit-night.png`: **the target.** Night city in blues, violets and neon pinks, seen through the windscreen. A detailed dashboard: glowing orange instrument cluster, a centre console with a screen and a cassette deck, rear-view mirror, door panels, gear stick. The car's interior is dark, with only the instruments lit.
- `02-cockpit-dusk.png`: **the target.** The same view at dusk: orange sky, pink towers, an elevated highway with crash barriers and lamp posts, a car ahead. Orange displays on a purple dashboard.

What these two have that the first gauntlet entry lacked: a **rich, detailed dashboard** that fills the lower third; one colour family for the whole picture (no bright green at night); the road and the city fitting the time of day; neon reflections.

#### The other views (when the camera changes)
- `03-chase-sunset-palms.png`: chase view behind a red sports car, palm trees and street lamps in a row, a sunset with heavy purple clouds, the city on the horizon. Classic OutRun superscaler.
- `04-side-view-seafront.png`: side view of the car on a seafront road, palms, a sunset reflected on the water, the city behind. Good for the "stopped" scene or a side camera.
- `05-chase-highway-day.png`: a day motorway with an overhead gantry, traffic in the distance, guard rails, a teal car. Calm daytime palette.
- `06-chase-city-track.png`: a city road with grandstands and signs, a car ahead, big skyline, warm daylight. A busier, denser view.

### Influences
Road Avenger's cockpit view (inspiration only), OutRun's superscaler road, Euro Truck Simulator's real-time journeys, 90s anime and city pop, synthwave. Inspiration only: everything we make is original.

## Rules

### What it is made of
- **Code in one `index.html`:** HTML, CSS, JavaScript and the sound (Web Audio). No build step, no framework, no dependencies.
- **Graphics in separate files, in `art/`,** so they can be improved on their own without touching the code:
  - PNG sprite sheets and tilesets (`art/<name>.png`), each with a small JSON beside it (`art/<name>.json`) listing its frames: name, x, y, w, h, anchor, and animations (frames and speed).
  - `art/index.json` lists every sheet. The code loads that list at start and draws only from it. Nothing graphical is hard-coded in the script beyond effects (light, glow, rain, particles, fades, screen filters).
  - Replacing a PNG with a better one of the same layout needs **no code change**. A missing or broken sheet must not crash: draw a plain placeholder and log one warning.
  - How the art is made is free (drawn, painted, or generated by a script). If a script generates it, keep the script in `tools/` so it can be run again, and keep its output in `art/`.
  - Total art under about 5 MB.
- Beside them, what a **PWA** needs: `manifest.webmanifest`, `sw.js` (it caches `index.html` and every file listed in `art/index.json`) and `icons/`. It installs and runs offline after the first visit.
- **Network:** Allowed: real weather from `https://api.open-meteo.com` along the route (cache it; the toy must work fully without it). The road graph is **baked into the page**, never fetched. Nothing else.
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
- **Look at what you build.** Serve the folder (`python3 -m http.server 8090`, then `http://localhost:8090/`) and take screenshots (headless Chrome) at a phone size (390 x 844), a desktop (1920 x 1080) and after a few minutes of idling. Check the console has no errors. Also look at day, dusk and night with `?hour=`, and check after a tap that the sound really started (the `AudioContext` state is `running`). Every bug in the first round would have been caught by one look.
- Keep a `docs/MAINTAINING.md` (how it works inside, what to run) and a `README.md` (what it is, credits), and add tests for the simulation where it can be tested without a screen (`node --test`).

### Licences and credits
- Roads from **Natural Earth** (`ne_10m_roads`): confirm its terms of use (believed public domain) and credit it.
- Weather by **Open-Meteo** (CC BY 4.0): credit it.
- The Clockscapes music code and samples: our own, and CC0 recordings from FreePats and VCSL; keep their credits.

## Appendix: the owner's notes
The raw notes and questionnaire answers this brief was written from. The sections above win if anything differs.

### Drive (working name)

An experience like driving in Euro Truck Simulator: a pixel-art, 90s anime-style car travelling between real cities. Inspired by the cockpit view of games like Road Avenger (inspiration only: car, cockpit and characters are our own design). Superscaler-style road (OutRun), synthwave, CRT filter.

#### Playing (no real driving)
- Go faster or slower.
- Signal a lane change or a turn with the indicators; the car does it.
- Stop: your character gets out and leans against the car, and you see the traffic, a beach, or a field.
- Set a route between two cities and watch them drive it.

#### Cameras
When you are not in control, the camera changes: isometric, side view, interior, a fixed camera that zooms out.

#### The world
- Travels between cities using map data, with a road and scenery generator (decided: Natural Earth roads baked into the page, see Roads below).
- Real light and weather for the car's position.
- Traffic jams. Rain drops falling on the windscreen.

#### HUD
- Speed, route, time and distance remaining fade in and out.
- When it is idle there is no HUD: just music and driving.


#### Design decisions (questionnaire, 2026-11-27)

##### Roads
- **Real routes** between real cities, from **Natural Earth's 10m roads** (https://www.naturalearthdata.com/downloads/10m-cultural-vectors/roads/). Its download page says the "basic" roads are North America only, but the file itself (`ne_10m_roads`, checked 2026-11-27 from the natural-earth-vector repository) holds 56,600 road segments worldwide: Asia 25,505, Europe 9,849, North America 9,425, Africa 6,761, South America 4,204, Oceania 856. Fields include `type`, `name`, `expressway`, `toll`, `length_km`, `continent`. About 10,500 segments are named.
- It is a 1:10 million map: **major roads only, with coarse shapes**. So the route (which roads, which junctions, real distances) is real, and the curves, hills and scenery between are generated.
- Plan: preprocess it once (snap the segment ends into a graph, simplify, keep the needed fields, maybe one region at a time) and **bake it into the page**, then route offline (A*). No network for the roads. The raw file is large (its `.dbf` alone is about 42 MB), so the baked graph must be much smaller.
- Natural Earth data is generally in the public domain; confirm on its terms-of-use page before shipping.

##### Look
- **Neo 80s/90s in the cities** (neon, cassette decks, pop-up headlights, city pop).
- **The countryside follows the region**: palms and sea in the south, pines and snow in the north, always drawn in the same retro pixel style.

##### People
- **A driver**, seen at stops and in the side views. In first person you see **their hands on the wheel, in fingerless gloves**.
- **A pet is an easter egg**: a dog or cat that turns up now and then.
- **The driver is a messenger:** they deliver packages between cities. Deliveries give the trips a reason, and they **unlock more easter eggs** along the way.

##### Time and speed
- **Real time**, like Euro Truck: Madrid to Barcelona takes hours.
- You can go faster: the car has a top speed it visibly drives at, and pushing past it only serves to **make the trip shorter** (time compression), never to drive recklessly.

##### On the way
- **Stops:** fuel stations, rest areas, a café at night, a viewpoint.
- **Traffic life:** jams, roadworks, police, a convoy, a breakdown.
- **Weather:** the real weather along the route (rain, fog, snow, sunrise).
- **Places:** real towns and landmarks passing by, road signs with real names.

##### Radio
- **Both:** local stations that pick up the style of the region you drive through (from the Clockscapes regional styles), and a synthwave / city pop mixtape that follows the time of day and the weather. Switch between them with the console buttons.

##### Cars
- **A garage:** a few original cars to choose from, each with its own cockpit and dashboard.
