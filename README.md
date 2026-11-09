# 3dmap-wartime-visual3dvideo

A cartoon-style 3D battle film made in the browser with Three.js. It uses the look of animated history explainers: chibi soldiers with big heads, cel shading with ink outlines, rain, mud, patchwork fields, a windmill, and thousands of soldiers and arrows.

| | |
|---|---|
| ![](docs/01-bowyer.jpg) | ![](docs/02-armies.jpg) |
| ![](docs/03-knights.jpg) | ![](docs/04-stakes.jpg) |
| ![](docs/05-plan.jpg) | ![](docs/06-volley.jpg) |

## Watch it

The rendered film is [`video/longbow-battle.mp4`](video/longbow-battle.mp4): 71 seconds, 1280×720, 24 fps, with captions.

## Film 2: Ambush in the Lushai Hills (90 s)

`lushai.html` is the second film. Mizo (Lushai) warriors ambush a British column on a jungle hillside path, then carry the heads back to the sahlam at the village gate. It draws on real ambushes of 1888 to 1890, such as Lt. Stewart's survey party in 1888 and Capt. Browne's party at Changsil in 1890. The column is shown as Redcoats in pith helmets for the look of the film. Historically, most troops in these expeditions were Gurkha and Indian sepoy units under British officers.

The rendered film is [`video/lushai-ambush.mp4`](video/lushai-ambush.mp4). With the dev server running, the interactive version is at `/lushai.html`.

Its code is in `src/lushai/`:

| File | What it does |
|---|---|
| `terrain.js` | The height field: hillside path, ravine, ridges and the hilltop village |
| `world.js` | Bamboo, jungle, panji spikes, river, mist, stilt houses, the sahlam, bonfire, and the lighting moods |
| `rig.js` | Merged per-bone characters: Redcoats, an officer, Mizo braves, veterans, a chief and elders, plus trophy heads |
| `moves.js` | Poses: march, aim, fire, reload, crouch, charge, strike, bayonet, fall, flee, cheer, dance, the raised dao and the chop, and carrying |
| `fx.js` | Musket smoke, muzzle flashes, blood bursts and splats |
| `script.js` | The choreography (keyframed tracks), the effect events and the 11 shots |

## Film 3: Rambuai, the Convoy (2 min)

`mnf.html` is the third film. It is set during the Mizo insurgency (1966–1986), and it moves from history into a convoy ambush.

1. The 1959 Mautam famine.
2. The MNF founded in 1961.
3. Operation Jericho, 1 March 1966.
4. The IAF air strikes on Aizawl, March 1966.
5. An MNA ambush of an Indian Army convoy: a lead jeep and Shaktiman trucks, with jawans in olive green and Mk II helmets carrying SLR, .303 and Bren guns.
6. Village grouping, 1967–69.
7. The Mizo Peace Accord, 30 June 1986.

The ambush is a composite inspired by MNA road ambushes, not a reconstruction of one particular attack.

The rendered film is [`video/rambuai-convoy.mp4`](video/rambuai-convoy.mp4). Its code is in `src/mnf/`:
- `vehicles.js`: the truck, jeep and jet, with burnt versions and fire
- `rig2.js`: jawans, MNA fighters and civilians
- `fx2.js`: rifle shots, bullet dust, sparks, explosions and smoke columns
- `script.js`: the convoy, the ambush, the gunfire derived from each character's actions, and the shots

## Film 5: Operation Jericho (about 2 min)

`jericho.html` covers the MNF uprising in Aizawl, from 28 February to 7 March 1966:
- the MNA night assault, the treasury and telephone exchange, and the siege of the 1st Assam Rifles at Lammual
- the MNF flag raised on 4 March
- the IAF strikes of 5 March and the MNA withdrawal
- an emotional death scene

It closes with non-partisan remembrance cards. Characters are fictional, and events are dramatised from historical accounts.

Supporting files:
- `docs/lammual-plan.png` is the reconstructed site plan. No official plan is public.
- `src/jericho/layout.js` is the shared layout, and `set.js` is the 3D set.
- `scripts/make-sfx-jericho.py` builds the sound design. There is no music.

The MNF flag is drawn from the reference in `docs/mnf-flag-reference.png`: a blue field with a red disc and a white cross.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Controls

- **Space**: play or pause. **← / →**: previous or next shot. **H**: hide the UI.
- Shot buttons jump to a scene, and the timeline lets you scrub.
- **☔ Rain** turns the rain on or off. **🎥 Free cam** lets you orbit the scene with the mouse.
- **● REC** plays the film from the start and downloads it as `longbow-battle.webm`. Size the window to the resolution you want before you press it. The film is always rendered at 16:9.

To render a film to MP4, use `scripts/render-film.cjs`. The steps are in the comment at the top of the file.

URL options: `?shot=3` starts at a given shot, `?t=45` starts at a given second.

## The film (about 71 s)

1. **The Bowyer**: a hooded bowyer carves a stave by a campfire at dusk, with mountains behind.
2. **Two Armies**: a high shot over the rainy fields, the river, the woods and the windmill.
3. **The Knights**: a close-up of knights in great helms with plumes, plus horses in caparisons.
4. **Stakes**: archers hammer sharpened stakes into the ground.
5. **The Plan**: a commander points at the field while the king nods.
6. **Loose!**: the archers draw, and the camera follows the volley into the sky.
7. **Into the Storm**: the French advance through the mud while arrows keep falling.
8. **A Changed World**: a crane shot over the whole battlefield.

## How it's built

| File | What it does |
|---|---|
| `src/toon.js` | Toon gradient, ink outlines, and vertex-colour geometry merging |
| `src/textures.js` | Canvas-painted tabards (St George, royal quarters, French star and pale), banners, sails and planks |
| `src/characters.js` | Close-up hero characters and a horse, built from primitives, with procedural poses (idle, march, trudge, hammer, point, nod, draw, carve, ride) |
| `src/army.js` | `Squad`: formations drawn with `InstancedMesh`, one draw call per body part, with marching and aiming animation |
| `src/volleys.js` | Arrow volleys with arcing paths, computed from time so scrubbing and recording are repeatable |
| `src/world.js` | Terrain, fields, mud and puddles, river, hedges, woods, windmill, camp, sky, clouds, rain, and the lighting moods |
| `src/cast.js` | Where the armies stand and which hero characters each shot uses |
| `src/director.js` | The shot list: camera moves, moods, captions, and volley times |

To make your own scene, edit `SHOTS` in `src/director.js`. Each shot has a camera `from` and `to`, a `mood` (`storm`, `stormDusk` or `dusk`), a caption, and the hero groups to show. Add armies in `buildArmies` and characters with `makeHero({...})` in `src/cast.js`.
