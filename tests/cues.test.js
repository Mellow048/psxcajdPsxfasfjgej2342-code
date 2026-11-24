import test from "node:test";
import assert from "node:assert/strict";
import { SfxEngine } from "../src/sfxEngine.js";
test("one cue at every hard cut, same scheduler for preview and offline audio", () => {
  const audio = new SfxEngine(),
    played = [];
  audio.ctx = { currentTime: 10 };
  audio.tone = (k, t) => played.push([k, t]);
  const episode = {
    shots: [
      { duration: 2, sfx: "click" },
      { duration: 3.5, sfx: "whoosh" },
      { duration: 2.5, sfx: "riser" },
    ],
  };
  audio.start(episode, 0);
  assert.deepEqual(played, [
    ["click", 10],
    ["whoosh", 12],
    ["riser", 15.5],
  ]);
  played.length = 0;
  audio.start(episode, 2);
  assert.deepEqual(played, [
    ["whoosh", 10],
    ["riser", 13.5],
  ]);
  played.length = 0;
  audio.start(episode, 2.5);
  assert.deepEqual(played, [["riser", 13]]);
});
test("one voice source spans cuts and caption pops; seeks skip elapsed spawns", () => {
  const e = {
    narration: "Two light paths reach your eyes.",
    voiceover: "episodes/take.wav",
    shots: [
      {
        duration: 2,
        sfx: "click",
        captions: [
          { time: 0, text: "Two" },
          { time: 0.5, text: "light paths" },
        ],
        events: [{ time: 0.4, sfx: "pop" }],
      },
      { duration: 2, sfx: "whoosh", events: [{ time: 0.8, sfx: "pop" }] },
    ],
  };
  const a = new SfxEngine();
  a.ctx = { currentTime: 10 };
  const voices = [],
    sounds = [];
  a.sample = (...v) => voices.push(v);
  a.tone = (...v) => sounds.push(v);
  a.start(e, 0);
  assert.deepEqual(voices, [["episodes/take.wav", 10, 0]]);
  assert.deepEqual(sounds, [
    ["click", 10],
    ["pop", 10.4],
    ["whoosh", 12],
    ["pop", 12.8],
  ]);
  e.shots[0].captions = [];
  voices.length = 0;
  sounds.length = 0;
  a.start(e, 2.25);
  assert.deepEqual(voices, [["episodes/take.wav", 10, 2.25]]);
  assert.deepEqual(sounds, [["pop", 10.55]]);
});
