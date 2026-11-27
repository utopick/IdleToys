# Embers of Now (civilization, round four, opus)

An idle isometric civilization that rises on the overgrown ruins of a real city and grows from thatched huts to an age of steam or of crystals, and then to glass towers with gardens on their roofs.

## How to play
Leave it running. People walk between their homes and the well, farms appear with sheep and cows, roads wear in from dirt to cobbles, smoke climbs from chimneys and the camera drifts on its own between the whole region, a corner of the town and one person's street. When someone dies the town walks to the graveyard and a new stone appears. Late in the first age the well hints at the branch ahead: it smokes if the town leans to steam, or sparkles violet if it leans to the arcane. Things happen every minute or so: a fire, a storm, a festival with lanterns, wolves from the old forest, a fever, a wedding, a hard winter, and in the last age a strange black stone that hums.

You are a whisper, so you can only suggest. Tap a person to read their name, age and short life story, and whisper one idea to them (an inventor, a priest or a rebel). You get that once in their life, and they may shrug it off. If they listen, a small coloured spark floats over their head and the idea passes to the people they meet. When enough people carry it, the culture shifts: inventors speed up learning and lean the town toward steam, priests raise a great temple and lean it toward the arcane, and rebels take the square and throw a festival. If the last carrier dies first, the idea dies with them. Tap an empty place to suggest a road, a farm, a temple or a mill (or a bridge on water). That works once every 30 minutes, and a little wisp of light waits there while they talk it over; then they build it, or let it go.

The buttons in the top right (sound, chronicle, place) appear when you touch the screen and fade again. The place button starts a new world in another real city. Drag to look around, and use the mouse wheel or + and - to zoom.

Test switches: `?hour=HH`, `?weather=rain|snow|clear`, `?cam=region|town|street`, `?seed=N`, `?fast=1` (grows every second and lets you whisper to places without waiting), `?hints=1` (shows the chronicle lines while idle).

## Reused
The Clockscapes music generator (`<script id="lofi">`, copied in unchanged). Each era picks one of its regional styles by seed: Celtic, Galician, steppe or Andean for the Hearth age, country, tango or fado for steam, hijaz, Indian or Persian for the arcane branch, and techno or Japanese for the Bright age. The hour of the place sets its night mood and a storm brings its rain and thunder. Nothing else was reused. All the art is made by `tools/make-art.js` (run `node tools/make-art.js`), which writes the PNG sheets, their JSON and `art/index.json`.

## Rough or left out
The real places are baked as a few hints (a river's angle, which side the sea is on, the climate), not real terrain data. The clock is the place's solar time from its longitude, not a time zone, and there's no real weather or `sunPos` yet. There's no read-only window for a friend's seed and no point of no return. Tiles are drawn at their centres (x + 0.5), the same way the beings are placed, so people and animals stay off the river, and a sheep that still ends up in water is sent back to its farm. The street zoom (3) is only reached with the mouse wheel on a big screen, so the idle camera stays at zoom 1 or 2. Buildings take one tile each, so there are no big blocks, and the cutaway rooms of the modern era are missing. People wander instead of following real needs, and the simulation still lives inside `index.html` with no `node --test` tests.

## Next three
1. Real terrain and coastlines from Natural Earth for each place, plus Open-Meteo weather and the real sun.
2. Needs, memories and relationships for each person, so that following someone tells a real story (work, family, funerals at a graveyard).
3. Multi-tile districts per era (markets, stations with trains, cut-open apartment blocks) and a decline branch into ruin that can become the point of no return.

After a tap the page logs `sound: running` once to the console, so the look tool can confirm the music started.

Model: Claude Opus 5.5, built in 30 minutes (03:02 to 03:32).
