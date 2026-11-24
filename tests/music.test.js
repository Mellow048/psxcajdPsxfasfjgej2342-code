import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bedAutomation } from "../src/musicBed.js";
import { SfxEngine } from "../src/sfxEngine.js";
import { validate } from "../src/schema.js";
const demo = JSON.parse(fs.readFileSync("episodes/ghost-in-the-glass.json"));
test("Python score is the shipped 8-bar PCM loop and music keys validate", () => {
  const wav = fs.readFileSync(demo.music.track);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40) / (2 * 24000), 15);
  for (const music of [
    { track: "../bad.wav" },
    { track: "https://bad/audio.wav" },
    { track: "a.wav", volume: 2 },
  ])
    assert.throws(() => validate({ ...demo, music }), /music/);
});
test("score ducks during dialogue and ends on silence", () => {
  const ch = new Float32Array(2000);
  ch.fill(0.15, 400, 1100);
  const v = { sampleRate: 1000, getChannelData: () => ch };
  const curve = bedAutomation(0.26, 0, 2, v);
  assert.equal(curve[0], 0);
  assert.ok(curve[16] < curve[4] * 0.6);
  assert.ok(curve[30] > curve[16]);
  assert.equal(curve.at(-1), 0);
});
test("seeking starts one loop in phase and stops it at episode end", () => {
  const a = new SfxEngine(),
    starts = [],
    stops = [];
  const source = {
    start: (...v) => starts.push(v),
    stop: (t) => stops.push(t),
  };
  a.ctx = {
    createGain: () => ({ gain: { setValueCurveAtTime() {} } }),
    createBufferSource: () => source,
  };
  a.track = () => {};
  a.buffers.set("music", { duration: 15 });
  a.musicBed({ track: "music" }, null, 3, 17, 35);
  assert.equal(source.loop, true);
  assert.deepEqual(starts, [[3, 2]]);
  assert.deepEqual(stops, [21]);
});
