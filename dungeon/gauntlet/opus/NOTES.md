# Dungeon Town (Opus entry)

A small town on the grass and a dungeon under it, where delvers carry gold up and monsters carry food down, so neither side ever wins.

## How to play
The scene is a 480 x 270 pixel picture laid out for a 16:9 screen (judged at 1920 x 1080), scaled to fit any window with dark bars where the shape differs, so on a phone held upright it shows as a band across the middle.

Just leave it running. The town hall clock shows your real time, the sky follows the real hour (sun by day, moon and stars at night, lit windows), the citizens go home late at night and the monsters raid more in the dark. Traders come in from either side with a cart, pay gold at the market stall and leave food in the granary. Delvers go down the well, pass the spike trap (sometimes it throws them back empty handed), climb down the ladder and take a coin from the hoard by the sleeping guardian. Monsters climb up, take food from the granary and bring it back down, where it feeds the mushroom farm, and fed monsters dig more gold. When a delver and a raider meet they scuffle for a moment and then both carry on.

The first tap starts the music. After that, tapping the town sounds a horn and sends two delvers down, tapping the dungeon beats a drum and sends two monsters up, and tapping the town hall rings the bell once for each hour. The mute button in the top right corner shows for a few seconds after any tap, then the screen goes back to the bare scene.

## What I reused
The whole `<script id="lofi">` music generator from Clockscapes (`clockscapes/src/app.html`), copied in with one new row in `STYLES` called `dungeon` (slow aeolian, phrygian, dorian and harmonic minor modes, a bowed or fife lead, a drone and a zither strum). Songs follow one another without a break and turn darker at night. Everything else, the art and the little sound cues, is new and drawn in code.

## What is rough or left out
There is no real weather yet, and the sun is a simple curve from the clock hour rather than Clockscapes' `sunPos`. The four piles (city gold, city food, dungeon gold, mushrooms) are kept in `localStorage`, but the beings are not. The guardian only sleeps and blinks, and the river only falls into the dungeon. I only tested it with headless Chrome screenshots at 1920 x 1080 and 1280 x 900 and a ten-minute simulation of the economy in Node, not on a real phone or with the service worker over http, and the songs use the generator's default band rather than one made for dungeon synth.

## Next three things
1. Real weather from Open-Meteo and `sunPos` for a chosen city, with rain on the town and drips in the caves.
2. A slow day of events, such as a festival in the town, a guardian that wakes once a night, and a flood in the deep after heavy rain.
3. The sprite editor from IDEA.md, starting with recolouring the monsters and delvers.

## Model and time
Claude Opus 5.5, about 20 minutes (23:43 to 00:03, including the 5 extra minutes for the switch from a 390 x 844 phone layout to 16:9).
