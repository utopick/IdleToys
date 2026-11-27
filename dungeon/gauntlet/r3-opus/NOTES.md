# Dungeon Town (gauntlet r3, opus)

A medieval street on top and five themed dungeon floors beneath it, in one cut-away picture, where the town trades its food and the deep trades its gold and neither side ever wins.

## How to play and steer

Leave it running. The camera drifts slowly from the street down to the hoard and back, while townsfolk wander, goblins (or kobolds) farm the glowing mushrooms, skeletons stir in the crypts at night, bats and beasts roam, and the guardian sleeps on the gold. Delvers go down the ladders on their own and come back with coins, or don't, and the fallen get a named grave beside the chapel. At night hungry monsters climb up and carry sacks of grain down from the granary.

Tap anywhere to start the music and show the buttons, which hide again after a few seconds. Tap a being to follow it: the camera zooms in, its name and place appear at the top, and a speech icon shows how it feels. Tap again on empty ground to let go.

- HORN sends three delvers down for gold (key `h`).
- DRUM sends three monsters up for food (key `d`).
- FATE opens a nudge once every 30 minutes: rain, a festival, a feast, or waking the guardian.
- The city list picks whose real clock and weather (Open-Meteo, cached, optional) drive the town.
- BOOK opens the chronicle, and MUSIC mutes or unmutes.

The state of the world is read from the scene, not numbers: the granary is full, half or empty, coins pile up at the market stall, the hoard grows or shrinks, the mushroom field thins when the monsters go hungry, barrels fill the cellar, and houses turn to ruins and windows go dark in hard times. A boom starts a new age and a collapse (hunger, or decadence when the town hoards gold and stops farming) is written into the chronicle. If the town is starving and broke for a long while it is lost, and that city can never be picked again on this device. While the page is closed the world catches up (up to three days) and a short chronicle greets you on return.

For testing: `?hour=HH`, `?weather=rain|snow|clear` and `?fast=N` (simulation speed).

## Reused

The Clockscapes music generator (`<script id="lofi">` from `clockscapes/src/app.html`), copied in whole with one new style row, `medieval` (dorian and mixolydian, reed or flute over a drone, a plucked strum, a frame drum in 6/8). By day in the street it plays `medieval`; at night or when the camera is in the deep it plays the existing `dungeon` style (slow minor pad, drone, a far-away tread), crossfading when the focus changes. The art sheets (`art/town.png`, `art/dungeon.png`, `art/beings.png`) were drawn by the earlier contestant's art helpers with the scripts in `tools/`.

The monsters come from the Swords & Wizardry open bestiary, used under the Open Game License 1.0a (Copyright 2000, Wizards of the Coast, Inc.; Swords & Wizardry Core Rules, Copyright 2008, Matthew J. Finch). Only the creature types (goblin, kobold, skeleton, ghoul, giant rat, giant spider, slime, dragon, troll) are used.

## Rough or left out

The beings have needs and a mood but no real relationships or memories yet, and the catch-up only runs the economy, not the beings. Levels don't change shape with the cycles (no flooding, digging or collapse), there are no caravans at the sides, and the river is one floor rather than a line linking the halves. The sky follows the hour, not the real sun position, and there is no Spanish text.

## Next three things

1. Levels that change with the cycle: the river floor floods in rain, the cellar collapses in a fall, the fungus cave grows in a boom.
2. Memories and relationships per being, so following someone tells a small story (a friend lost below, a grudge against a goblin).
3. Traders crossing at the sides, and the gold visibly climbing the shafts in carts.

## Who and how long

Claude Opus 5.5, about 26 minutes for this contestant (02:11 to 02:37), on top of the art the stopped earlier contestant left behind.
