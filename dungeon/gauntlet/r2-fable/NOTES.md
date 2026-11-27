# Dungeon Town, round 2, fable

A town on top and a furnished dungeon below in one pixel picture, where the townsfolk want the hoard's gold and the goblins want the granary's food, so the balance keeps swinging and nobody wins.

## How to play
Leave it running. The sky, the stars, the moon and the town hall clock follow the device's real time, and at night the windows light up (fewer of them when the town has shrunk). You read the state from the scene: the sacks in the granary, the gold pile by the town hall, the mushroom beds on the first floor, and the hoard under the sleeping guardian.

Tap an empty spot and four buttons appear for a few seconds: the horn sends a delver down, the drum sends goblins up to raid the granary, the die nudges fate (rain, a feast or waking the guardian, once every 30 minutes, each with a cost), and the last one mutes the sound. The keys H, D, F and M do the same. Tap a being and the camera zooms in and follows them, with their name, role and latest memory; tap again to let go. Beings show speech icons (gold, bread, heart, skull) when something happens to them. Delvers who die get a grave in the cemetery; tap the cemetery to read the names. The first tap also starts the music. When you come back after a while, the world has moved on and a short chronicle tells you what happened.

## What was left out or is rough
The city picker and the real weather (Open-Meteo) are missing, so only the clock is real, and rain only comes from the fate nudge. The "point of no return" and the ages are not built. The beings have a name, a mood icon and one memory, not real needs or relationships. The world is rebuilt for the screen on every load instead of once at founding (the economy and graves are kept). The guardian is always the same shape with the seed's colour and name. The credits show only the Section 15 line of the Open Game License, not the full licence text. The chronicle and labels are in English and Spanish but were not proofread. The music was not listened to, only checked for errors: it uses two new style rows ("medieval" by day, "dungeon" at night or when you follow someone below), a low-pass filter and a drone for the deep.

## Reused
The Clockscapes music generator (`<script id="lofi">`), pasted whole, with two rows added to `STYLES`. Nothing else.

## The three next things
1. Pick a city, with its real sunlight (`sunPos`) and Open-Meteo weather driving rain, snow and the river.
2. Real lives: needs, friendships and memories that feed the chronicle, and a readable chronicle book.
3. The long arc: ages, decadence and the Diablo-like town drawn in the art itself (ruined houses, overgrown arches), up to the point of no return.

## Model and time
Fable 5.2 (claude-fable-5-2), about 14 minutes.
