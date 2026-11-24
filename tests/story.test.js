import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/schema.js";
import { SfxEngine } from "../src/sfxEngine.js";
const demo = JSON.parse(readFileSync("episodes/escalation-lab.json"));
test("story demo and TV variant validate; bounds and topology fail during authoring", () => {
  validate(demo);
  const tv = structuredClone(demo.shots[1]);
  tv.events[0].show_tv = tv.events[0].show_phone;
  delete tv.events[0].show_phone;
  validate([tv]);
  for (const [i, change] of [
    [0, (e) => (e.show_phone.balance = 3)],
    [1, (e) => delete e.sfx],
    [2, (e) => (e.spawn_mass.count = 4097)],
    [2, (e) => (e.spawn_mass.count = 1.5)],
    [3, (e) => e.show_whiteboard.edges.push(["up", "typo"])],
    [3, (e) => (e.show_whiteboard.nodes[0].x = -1)],
    [4, (e) => (e.show_graph.end = 0)],
    [4, (e) => (e.show_graph.drawTime = 10)],
    [1, (e) => (e.duration = 9)],
    [0, (e) => (e.spawn_mass = {})],
  ]) {
    const s = structuredClone(demo.shots[i]);
    change(s.events[0]);
    assert.throws(() => validate([s]), /shot 1/);
  }
});
test("story cues are scheduled at event onset, never replayed by a late seek", () => {
  const a = new SfxEngine(),
    heard = [];
  a.ctx = { currentTime: 7 };
  a.tone = (key, t) => heard.push([key, t]);
  a.start({ shots: [demo.shots[3]] }, 0);
  assert.deepEqual(heard, [
    ["click", 7],
    ["whoosh_fast", 7],
    ["whoosh_fast", 7.2],
  ]);
  heard.length = 0;
  a.start({ shots: [demo.shots[3]] }, 0.3);
  assert.deepEqual(heard, []);
});
test("casino POV: grounded tower and buzzer precisely on the last loss", () => {
  const e = validate(JSON.parse(readFileSync("episodes/chip-math.json")));
  assert.ok(
    e.shots.every(
      (s) => s.stage === "casino_room" && s.pov.eye && s.cameraMotion,
    ),
  );
  const tower = e.shots[2].events[0];
  assert.equal(tower.position[1], 0.9);
  assert.equal(tower.spawn_mass.count, 1000);
  const s = e.shots[3],
    ev = s.events[0],
    g = ev.show_graph;
  assert.equal(g.start - g.end, 10 * (2 ** g.lossStreak - 1));
  const a = new SfxEngine(),
    cues = [];
  a.ctx = { currentTime: 0 };
  a.tone = (key, when) => cues.push([key, when]);
  a.start({ shots: [s] }, 0.5);
  assert.deepEqual(cues, [["buzzer", ev.time + g.drawTime - 0.5]]);
});
test("Native-rate micro cut: fast hook, accented doubles, and a wheel match", () => {
  const e = validate(
      JSON.parse(readFileSync("episodes/casino_martingale.json")),
    ),
    s = e.shots;
  assert.equal(s.length, 18);
  assert.equal(
    s.reduce((n, q) => n + Math.round(q.duration * 30), 0),
    1270,
  );
  assert.deepEqual(
    s.slice(0, 3).map((q) => q.duration),
    [1.8, 1.7, 2],
  );
  assert.deepEqual(
    s.slice(0, 3).map((q) => q.cameraPreset),
    ["macro_closeup", "whip_pan_to_prop", "dutch_tilt_push"],
  );
  assert.ok(
    s.every(
      (q, i) =>
        q.duration <= 3.2 &&
        (i < 2 || q.duration >= 2) &&
        ["slow_push", "orbit_drift"].includes(q.cameraMotion) &&
        q.sfx === "whoosh_fast",
    ),
  );
  const bets = s.slice(7, 10);
  assert.deepEqual(
    bets.map((q) => q.duration),
    [2, 2, 2],
  );
  assert.deepEqual(
    bets.map((q) => q.events[0].count),
    [20, 40, 80],
  );
  assert.ok(
    bets.every(
      (q) =>
        q.events[0].type === "spawn_prop" &&
        q.events[0].sfx === "cash_register",
    ),
  );
  for (const [i, d] of [
    [0, 1.6],
    [2, 1.8],
    [3, 3.3],
  ]) {
    const ep = structuredClone(e);
    ep.shots[i].duration = d;
    assert.throws(() => validate(ep), /duration/);
  }
  assert.equal(s.at(-1).matchHook, true);
  assert.deepEqual(s.at(-1).focus, s[0].focus);
  assert.ok(s.at(-1).pov.whipFrom);
  const wav = readFileSync(e.voiceover),
    data = wav.indexOf("data", 12, "ascii");
  assert.equal(wav.readUInt32LE(data + 4) / wav.readUInt32LE(28), 1270 / 30);
});

test("invisible: normal rays converge, transparent eye passes rays straight on", () => {
  const e = validate(JSON.parse(readFileSync("episodes/invisible.json")));
  const normal = e.shots.find((s) => s.title === "The lens bends the rays");
  const clear = e.shots.find((s) =>
    s.props?.some((p) => p.asset === "section_eye" && p.fadeOut),
  );
  assert.deepEqual(normal.events[0].to, normal.events[1].to);
  assert.ok(clear.events.every((r) => !r.via && r.from[1] === r.to[1]));
  assert.equal(e.shots.at(-1).props.filter((p) => p.asset === "eye").length, 2);
  for (const range of [
    [1, 1],
    [-1, 1],
    [0, 10],
  ]) {
    const bad = structuredClone(e);
    bad.shots[0].actors[0].fadeOut = range;
    assert.throws(() => validate(bad), /fadeOut/);
  }
});
