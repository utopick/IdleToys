# Night Courier (drive, round 2, fable)

A messenger's car drives itself between real Iberian cities in real time, seen from a lit 90s cockpit, with the real light of the hour, a radio and nothing else on screen.

## How to play
Leave it alone and it drives, overtakes slower cars by itself, changes camera (cockpit, chase, side view), stops for a coffee every twenty-five minutes and, when the package arrives, picks up the next one for another city.

Tap anywhere and the sound starts and a small HUD fades in for six seconds, with the route, the package, the speed, and the distance and time left. The two arrows are the indicators: the car blinks and then changes lane, and indicating right when you are already in the right lane makes it pull in and stop. Minus and plus set the pace: 80 or 120 km/h on the dial, and past that the car stays at 120 and only time is compressed (4, 16 and 60 times) so the trip gets shorter. STOP parks the car and the driver leans on the door with a coffee while the traffic goes by, beside the sea if the nearest city is on the coast. The two buttons at the top switch the radio between the mixtape and the local station, and mute the sound. The keys are the arrow keys, space, R and M.

Adding `?alt=20` (the sun's height in degrees) or `?rain=1` to the address forces the light or the rain, which helps when looking at it at one in the morning.

## What was reused
From our own Clockscapes: the whole `<script id="lofi">` music generator, pasted in unchanged, and `sunPos()` (shortened). The mixtape uses its `techno` style at night and `soul` by day; the local station uses `flamenco`, `fado`, `galicia` or `celtic` depending on where the car is. Weather comes from Open-Meteo (CC BY 4.0) and is cached for an hour.

## What was left out or is rough
The road graph is not Natural Earth: there was no time to preprocess it, so it is 28 cities and 42 roads with distances typed from memory, and the routing (Dijkstra) is real but the numbers are approximate. This is the first thing to replace.

Without the network the weather is a guess that stays the same for the day and the place. The day and dusk palettes exist but were only checked through `?alt=`, because the build happened at night. The letters on the gantry signs are canvas text at a low resolution and are fuzzy. There is one car and one cockpit (no garage), no isometric or roadside camera, no jams, roadworks or police, and no rain or wiper sound. The clock does not advance the trip while the page is closed. The Clockscapes styles were not tuned towards synthwave or city pop.

## The three next things
1. Bake the real Natural Earth graph (one region first) and take the curves and the town names on the signs from it.
2. A synthwave and a city pop row in `STYLES`, with rain, wipers and tyre noise under the radio.
3. The stops as real places (a fuel station, a night café, a viewpoint), with a drawn pixel font for the signs and a second car for the garage.

## Model and time
Fable 5.2 (claude-fable-5-2), about 14 minutes.
