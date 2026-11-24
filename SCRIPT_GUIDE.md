# PSX Informative Shorts - Scripting Guide

## Rule 1: Continuous Natural Audio
NEVER break a single sentence into multiple audio generation events. Write the `narration` field as one full, natural sentence so the TTS flows perfectly. Use a `captions` array with exact timestamps to pop the text on screen word-by-word while the continuous audio plays.

## Rule 2: Constant Camera Motion
A shot must never be still. Every single shot block in your JSON must include a `cameraMotion` value (`slow_push`, `slow_pull`, `orbit_drift`, `handheld_bob`).

## Rule 3: 3D Explainer Props
Don't just have the character point at a blank wall. Use the `spawn_prop` event to throw spinning, glowing 3D assets on screen (e.g., a glowing sun, bouncing 3D arrows showing light paths, a spinning eyeball). Sync these prop spawns with a `pop` or `whoosh` sound effect.

## The 3-Second Rule

DO NOT write long, continuous scenes. The human brain loses focus after 3 seconds without a visual change. Break your educational concepts into rapid 2-3 second `shots`.

## Bad Example vs. Good Example (The Window/Mirror Effect)

**BAD SCRIPTING (Do not do this):**

- Camera pushes in slowly for 35 seconds.

- Character stands perfectly still.

- Narration reads: "A window by day. A mirror by night? The glass itself has not changed. Two light paths reach your eyes..."

*(Result: Viewers scroll away instantly).*

**GOOD SCRIPTING (Viral Formatting):**

- **Shot 1 (0:00-0:02):** `macro_closeup` on the character's face. Aggressive vertex wobble. Character is doing a `thinking` animation. Narration: "Why do windows turn into mirrors at night?"

- **Shot 2 (0:02-0:04):** `whip_pan_to_prop`. Camera violently pans to a bright window with sunlight blasting through. SFX: *Whoosh*. Narration: "The glass never changes."

- **Shot 3 (0:04-0:06):** `dutch_tilt_push`. Room goes dark, a lamp clicks on, bouncing light off the glass. Character points at the glass (`pointing` animation). Narration: "It's all about light paths."

- **Shot 4 (0:06-0:08):** `over_shoulder`. We see the character's reflection clearly in the dark glass. SFX: *Click*. Narration: "Your lamp drowns out the outside dark."

## Deliverable for a writing agent

Return **only valid JSON**. The timestamps and sentences above are a storyboard, not engine fields. Treat “three seconds” as this studio's editing rule, not a biological attention limit. Give each shot one new piece of visual evidence. Hook in the first two seconds, establish the ordinary explanation, reveal the surprising mechanism, demonstrate a test and loop back to the hook. Verify factual claims. Say each line aloud before locking timing.

**Write a `shots` array.** For a named or narrated episode, wrap it in a version-3 object as below. A bare JSON array of shot objects also runs (untitled, no narration or beat). Never use `scenes`, a global camera timeline, or one long track. Every shot is a new cast, set, camera setup, and local clock. The editor and batch renderer enforce the same rules. Use [the full 24-second sample](episodes/night-window.json) to see 11 cuts timed to one voice track.

```json
{
  "version": 3,
  "title": "The second face",
  "series": "Everyday optics",
  "music": {"track":"episodes/neon-current.wav","volume":0.26},
  "narration": "Whose face is in the window? It's yours. Light bounces back.",
  "shots": [
    {
      "title": "Recognition",
      "duration": 2.5,
      "stage": "house_corner",
      "cameraPreset": "macro_closeup",
      "cameraMotion": "slow_push",
      "focus": "host",
      "distance": 2.7,
      "actors": [{"id":"host","asset":"male.character_01","motion":"thinking"}],
      "captions": [{"time":0,"text":"Whose face is","highlight":"face"},{"time":1.1,"text":"in the window?"}],
      "sfx": "riser"
    },
    {
      "title": "Behind the shoulder",
      "duration": 2.5,
      "stage": "window_night",
      "cameraPreset": "over_shoulder",
      "cameraMotion": "orbit_drift",
      "events": [{"type":"spawn_prop","id":"bounce","asset":"3D_Arrow","time":0.45,"from":[0.4,1.1,0],"to":[-0.3,1.3,0.75],"travel":0.95,"size":0.5,"sfx":"whoosh"}],
      "focus": [-0.3,1.35,-0.9],
      "actors": [{"id":"host","asset":"male.character_01","motion":"pointing","position":[-0.3,0,0.9],"yaw":2.9}],
      "captions": [{"time":0,"text":"It's yours."},{"time":1.1,"text":"Light bounces back.","highlight":"bounces"}],
      "sfx": "click"
    }
  ]
}
```

## Strict field reference

Unknown fields, unknown keys, malformed vectors, and unsupported durations are rejected. All coordinates and numeric fields must be finite. Times are **seconds**, not frame numbers.

| Episode field | Contract |
|---|---|
| `version`, `title`, `shots` | Object form requires integer `3`, a nonempty title and an array of 1–60 shots. Do not specify total duration: sum the shots. |
| `series`, `beat` | Optional display string and boolean (default false). `beat` adds a quiet pulse; it is not a cut SFX. |
| `music` | Optional `{ "track":"episodes/neon-current.wav", "volume":0.26 }`. Local audio path, linear volume 0–1. The track loops from episode zero, ducks under dialogue, fades out, and replaces `beat` when both are present. Never place the music cue on each shot. |
| `narration` | Optional English prose: one natural sentence or a paragraph, up to 6,000 characters. Write it **once at episode level**. The entire text goes to the offline voice in one request, yielding one WAV/AudioBuffer. A sentence may cross a cut. Never insert punctuation just to make a caption break. |
| `voiceover`, `speechRate` | Optional supplied local `.wav`, `.ogg`, `.mp3` or `.m4a` recording (no absolute path, URL scheme or `..`). It overrides TTS. Remove `voiceover` to hear edits to the prose. `speechRate` is 0.75–1.5 (default 1.08), only for generated speech. No text and no file = no narrator. Overlong takes are reported, not chopped mid-sentence. |

| Shot field | Contract |
|---|---|
| `title`, `stage`, `cameraPreset`, `cameraMotion`, `sfx` | Required. Nonempty title and exact keys below. Start the next clause on the cut; SFX is scheduled at that exact boundary. |
| `duration` | **2.0–3.5 inclusive on a 1/60-second tick.** Prefer 2, 2.25, 2.5 or 3; reserve 3.5 for a reveal that needs reading time. No crossfades or gaps. |
| `actors`, `props` | Arrays; at least one subject across both, or a spawn at `time:0`. Put the speaker/observer first in `actors`. A diagram cut can have only props. |
| `focus` | Subject ID **in this shot** or `[x,y,z]`, default `[0,1,0]`. For an over-shoulder or whip, target the object being observed, not the first actor. Macro on a named actor aims at face height. |
| `distance`, `angle`, `pan` | Optional base camera radius 0.3–40, base azimuth in radians, and lateral whip span for a prop-only whip. Presets apply their own framing. |
| `events` | Optional array of up to 24 timed `spawn_prop` events. Event IDs are unique across this shot’s actors, props and events. See the forms below. |
| `captions` | Nonempty array. Each `time` is local to this shot, nonnegative, strictly increasing and below duration. No text is shown before the first timestamp. Each `text` is **1–3 words**. Optional `highlight` is an exact case-sensitive substring, including punctuation where needed. Pops are centered with an outline and shadow. Keep words short enough to read. |

| Subject field | Contract |
|---|---|
| `id`, `asset` | Required nonempty ID (unique within shot) and an exact asset key. No invented file paths. |
| `motion` | Optional, default **`idle_breathe`**. For rigged actors: `talking`, `pointing`, `thinking`, `shocked`, `idle_breathe`. For props use `float_spin`, `pop_in` or `idle_breathe`. Motion restarts on the cut. |
| `height`, `position`, `yaw` | Optional positive normalized height (default 1.6), floor-centered `[x,y,z]` (default origin), and heading in radians (default 0). Y is up; +Z faces the default camera. |
| `clip` | Optional `{"name":"mixamo.com"}` or `{"asset":"female.character_female_02","name":"mixamo.com"}`. Name a real embedded take on a compatible rig. Only bone quaternions transfer, never root position. A moving explicit take wins. Otherwise the engine tries an embedded clip named for the motion, then a registered Mixamo donor under `Assets/Animations/<motion>.fbx` on compatible humanoids. When neither exists, it directs the upper body over the anonymous FBX base. To install a licensed donor, add the file and rerun `python3 scripts/catalog.py`; do not write a nonexistent donor into JSON. |
| `mesh`, `text` | Optional exact source mesh name for extracting a static object from a pack; leave unset on a skinned actor. `text` is only for `asset:"label"`, 1–24 characters. A floating sign is not a subtitle. |

### Five camera setups; three cut cues

| `cameraPreset` | Choose it when… |
|---|---|
| `macro_closeup` | An expression or detail **is** the evidence. Use a named actor for a face or a named prop for an inspection. |
| `whip_pan_to_prop` | Attention transfers from the first actor to `focus` early in the shot. With no actor it starts laterally offset. |
| `dutch_tilt_push` | A twist warrants a canted push into the reveal. |
| `over_shoulder` | The viewer should see what the first actor sees. Place the actor between the camera and a separate target. Without an actor this is an oblique inspection angle. |
| `wide_orbit` | Relative positions matter; show the whole demonstration with a moving arc. |

Every cut changes the lens immediately, even for consecutive uses of the same preset. Prefer **different evidence** over merely changing lenses. Choose `whoosh` for a transfer, `click` for a switch/reveal, or `riser` for suspense. There is no silent cut key. Previewing a paused scrub is silent; playing and exporting use scheduled audio.

### Layer movement over composition

`cameraPreset` chooses the lens and staging. `cameraMotion` is a separate required movement across the whole shot, even after a whip lands: `slow_push` dollies in approximately half a unit (less in extreme closeups), `slow_pull` dollies out, `orbit_drift` arcs around focus, `handheld_bob` adds subtle pitch/yaw sway and lateral drift. All are sampled from shot-local time rather than accumulated draw frames. An event ID may be the `focus`; before its spawn time the camera aims at its starting position.

### Timed prop events (not static asset keys)

- **Direction:** `{"type":"spawn_prop","id":"ray","time":0.3,"asset":"3D_Arrow","from":[-0.6,1,0],"to":[0.5,1.4,0.4],"travel":1.2,"size":0.65,"sfx":"whoosh"}`. Distinct 3D endpoints; positive travel in seconds; arrival must be within this shot. It faces the direction of travel and holds at B.
- **Concept:** `{"type":"spawn_prop","id":"day","time":0.12,"asset":"Floating_Icon","icon":"Sun","position":[0.5,1.4,0],"size":0.65,"sfx":"pop"}`. Use exactly `Sun`, `Moon`, `Lightbulb`, or `Eyeball`. Icons spin and bob after arrival.
- Each appears at shot-local `time`, scales **0 → 1.2 → 1**, and persists until the next cut. `size` is optional, default 0.65, max 4. Both types require `sfx:"pop"` or `"whoosh"`; the **shot** still needs its own cut cue. Place events on stressed words. Avoid putting the most important detail directly behind the caption.

### Sets, props and look

- `window_day` / `window_night`: matched demonstration sets with a window opening at Z=0. Position actors on the room side (positive Z); their mirrored performances behind the glass are faint by day and stronger by night. Do not add a second `pane` here.
- `house_corner`: furnished Quequis house interior. `optics_lab`: diagram grid. `backstage`: curtains and riser. `graveyard`: cemetery. `void`: sparse demonstration floor. Stage does not persist between shots.
- Built-in subjects: `sheet`, `pane`, `lamp`, `eye`, `arrow`, `rays`, `label`. `rays` illustrates reflection, not straight-through transmission. For other objects use the verified inventory below.
- Default look: 160×240 clip-space snap grid, 180×320 scene buffer, nearest sampling, affine diffuse UVs, 4×4 Bayer dithering and 5:5:5 RGB. The scene is enlarged to 540×960 **before** caption compositing. Adjust the look in the inspector or `CONFIG.psx`, not in JSON.
- For TTS or recorded voice, absolute cue time is **sum of previous shot durations + caption `time`**. Treat a longer spoken sentence as several timed pops. Never split an existing audio track by simply guessing its new cut points.

### Migrating older scripts

For v2: set `version:3`, add `cameraMotion` to every shot, rename caption `at` to `time`, and move any audio filename from `narration` to `voiceover`. Write prose in `narration`. Audition the **whole take first**, then place caption and event times. For v1, also rename `scenes` to `shots`, choose a legal lens and cue for every shot, split long captions, replace `talk_gesture`/`point`/`shock` with `talking`/`pointing`/`shocked`, then validate in **Edit JSON → Apply episode**. Durations outside the allowed range must be rewritten, not silently clamped. Scrub the last tick of one shot and the first of the next. Play through with audio before export.

## Inspected assets and rig compatibility

The raw [asset inventory](docs/asset-inventory.json) lists **every supplied path**, including 1,577 PNG/JPEG textures, Blender/DAE authoring sources, all FBXs/GLBs, and the empty sound inventory. For each runtime model it gives raw mesh names, clip names and bone → parent relationships. `src/catalog.js` is the machine-readable key → path/clip lookup. **Asset library** in the editor searches the same manifest. Inspection found 123 FBXs and 9 GLBs. One FBX (`Quequis_House_Props.fbx`) contains no meshes or clips and is deliberately excluded; the GLB version works. No standalone animation pack was found.

- The Male/Female actors and the two Mixamo Halloween actors carry a clip named **`mixamo.com`** (95 files in total). Do not infer it is a walk, point or dance from that name. The standard skeleton begins `mixamorig:Hips → Spine → Spine1 → Spine2`; legs branch at Hips, shoulders at the upper spine. The loader sanitizes names, transfers **compatible bone rotation tracks only**, discards translations/scales and removes initial hips heading relative to target rest yaw. A donor’s mesh is not added to the shot. Use same-family rest poses for reliable results.
- `halloween.character_ghost` has **no clip**. Its rig has `Spine → Neck → Head`, `R_Shoulder → R_Forearm → R_Hand` and corresponding left limbs; not a Mixamo Hips rig. Use procedural gestures; do not borrow humanoid clips for this ghost. Static GLB maps/prop packs have no skins or clips.
- Prefer the unsuffixed GLB key where both formats exist. FBX texture references may be Windows authoring paths; the loader resolves the basename, preferring the model pack, then shared `Assets/Textures`. Missing originals get a neutral checker. `house.house_colliders` is collision geometry, not a furnished house. For publishable outputs check the licenses of the specific source packs.
- Whole-prop pack layouts are not single objects. Useful verified pairs: `quequis_house.quequis_house_props` + `Armchair`, `Coffee_jar`, `Phone`, `Table`, `Painting`; `metro_psx.metro` + `subway_car`, `Vending_machine`, `metro_map`; `pizzeria.pizzeria_props` + `Pizza_oven`. Extend from the inventory, not memory.

### Complete imported `asset` keys in this checkout

- **6twelve**: `6twelve.6twelve`
- **abandoned_house**: `abandoned_house.abandoned_house`, `abandoned_house.abandoned_house.fbx`
- **all**: `all.all`
- **burgerpiz**: `burgerpiz.burgerpiz`, `burgerpiz.burgerpiz.fbx`
- **bus_stop**: `bus_stop.props`, `bus_stop.stop`, `bus_stop.stop_01`
- **diner**: `diner.diner`, `diner.objects`
- **female**: `female.character_17_female_police`, `female.character_18_female_police`, `female.character_19_female_police`, `female.character_20_female_police`, `female.character_21_female_firefighter`, `female.character_22_female_firefighter`, `female.character_23_female_doctor`, `female.character_24_female_doctor`, `female.character_25_female_police`, `female.character_26_female_police`, `female.character_27_female_hm`, `female.character_28_female_hm`, `female.character_29_female`, `female.character_30_female`, `female.character_31_female`, `female.character_32_female`, `female.character_33_female`, `female.character_34_female`, `female.character_35_female`, `female.character_36_female`, `female.character_37_female`, `female.character_38_female`, `female.character_39_female`, `female.character_40_female`, `female.character_41_female`, `female.character_42_female`, `female.character_43_female`, `female.character_44_female`, `female.character_45_female`, `female.character_46_female`, `female.character_female_01`, `female.character_female_02`, `female.character_female_03`, `female.character_female_04`, `female.character_female_05`, `female.character_female_06`, `female.character_female_07`, `female.character_female_08`, `female.character_female_09`, `female.character_female_10`, `female.character_female_11`, `female.character_female_12`, `female.character_female_13`, `female.character_female_14`, `female.character_female_15`, `female.character_female_16`
- **gas_station**: `gas_station.gas_station`, `gas_station.gas_station_props`
- **halloween**: `halloween.character`, `halloween.character_ghost`, `halloween.character_witch`, `halloween.halloween`
- **house**: `house.house`, `house.house_colliders`
- **male**: `male.character_01`, `male.character_02`, `male.character_03`, `male.character_04`, `male.character_05`, `male.character_06`, `male.character_07`, `male.character_08`, `male.character_09`, `male.character_10`, `male.character_11`, `male.character_12`, `male.character_13`, `male.character_14`, `male.character_15`, `male.character_16`, `male.character_17_police`, `male.character_18_police`, `male.character_19_police`, `male.character_20_police`, `male.character_21_police`, `male.character_22_police`, `male.character_23_firefighter`, `male.character_24_firefighter`, `male.character_25_doctor`, `male.character_26_doctor`, `male.character_27_hm`, `male.character_28_hm`, `male.character_29`, `male.character_30`, `male.character_31`, `male.character_32`, `male.character_male_33`, `male.character_male_34`, `male.character_male_35`, `male.character_male_36`, `male.character_male_37`, `male.character_male_38`, `male.character_male_39`, `male.character_male_40`, `male.character_male_41`, `male.character_male_42`, `male.character_male_43`, `male.character_male_44`, `male.character_male_45`, `male.character_sheriff_n`, `male.character_sheriff_n_01`
- **metro_psx**: `metro_psx.metro`, `metro_psx.metro.fbx`
- **minas**: `minas.mines`, `minas.mines_modu`
- **models_pack_psx**: `models_pack_psx.models`
- **pizzeria**: `pizzeria.pizzeria`, `pizzeria.pizzeria_props`, `pizzeria.pizzeria_props.fbx`, `pizzeria.pizzeria_scene`, `pizzeria.pizzeria_scene.fbx`
- **quequis_house**: `quequis_house.quequis_house`, `quequis_house.quequis_house.fbx`, `quequis_house.quequis_house_props`, `quequis_house.waffle`
- **sewer**: `sewer.sewers`
- **tacos**: `tacos.tacos`, `tacos.tacos.fbx`, `tacos.tacos_props`, `tacos.tacos_props.fbx`

## Reference transcripts: source status and pacing workshops

The brief provided the following **literal slots**, not transcripts, footage, timestamps or visual notes. They are retained here so a later editor can insert the sources. Do not attribute dialogue, facts or camera choices to the original videos on the basis of their titles. The beat suggestions below are **original exercises**, not reconstructions.

### Video 1 — “Mammoth Meat Is Real”

> [PASTE TRANSCRIPT / VISUAL NOTES HERE]

**Why the title can hook:** “mammoth” sets an expectation of extinction; putting it beside a present-tense claim creates a question that can be answered visually. **Original timing exercise:** 0–2.5s: push toward a labeled exhibit, no generic history intro. 2.5–5s: cut from an apparent specimen to a macro view of its *verified origin label*. 5–7.5s: contrast what the viewer inferred with what that label actually establishes. Then devote one new angle to each link in the explanation. End with the opening exhibit, now labeled precisely. Do not conflate preserved remains, cultivated products or recovered DNA; identify the specific documented case first. `label`, `arrow` and a house `Table` can stand in for a clearly labeled diagram; **there is no registered mammoth or meat-slab key**.

### Video 2 — “Why You Don’t Want X-Ray Vision”

> [PASTE TRANSCRIPT / VISUAL NOTES HERE]

**Why the title can hook:** it promises a cost to a supposedly useful power. Lead with the visible contradiction rather than a definition. **Original timing exercise:** 0–2.5s: close on an eye and pose the question. 2.5–5s: cut to an object between a source and detector. 5–7.5s: rotate to reveal their relative positions. 7.5–10s: replace the wide stage with a labeled diagram of what is measured. Let each next cut remove one misconception; return to the eye for the payoff. Verify the physics: an eye seeing transmitted X-rays is not itself an X-ray emitter. The `rays` prop in this engine illustrates *reflection*; do not reuse its bent path as a diagram of transmission. Use `arrow` and `label` instead. No skull, X-ray machine or medical diagnosis is implied by these props.

**When transcripts arrive:** preserve the supplied wording, log each observed cut with its actual timestamp, and distinguish spoken words from on-screen text. Analyze the first unanswered question, the visual evidence on each cut, the information withheld until the payoff and the final-to-first-frame loop. Never retrofit invented timestamps to an unseen video.

### Window loop recipe

The window episode uses `bgMusic: "synthwave_tense"` instead of `music`: three whole 180 BPM loops in 24 seconds, without an outro fade. All cuts use `whoosh_fast`. Set `motionSfx` on a subject for the start of its shot-local performance. In a `spawn_prop` event, `spawn_prop` names the asset (older `asset` syntax also works). `particle_stream_yellow` sends successive beads from `from` to `to` in `travel` seconds, optionally reflecting at `via`. `3D_Lightbulb` takes `position`, `animation: "pulse"`, a spawn `sfx` and `animationSfx: "click"`. `ui_pop` and `ding` are available as spawn cues. `cup_hands` brings the actor's hands up to shield the glass. For a final whip into the opening pose, duplicate the opening set, subject, focus and rig on the last shot and set `matchHook: true`. Cut the take on the pickup, not after the repeated hook.

### Evolutionary Explainer: build a loadout

Open `/?episode=episodes/pallas_cat.json` for the 17-second example. The framework uses an original procedural `evo_cat` actor; it doesn't assume that arbitrary imported skeletons have feline leg or ear bones. `shiver` and `grumpy` are its special performances. These are visual analogies for real traits, not changes an individual animal undergoes in its lifetime.

- Each shot gets a fresh rig. On the actor set `traits` to an array of **already equipped** upgrades. Don't put the new upgrade there until the *following* shot. This makes a direct seek equivalent to playing from zero.
- Put `{ "time": 0.3, "target": "cat", "apply_morph": "thick_fur", "duration": 0.8, "sfx": "pop" }` in `events` to ease a mesh morph target from 0 to 1. `short_legs_flat_ears` uses `ratchet` and scales leg and ear bones. `{ "time": 1, "target": "cat", "texture_swap": "round_pupils", "duration": 0.7, "sfx": "ping" }` animates the eye texture through nine frames. Morph windows must last 0.5–1.0 s and finish before the cut.
- A diegetic panel event takes `spawn_ui`, `time`, world-space `position`, optional `size`, and `sfx`. Pairs: `red_x` / `buzzer`, `stat_upgrade` / `level_up`, `PALLAS CAT text` / `level_up`. The panel turns toward the moving lens and is part of the captured frame. Captions remain on their own timeline.
- Keep the cut whoosh on the **shot** and the effect cue on the **event**. Don't cut the audio when a trait changes. The demo uses one spoken take across all seven shots and ends “But is it…” → “Cold enough for this cat?”

### Escalation timeline: screen → scale → diagram → graph

[`episodes/escalation-lab.json`](episodes/escalation-lab.json) is a complete, renderable example. Place each operation in a shot's `events` array with **shot-local** `time`, mandatory `sfx`, and optional `duration` (visible until the cut when omitted). Fields inside each operation describe its content. Existing actors and the required `cameraMotion` keep running. These event types are visual layers, not subject IDs: use `focus: [x,y,z]` for a wall, or let a board steer the lens.

| Event | Authoring contract |
|---|---|
| `show_phone`, `show_tv` | `{"app":"bank","balance":"$2,565"}` or `{"app":"video_call","avatar":"guru"}`. The device slides into camera space. A local HTML canvas paints the app onto its physical face; no DOM overlays, remote images or arbitrary HTML execution. |
| `spawn_mass` | `{"prop":"casino_chip","count":1000,"formation":"grid_wall","reveal":1.3}`. Up to 4,096 chips per event; one instanced draw. Optional `reveal` pulls the whole wall back from a magnified view over that many seconds. Optional **event-level** `position` sets its world-space center. |
| `show_whiteboard` | Supply `title`, `nodes` (`id`, `label`, `kind`: `step`/`win`/`loss`, normalized `x`/`y`), and directed `edges` such as `[["play","win"],["play","lose"]]`. Space nodes apart. Up to 12 nodes and 24 edges. Event `position` locates the board. `transition` (default 0.42s) eases the moving camera onto the board and back when a duration is specified. Sequence rather than overlap two board handoffs. |
| `show_graph` | `{"label":"Balance","unit":"$","start":2565,"end":641.25,"drawTime":2}`. Draws an **exponential interpolation** between unequal positive endpoints, not a plot of historical transactions. The curve and current value appear in the recorded canvas, below captions in draw order. Use `captionPosition:"lower"` to keep both readable. |

The episode budget is 96 escalation events / 32,768 instances. An invalid count, missing cue, unknown edge endpoint or overlong animation fails validation before GPU allocation. All reveals use absolute shot time and share the regular playback, capture and offline render paths.

### Grounded casino POV

[`chip-math.json`](episodes/chip-math.json) uses `casino_room`. Felt is at y=0.90. Screen `position` now optionally specifies its **support point**: a phone lies face up, a TV stands on its base. For `table_tower` the same point is the bottom of the first chip. The table stays put when the camera pulls back. On a shot `pov.eye` is the head position, `focus` is its gaze, `whipFrom` starts a fast look from another point and `recoil` backs the eye away along the lens. `cameraMotion` still runs. `tense_heartbeat` is regenerated by `python3 scripts/heartbeat.py`; `narratorStyle: "urgent"` defaults text-only TTS to 1.4×, while supplied narration uses the mastered take. Use `show_graph.lossStreak` for a remaining-bankroll curve under doubling losses; `cueAt: "end"` aligns the graph SFX with impact. For $10 on red the tenth stake is $5,120 and cumulative losses are $10,230, not $100.

For longer stories, set episode-level `pacing: "narrative"` to allow **2–15 seconds per shot**. By default the strict 2–3.5-second rule still applies. `bet_stack` is a tabletop `spawn_mass` formation: one column per twenty chips. Set `pacing: "micro"` for a 3.2-second ceiling and a 2-second floor (only the first two hook shots may be as short as 1.7 s). For the [native-speed Martingale story](episodes/casino_martingale.json), absolute word onsets from one complete spoken take determine cuts, timed captions and cash-register hits on `spawn_prop: "bet_stack"` events (1–100 chips). On a POV `matchHook` shot use `pov.whipFrom` to specify where the returning gaze begins. Let the final word finish before the timeline ends.

For hand-placed wagers, cast `male.character_01` with `motion: "place_bet"`. Add `placedBy` (actor id) and `slideFrom` (world-space point on the felt) to the `bet_stack` event. The reach starts 0.58 s before `time`; the stack lands on `position` and the register cue at `time`. Keep both points comfortably within arm’s reach. Set shot boundaries and captions against the **untimestretched take**, not the other way around.
