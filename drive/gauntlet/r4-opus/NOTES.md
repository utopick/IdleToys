# Drive, round four (r4-opus)

A night courier drives parcels around a real loop of Spanish cities (Madrid, Valencia, Barcelona, Zaragoza) on the Natural Earth road graph, in real time, under the real sun and weather, with a lo-fi radio.

## How to play
Leave it running. The car drives itself, passes slow traffic on its own, and the camera moves between the cockpit, a chase view behind the car and a side view. About two and a half minutes in it pulls over at a roadside café (or by the sea in the south), and the driver gets out and leans on the car with a coffee; sometimes a cat turns up.

Tap anywhere (or click) to start the radio. A tap also brings up the route card and six big buttons for six seconds, and then they fade away again. The arrows are the indicators: they ask for a lane change, and the wheel turns and the lamp ticks while it happens. The pace button steps through 90, 110 and 120 km/h, and then past the top speed it compresses time (x8, x60) so the trip gets shorter. The square button stops for a coffee or drives on, FM switches between the local station (a regional style from the Clockscapes generator) and the mixtape that follows the hour and weather, and the note mutes the sound. Keys work too: arrows, up for pace, space to stop, R for the radio and M to mute.

Four minutes in, and then every nine minutes, the road jams for half a minute and everyone crawls at about 35 km/h with brake lights on.

Test switches: `?hour=HH`, `?weather=rain|snow|fog|clear`, `?cam=cockpit|chase|side|stop`, and `?jam=1` to hold a jam.

## What was reused
The Clockscapes music generator (`<script id="lofi">`, copied in whole) and Clockscapes' `sunPos`. The roads are Natural Earth `ne_10m_roads` (public domain), baked by `tools/bake-roads.py` into `ROADS`; weather is Open-Meteo (CC BY 4.0), cached 30 minutes and optional. The art was made by three Opus helpers with the Node scripts in `tools/` (`make-cockpit.mjs`, `make-world.mjs`, `make-cars.mjs`), which write the sheets in `art/`.

## What is rough or left out
Curves and hills come from noise rather than the real road shape, and the route is only drawn as distances, towns and signs (no map). There is one car in the garage, the pet is the only easter egg, and deliveries just count up. The jam is only a slowdown (cars keep their spacing), and there are no roadworks or police yet. The skyline seam can show a small jump, and the chase view's skyline is a little heavy at night. There is no isometric camera, the mixtape has no style of its own beyond the plain lo-fi, and there is no docs/MAINTAINING.md or README.md yet.

## Next three things
1. Follow the real road's bends from the baked polyline (turns at junctions with the indicators) and add jams, roadworks and a police car.
2. A garage of two more cars with their own dashboards, and deliveries that unlock easter eggs (the cat in the passenger seat, a seafront viewpoint).
3. A synthwave row in the generator's `STYLES` for the mixtape, plus rain and wiper sounds.

Checked with the look tool at night, dusk, morning, midday rain, a stop and a jam, on a phone and a desktop size, with no console errors; after a tap the AudioContext was `running` with a song playing (checked once with a temporary log, since removed).

Made by Claude Opus 5.5 in 30 minutes (03:02 to 03:32).
