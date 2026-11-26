# Night Drive (opus)

A pixel-art car that drives itself between real European cities on an endless OutRun-style road, at the real time of day, with lo-fi music made live.

## How to play
Leave it running and it drives. The driver keeps their distance, signals and overtakes slow cars on their own, and every 45 seconds with nobody touching it the camera moves between the cockpit, a chase view behind the car and a higher chase view.

Tap anywhere to start the engine and the music (browsers block sound until a tap). A tap also shows the HUD and the buttons for six seconds, and then they fade out again:

- SIGNAL left or right: the driver changes lane when it is safe, with the ticking indicator.
- SLOWER and FASTER set the cruising speed (50 to 160 km/h). The car still slows down for traffic.
- STOP pulls over to the right. When the car has stopped, the scene turns into a side view where the driver leans against the car with a can in their hand, by the sea or a field (it depends on the leg), and the traffic goes by. DRIVE gets back on the road.
- ROUTE skips to the next leg of the trip, and CAMERA changes the view by hand.
- The music button turns the music on or off, and the choice is saved.

The trip is a loop of real cities with real road distances (Lisboa, Madrid, Valencia, Barcelona, Marseille, Nice, Genova, Milano, Lyon, Bordeaux, San Sebastián). The kilometres go by at the car's real speed, so a leg takes hours, and the progress is saved in localStorage (`drive.opus.v1`). Each city's skyline rises over the hills for the first and last 8 km of a leg, with lit windows at night, and the green road signs count down the kilometres.

The sky follows the device clock: night with stars, dawn, day, a striped synthwave sun at dusk, and a moon. About one hour in four is rainy (chosen from the date and hour, with no network). In the rain the road is darker, drops stick to the windscreen and blow across it, and a wiper sweeps them away now and then. At night the headlights light up the road and the tail lights glow.

## What was reused
I copied the whole Clockscapes `<script id="lofi">` music generator in unchanged (`LOFI.song` and `LOFI.Player`). Its mood follows the clock (night), the rain and a little wind and traffic, and each song's seed comes from the leg's destination, the date and the hour. Every other song uses the generator's own `techno` style (pads, a sequencer riff and four on the floor) as the synthwave side of the drive, and the songs in between are plain lo-fi. Nothing else was copied in. The sky, the road and the CRT overlay (CSS scanlines and a vignette) were written for this entry.

## What was left out or is rough
- I could not open it in a browser during the build (the screenshot tools were blocked or did not answer). I checked the script with `node --check` and ran its drawing and driving code against a stub canvas with no errors, but nobody has looked at it on a real screen yet, so the sizes and colours may need tuning.
- The layout was moved to 16:9 landscape late in the build (320 x 180 art pixels, stretched to fill the window). Portrait windows still work, but they were not tuned.
- There is no real weather or sunlight yet (Open-Meteo and `sunPos`), and the light comes from a table of hours.
- The music has no synthwave row of its own in `STYLES` yet, because it borrows `techno`. The Web Audio player was not heard during the build.
- The traffic is simple: no real jams yet, only the car slowing down behind slower cars.
- The isometric camera and the fixed camera that zooms out were not built.

## The next three things I would build
1. A real synthwave row in LOFI's `STYLES` (minor keys, an arpeggiated bass, gated pads) and real weather and sunlight from Open-Meteo and `sunPos` for the car's position along the leg.
2. Traffic jams and towns: stretches where the cars bunch up and crawl, plus toll booths and city entrances at each end of a leg.
3. More cameras (isometric, a roadside camera that zooms out as the car passes), and a picker for the trip's cities.

Model: Claude Opus 5.5 (`opus`). It took about 8 minutes of the 20 allowed (23:43 to 23:51). The judge gave 5 extra minutes for the switch to 16:9, and I stopped early because there was no way to look at the page and check further changes.
