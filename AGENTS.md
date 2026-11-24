# Making shorts in this repo

Use [Platform Three](examples/platform-three/invisible.mp4) as the reference for a fast science short. Watch it before writing; open its [episode JSON](episodes/invisible.json) beside it. For a slower story that gives the audience time to count, study [Your last $10 on red](examples/last-ten-on-red/README.md). Match the decisions, not the runtime or the subway setting. [SCRIPT_GUIDE.md](SCRIPT_GUIDE.md) is the reference for supported JSON fields.

## Start with one thing the viewer can watch happen

Write the hook, the physical cause, and the payoff in a sentence each. Start on the action, not a greeting or title card. In Platform Three, the *same lit train window* is visible through the vanishing face, forms an image on the retina, then disappears from the rider's view. That continuity does more explanatory work than a new diagram at every cut. Check the science and state the assumption that makes the example work.

## Cut the picture to the voice

- Write as if telling one person a surprising story. Read it aloud. Drop filler like “Okay. Great trick. One problem.” if it creates three stops before the point.
- Record **one continuous take**. No silent gaps at caption boundaries or scene changes. Trim dead air between thoughts without clipping consonants or removing every natural breath. If a line still drags, rewrite or rerecord it. Never slow the opening and accelerate later phrases to hit a predetermined runtime.
- Mark the actual spoken onsets, then place shots, captions, physical contacts and sound cues against them. Use short caption groups; let a sentence cross a cut. Keep faces, hands and the object being explained clear of the caption area.

## Give the camera a reason to move

- For each shot, name what changes on screen and what the viewer learns. Use the episode's supported pacing profile; moving micro-shots around 2–3 seconds work when each reveals new information. Don't repeat an empty angle to pad the duration.
- Build depth: a foreground subject, a moving middle-ground reference and a recognizable background. Use a few details that read at phone size. A platform sign, warm carriage windows and passing silhouettes say “subway” better than dozens of tiny props. Keep the place moving behind the subject, not just the camera.
- Show contact and consequences. Slide the chips under a hand; let the train pass behind the *same* space as the disappearing face. Inspect real meshes and rigs before assigning them. Preserve positions and screen direction across cuts. Reserve the biggest camera move for the reveal.
- Give the location a sound. Keep music and ambience below the voice; place accents on meaningful events rather than every word. A deliberate dropout on the loss of vision is storytelling, not a license to leave dead air after the final line.

## Before delivery

1. **Listen without picture.** Is the hook immediate? Is any word swallowed, any silence accidental, or any phrase conspicuously faster than the rest?
2. **Watch muted at phone size.** Can you follow cause and effect? Check silhouettes, contact, clipping, text contrast and whether the final image pays off the opening. Then play the *rendered MP4* with sound to check cue sync and the ending.
3. Run `npm test`, `npm run render -- episodes/<name>.json`, and `node scripts/verify-render.mjs episodes/<name>.json` (see [setup](README.md#render-on-github--no-local-gpu-required)). Technical checks don't replace the two playback passes.
4. Deliver the MP4 and link the editable JSON. Keep routine exports in `render-output/`. When a cut is **approved as a reference**, preserve that exact MP4 under `examples/`, link its sources from the README, and merge via PR rather than pushing straight to `main`.
