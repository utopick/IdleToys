# Dungeon Town, round 4 (opus)

A town seen in cutaway on top of a dungeon of caves and rooms, with the gold-for-food loop running between them while you watch.

## How to play
Leave it running. The town builds up a floor at a time and the monsters dig down a cave at a time, and the ground line slides as one side outgrows the other. Goblins (or kobolds) climb the ladder on the right to steal sacks from the granary, and delvers climb down to take coins from the dragon's hoard; some of them never come back and get a grave on the hill at the left. The river on the left carries scraps and fish between the halves.

Every 40 to 70 seconds the idle camera leans in for 14 seconds on a raid, a delve or the waking guardian, so the tiny beings can be seen up close even on a big screen, and then pulls back. Beings have a contact shadow and a dark rim so they read against the busy rooms. Tap the little hill of graves at the left of the ground line to read the names of the fallen; the newest grave has a candle that glows at night. Tap a being to follow it (the camera zooms in and shows its name and story), and tap again to let it go. Tap anywhere else to open the menu: HORN sends delvers down, DRUM sends monsters up, FATE (once every 30 minutes) calls rain, a feast, a festival or wakes the guardian, CHRONICLE reads the town's history, MUTE, CITY picks another real city (the old one is lost for good), and ? shows the credits. The menu fades by itself. Keys: h horn, d drum, m mute, Esc stop following.

Test switches: `?hour=HH`, `?weather=rain|snow|clear|storm`, `?cam=town|dungeon`, `?fast=1`.

## What was left out or is rough
The beings' needs and moods are shallow (hunger and a mood icon, no relationships yet). The point of no return is simple: after the seventh hard age the city is lost on this device and a new town is founded in the next city, but nothing marks the ruin yet. The full OGL licence text is not in the credits yet, only its Section 15 notice. Town folk climb the outside ladder to reach upper floors instead of stairs inside. Light is a simple tint plus glows. No `node --test` tests yet.

## Next three things
1. Real needs, relationships and memories per being, with life stories in the chronicle.
2. Stairs and rooms that change look with the cycle (ruins, flooded caves, a decadent gilded town).
3. More art: a parallax backdrop, street props, more room variants, and night lights from each window.

## Reuse and credits
The music is the Clockscapes `LOFI` engine copied in whole (its existing `dungeon` and `celtic` style rows: dungeon synth at night, in the deep and in a collapse; a celtic tune by day). The art sheets (`art/rooms.png`, `art/beings.png`) were made by the earlier contestant's art helpers with the scripts in `tools/`. Monster names come from the Swords & Wizardry SRD (OGL 1.0a). Weather from Open-Meteo.

Model: Claude Opus 5.5. It took over at 03:10 from a contestant that was stopped by an error, kept its art, and wrote all the code and docs. It first handed in at 03:27, then the judge asked it to use the time left, so it polished until about 03:38 (idle camera, rims on the beings, the hill of graves). It looked at the entry with the look tool eight times (night, dusk, day, day with rain, the dungeon close up), with 0 console errors each time. At 03:30 it found that the music never started (the check used `window.LOFI`, but a top-level `const` is not a window property) and fixed it. The last look, run with that fix, stalled after the phone's 5-second shot (the desktop shots were taken), and there was no time to find out whether the page or the shared machine was to blame. Check the sound and a 5-minute idle on the phone first; `?debug=1` logs a line when a song starts.
