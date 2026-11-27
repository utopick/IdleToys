# How Embers of Now works

Everything lives in `index.html`, in sections marked `ART`, `WORLD`, `SIM`, `VIEW`, `SOUND`, `UI` and `SAVE`. The SIM section draws nothing, so it can later move into an engine shared with Dungeon Town.

## Growth of a settlement
```mermaid
flowchart LR
  tick[step every frame] --> acc{growAcc > every?}
  acc -- yes --> grow
  grow --> know[know += people x 0.25 + culture.inventor x 0.5]
  grow --> pick{r}
  pick -- "< 0.3 and era > 0" --> rebuild[an older house is rebuilt in the new style]
  pick -- "< 0.62" --> house[build a house, road to the plaza]
  pick -- "< 0.82" --> farm[3x3 crops, hay, 3 sheep or cows]
  pick -- else --> stall[market stall, lamp or solar panel]
  grow --> born{people < 6 + buildings x 2.2} -- yes --> baby[a new person]
```
`every` is 4 s while there are under 8 buildings and 9 s after that (1 s with `?fast=1`). `findSpot` looks at a radius of 1.5 + sqrt(buildings) x 1.2 + up to 2 tiles around the plaza, so the town spreads in rings. `road()` walks a staggered path to the plaza and each pass wears the road (`road` 1 is dirt, 2 and above are cobbles). A road may cross water as a bridge, but only 5 bridges are allowed, so the river is never paved over.

Worked example: at minute one there are 9 buildings. A grow roll of r = 0.7 makes a farm at (25, 19), so nine tiles turn to wheat, a haystack lands at (27, 19) and three sheep get that farm as their home.

## Eras and branches
```mermaid
stateDiagram-v2
  Hearth --> Steam: buildings >= 12 and know > 40, lean >= 0
  Hearth --> Arcane: buildings >= 12 and know > 40, lean < 0
  Steam --> Bright: buildings >= 30 and know > 260
  Arcane --> Bright: buildings >= 30 and know > 260
```
`lean = culture.inventor - culture.priest + (hash(seed) - 0.5) x 3`, so the seed sets the fate but whispers can tip it (`leanNow()`). Once `know > 18` in the Hearth age the well shows the lean, with smoke puffs for steam and violet sparks for the arcane. Each era has its own building kinds (`KINDS`), vehicles (carts, cars, gliders), road surface and music style.

## Whisper to a place
```mermaid
sequenceDiagram
  Player->>UI: tap empty land
  UI->>SIM: pending {kind, ok = random < 0.65, t = 12..22 s}
  SIM-->>View: a wisp of light waits on the tile
  SIM->>SIM: t runs out
  alt ok
    SIM->>World: build it (road, farm, temple, mill, bridge)
  else
    SIM->>Chronicle: "they talked about it and let it go"
  end
```
It's allowed once every `WHISPER_GAP` = 1800 s of world time (`whisperAt`).

## Whisper to a person, and how an idea spreads
```mermaid
stateDiagram-v2
  [*] --> Unheard
  Unheard --> Carrier: whisper, 70% listen
  Unheard --> Heard: whisper, 30% shrug
  Carrier --> Spread: meets someone (distance < 1), chance 0.25 per second
  Spread --> CultureShift: culture[idea] >= 1.4
  Carrier --> Dead: the last carrier dies, so the idea dies
```
A whisper that's heard adds 0.3 to `culture[idea]` and each new carrier adds 0.2, so about six carriers shift the culture once (`cultureShift`). Example: Wren becomes an inventor and meets Bel and Sol at the well, which takes the culture to 0.7. Three more meetings bring it to 1.3, a fourth to 1.5, and then know goes up by 60, which brings the next era closer and leans the town to steam.

## The odds
```mermaid
flowchart LR
  timer[nextEvent: 50..110 s] --> pick[random of fire, storm, festival, wolves, plague, wedding, winter, signal]
  pick --> fire[a house burns 30 s, then it stands as a ruin]
  pick --> storm[70 s of rain, darker light, thunder in the music]
  pick --> wolves[wolves come to the plaza, in the Hearth age only]
  pick --> plague[most people stay home, the music turns Persian]
  pick --> signal[a black monolith, in the Bright age only]
```
The first event comes after 25 s.

## A being's life
People age one year every 20 s and die at a `life` of 55 to 85, which adds a chronicle line (and the idea dies if they were its last carrier). A funeral follows: the first death picks a graveyard spot (`W.yard`), each death sets a stone (`grave0` or `grave1`) in its 3 x 3 tiles, and up to 10 people walk there. They walk to a random building's door 60% of the time, otherwise around the plaza, or to the square during a festival or wedding. Animals graze around their farm and wolves keep to the forest, leaving the map in the Bright age.

## Catch-up on return
`load()` reads `civilization.r4opus.v1` (version 1) and runs `step(4 s)` up to min(away / 6, 900) times without walking anyone (capped at 6 hours away), then writes "While you were away, N new roofs rose."
