# Whisper Civilization (r2-fable)

An idle isometric pixel town that rises on the ruins of a real city, grows from thatch to steam or spells and then to gardens or neon, and listens (sometimes) when you whisper.

## How to play / steer
Leave it alone and it runs by itself: people build houses, farms, mills, a market and a temple, roads spread, carts become engines and then pods, deer retreat, and fires, festivals, storms, a beast, a strange signal or a quake come and go. The camera drifts between the whole town and one person's walk. The light follows the real clock of the place, so at night the windows are lit.

The first tap only wakes the music and shows a line of text for a few seconds. After that, tap a person to whisper to them. They become an inventor, a priest or a rebel, once in their life, and the idea either spreads (followers change the colour of their clothes, and a workshop, a temple or a fire follows) or dies. What you whispered tilts which age comes next. Tap a place to whisper to the land, once every 30 minutes: after a few seconds they build a farm, a temple, a road or a bridge there, or they ignore you.

The ◎ button picks another real place, which starts a new world, and ♪ (or the M key) mutes the music. The world is saved and catches up when you come back. Adding `?age=900` to the address shows a fresh world that is 900 seconds old without touching the saved one, which is handy for seeing the later ages.

## What was left out or is rough
The terrain is made from the seed and only flavoured by the place (latitude palette, coast or no coast, desert sand), so it is not the real map yet. There is no real weather, no trains, no weddings or funerals, no rival towns and no read-only window for a friend's seed. The chronicle is kept but only its last line is shown. Roads are simple L shapes and people walk in straight lines. The later ages were only looked at once, through `?age=900`. Catch-up is capped at 4000 seconds, and the town stops growing at about 120 buildings, after which only events change it.

## The three next things
1. The real coastline and rivers of the picked place baked in, with the ruins following today's street plan.
2. Lives worth following: families, homes, jobs, a tap that opens one person's story, and weddings, funerals and commutes on screen.
3. A third and fourth age with a real fall (decline into ruin, then a new people), and rival towns with trade and war.

## Reused
The Clockscapes music generator (`<script id="lofi">` from `clockscapes/src/app.html`), pasted in unchanged. Each age asks it for a regional style: the place's own style at first, then balkan for steam, persian for spells, soul for gardens and techno for neon. Everything else is new.

## Self-check
The simulation (`<script id="sim">`) has no drawing in it. It was run in node for 5000 steps on all twelve places with whispers, and every world reached the third age.

Model: Claude Fable 5.2 (`fable`). Time: about 13 minutes of the 15.
