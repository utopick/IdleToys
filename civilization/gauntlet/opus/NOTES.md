# Seedling (opus entry)

Seedling is an idle civilization that grows from a seed: an island rises out of the sea, a first village lands on its coast, and over the next minutes the people spread, cut roads, lay railways, burn, rebuild and sing.

## How to play
Leave it running. Every second is a year, so villages fill with houses and fields, send families out to found new towns joined by dirt roads (with carts on them), and once there are enough towns a railway links the biggest ones and a little train shuttles along it, smoking. The odds come on their own: fires, droughts that turn the fields yellow, storms with rain and thunder flashes, and golden ages that make a town grow fast. Day, dusk and night follow your device clock, and at night the windows light up.

You steer, you don't control. Tap the land to light a beacon, and the next settlers will look for a site near it. Tap a burning town to call the rain and put the fire out. Any tap starts the music and shows the chronicle for a few seconds (the people's name, the year, towns, souls, the last four events), with a sound switch and a New seed button; then it fades away and only the scene is left.

Each seed makes a different island, a different people and a different music: the seed picks one of the Clockscapes regional styles (Celtic, Galician, Japanese, Chinese, Indian, Persian, Hijaz, fado, country, or plain lo-fi) and the songs that follow come from it. The clock sets the mood (night means darker, slower songs), and storms, towns and trains feed the song's mood when the next song starts. A seed can be shared as `?seed=123`; the last one is kept in `localStorage`.

## Screen
The judge moved the target to a 16:9 desktop (1920 x 1080) during the build. The grid takes the window's shape when the page opens (320 x 180 cells at 16:9, so the island is wide), and after that the canvas scales with `object-fit: contain` over a sea-coloured background, so other window sizes and a phone in portrait still look right. Taps are mapped through that letterbox. Reload after a big resize to regrow the island in the new shape.

## Reused
The whole `<script id="lofi">` from `clockscapes/src/app.html`, pasted as it is (no new STYLES row). Nothing else; the terrain, people and drawing are new.

## Rough or left out
- It was never opened in a real browser during the build (headless Chrome was not allowed). The simulation, the music generator and a still picture of a grown island were checked in Node, so the live drawing (clouds, night, rain, fire) and the audio playback are untested and may need tuning.
- The day and night use only the local hour, not `sunPos` with a real place, and there is no real weather.
- The world is not saved, only the seed: reloading regrows the civilization from its first years (it is deterministic for the land, not for the history).
- Towns stop at 40, railways at 6, and there are no boats, harbours, wars or eras that change the look of buildings.

## Next three things
1. Eras that change the art: huts, then stone towns with towers, then brick cities with smokestacks and electric light, each with its own music style row in STYLES.
2. Boats and harbours between coastal towns, and bridges drawn as real spans.
3. Save the whole world state, and let it keep living while the page is closed (catch up the missed years on return).

Model: Claude Opus 5.5, about 7 minutes of build plus checks, well inside the window (15 minutes, extended to 20 for the screen change).
