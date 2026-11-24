# Cutframe · PSX Informative Shorts Studio

Cutframe is a static Three.js r170 editor for making vertical educational videos from JSON. The studio opens with **Why windows become mirrors at night**, a 24-second v3 episode with eleven hard cuts and shot-local performances. The alternate **The ghost in the glass** episode explains Pepper’s ghost in nine 2.5-second shots, with original sets, an uploaded Halloween actor, a synthesized narrator, and cut cues. [Watch the archived v1 WebM](episodes/ghost-in-the-glass.webm) or [open its JSON](episodes/ghost-in-the-glass.json).

## Finished reference shorts

**Start here:** [Agent guide to making a good short](AGENTS.md).

[Watch **Platform Three: What if you could turn invisible?** (MP4)](examples/platform-three/invisible.mp4) · [Editable episode](episodes/invisible.json) · [Score generator](scripts/platform_score.py). The approved 28.4-second subway cut shows how to time a camera reveal and captions to continuous speech without interrupting a sentence.

[Watch **Your last $10 on red** (MP4)](examples/last-ten-on-red/casino_martingale.mp4) · [Editable episode source](episodes/casino_martingale.json) · [Shot breakdown and rebuild instructions](examples/last-ten-on-red/README.md). Use this 42⅓-second short as a starting point for timing a continuous voice take, staging hand-placed bets, and mixing a score beneath dialogue.

## Render on GitHub — no local GPU required

1. Add a script under `episodes/` (see [the writing guide](SCRIPT_GUIDE.md)). For speech, write a sentence or paragraph in episode-level `narration`, or set `voiceover` to one recording. With neither, the engine exports captions, beat and SFX only.
2. In **Actions → Render a Short → Run workflow**, choose `main` and enter the episode path. The default is [Why windows become mirrors at night](episodes/night-window.json): **24 seconds, 11 cuts, 720 frames** with a timed voiceover.
3. Open the completed run and download its **short-…** artifact. Unzip the **540×960, 30 fps H.264/AAC MP4**. GitHub retains these downloads for 30 days; save a copy for publishing. For a permanent download, tick **Also publish a durable GitHub Release download** on a manual `main` run. Rendering does not commit binaries back to the repo or publish to a social platform.

The Linux runner uses the vendored Three.js modules, Chrome software WebGL, an offline audio mix, and FFmpeg. It samples exact frame times rather than recording a live screen, so a slow runner takes longer without dropping video frames. `ffprobe` checks the streams, resolution, frame count and duration before upload. Framework/episode pull requests exercise the default Short too.

For the same batch path locally on Linux with Node 24, Chrome, FFmpeg and ffprobe installed:

```sh
npm ci
CHROME_BIN="$(command -v google-chrome)" npm run render -- episodes/night-window.json
node scripts/verify-render.mjs episodes/night-window.json
```

Find the result in `render-output/`. The studio itself still needs no npm packages. Open `/?episode=episodes/night-window.json` to inspect the same shots in the editor.

## Run

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/> in a WebGL 2 browser. No build, installation, microphone, API key or backend. For an Arena preview bind to `0.0.0.0` instead. The native import map pins Three.js and addons to **0.170.0** on jsDelivr. Localhost and Arena use an MIT-licensed vendored copy of the same modules. `?modules=local` forces offline module resolution on another host; `?modules=cdn` tests CDN mode. Serve over HTTP(S), not `file://`.

## Make another episode

1. Give [SCRIPT_GUIDE.md](SCRIPT_GUIDE.md) to the writer. [Verified inventory](docs/asset-inventory.json) includes raw mesh names, FBX bone parents and embedded clip names.
2. Choose **Edit JSON**. Paste a script or **Open JSON**, then **Apply episode**. Structural errors identify the shot; an invalid replacement leaves the last working episode loaded. **Save JSON** downloads the editor contents; nothing is silently written to disk.
3. Or put your script under `episodes/` and open `/?episode=episodes/my-short.json`. Referenced narration and assets must also be served by this static server, not just present on the client’s disk.
4. Click a shot, scrub the timeline, or press Space to preview. Inspector changes are live, session-only look overrides; defaults live in `src/config.js`. Muting affects speakers only.
5. **Export WebM** renders the entire current episode from zero in real time, with captions burned in and the mixed narration/beat/cues in the audio track. Keep the tab visible. Export requires `captureStream`, Web Audio and a WebM-capable MediaRecorder (Chromium recommended). VP9/Opus is preferred; VP8/Opus is the fallback. Cancel discards that recording. Output is 540×960 at a requested 30 fps; actual capture cadence depends on device load. This is not an offline frame-accurate encoder.

## Modules and lifecycle

| Module | Responsibility |
|---|---|
| `config`, generated `catalog`, `schema` | Render defaults, dimensions, manifests, mini-set fixtures and strict v3 shot validation |
| `assetLoader`, `animationLibrary` | GLB/FBX loading, texture-path repair, floor-centered normalization, skeleton cloning, rootless quaternion clips and procedural motion |
| `stages`, `cameraDirector` | Seeded scenic geometry, subject props, preset motion and shot framing |
| `psxShader` | Post-skinning clip-space grid snap, affine diffuse UV interpolation, nearest sampling, low-res target, display-space Bayer dither and 5:5:5 quantization |
| `episodeRunner`, `sfxEngine` | 60 Hz integer tick simulation and deterministic seeking, audio-clock transport, mixer/recorder routing and scheduled cues |
| `captionEngine`, `studioUI` | Canvas compositing, thumbnails, transport, JSON editing, asset search, effects and recording |
| `boot`, `main` | Import map selection and demo/query bootstrap |

Scene templates and resources are owned by one episode. Only referenced models are loaded; all shots are prepared before playback to avoid network waits at cuts. Geometry/materials/textures are shared between clones. Disposal deduplicates shared GPU resources, releases skeletons and mixers, and clears audio buffers on successful replacement. Very large packs (notably Pizzeria) can take significant GPU memory: prefer named props and short episodes, or optimize large source packs before deploying on mobile. Selecting one GLB mesh still downloads the whole GLB.

## Music and voice

The two demo episodes use the auditioned US-English narrator, each in one continuous take. Their `voiceover` files take precedence over offline synthesis. For new prose, remove `voiceover`: the keyless fallback now uses the masculine RMS voice at a quicker default pace. The offline voice is not a clone of the auditioned voice.

**Neon Current** is an original 128 BPM synth score: syncopated bass, FM plucks, kick, snare and lightly swung hats. The Python standard library synthesizes all instruments and wraps the echo tails into an eight-bar loop. No samples, pip packages or music service are required.

```sh
python3 scripts/score.py episodes/synthwave-tense.wav --bpm 180 --tense --bars 6
python3 scripts/score.py                          # reproduce episodes/neon-current.wav
python3 scripts/score.py episodes/remix.wav --bpm 136 --seed 23
```

Use `"music": {"track":"episodes/neon-current.wav","volume":0.26}` in a script. Music loops on the episode clock (including after scrubs), automatically dips under dialogue, and ends with a short fade. Set volume to zero to silence it. This mix is used by both the editor and GitHub rendering.

## Inventory and checks

```sh
python3 scripts/catalog.py  # refresh catalog + raw inventory after importing assets
npm test                    # Node 18+; no dependencies
```

Inspect new rig families before reusing clips: name matching is **not** general IK or cross-species retargeting. See the guide for the exact keys supported by this checkout. Imported DAE, Blender and backup files are inventoried for authors, not runtime formats. `SoundEffects/` was absent; current cues are synthesized. Legacy missing external texture references fall back to a neutral checker; GLBs have embedded textures and are preferred. Asset licenses are not inferred from the folder names; verify publishing rights to supplied packs separately. Vendored Three.js retains its license. Text-only narration uses bundled CMU Flite (US English RMS, 1.08× pace) in a worker; no API key or network service. It loads a ~14 MB compressed engine on first synthesis. `voiceover` bypasses that download. Both playback and export decode and schedule one full take, independent of captions, cuts and timed prop events. For a human performance, supply a recorded take rather than changing subtitle timings. See `vendor/flite/` for licenses. To bake the same synthesized WAV ahead of time: `npm run narrate -- episodes/night-window.json my-take.wav`.

Visit `http://localhost:8000/tests/browser.html` for automated WebGL integration checks (deterministic seeking, real rigs/prop selection, failed reload rollback and stable GPU counts).

Additional browser acceptance: load the demo; test all shots and seek backward; change/reset the look; apply invalid then valid JSON; load a named GLB prop and a Mixamo character clip; export with the speakers muted and verify video, burned-in captions and audio. Renderer warnings about source FBX weights being reduced to four are expected; they are not missing files or shader errors.

### Evolutionary Explainer

Open `/?episode=episodes/pallas_cat.json` for **Pallas Cat: Cold Build** (17 seconds). The reusable morph and diegetic UI modules live under [`src/Evolutionary_Explainer/`](src/Evolutionary_Explainer/). The actor, mountain stage, weather, pupil atlas and studded UI are all generated locally. See the [script guide](SCRIPT_GUIDE.md#evolutionary-explainer-build-a-loadout) for event keys, durations, and sound cues. To encode the demo, use `npm run render -- episodes/pallas_cat.json` with the renderer prerequisites above, or select this episode path in the Render a Short workflow.

### Escalation demo: Ten bucks on red

Open `/?episode=episodes/chip-math.json` for a four-shot first-person Martingale warning: casino felt, a guru call, an instanced chip tower and a bankroll crash. The previous wall/whiteboard demo remains at `episodes/escalation-lab.json`. The [timeline reference](SCRIPT_GUIDE.md#escalation-timeline-screen--scale--diagram--graph) covers these JSON events and the TV variant. Render it with `npm run render -- episodes/chip-math.json` or select that path in GitHub Actions.

The narrative recut, **[Your last $10 on red](episodes/casino_martingale.json)**, opens on the roulette wheel, not the bank app. Try `/?episode=episodes/casino_martingale.json`. The player is the returning `male.character_01` rig. This 42⅓-second narrative uses one native-speed voice take over eighteen micro-shots, including the $20 → $40 → $80 sequence. The losing buzzer is a timed `type: "sound"` event, independent of the cut and captions. The crash graph depicts a $10,230 bankroll, not the original $10 in the player's pocket.

### Field study: What if you could turn invisible?

[Episode JSON](episodes/invisible.json) · Open `/?episode=episodes/invisible.json` in the studio. A 28.4-second subway-platform experiment: 11 moving shots, a scan-line disappearance against passing train windows, and a trip down the optical axis. It models **perfect transmission of visible light**, not camouflage or a camera-fed cloak. Compare the converging rays that stop at the normal retina with the straight rays that pass through the transparent eye. The final floating eyes are a visual gag about detectors having to interact with light, not a claim that eyes could function detached from nerves or a blood supply.

To export: `npm run render -- episodes/invisible.json`. The continuous voice recording sets the timing. The music stem is reproducible with `python3 scripts/platform_score.py`.
