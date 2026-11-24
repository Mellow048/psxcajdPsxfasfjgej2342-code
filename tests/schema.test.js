import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "../src/schema.js";
import { MODELS, TEXTURES } from "../src/catalog.js";
import { CAMERAS } from "../src/config.js";
const demo = JSON.parse(
  fs.readFileSync(
    new URL("../episodes/ghost-in-the-glass.json", import.meta.url),
  ),
);
test("shipped episode covers all five camera modes and exactly 1,350 ticks", () => {
  validate(demo);
  assert.equal(
    demo.shots.reduce((n, s) => n + 60 * s.duration, 0),
    1350,
  );
  assert.deepEqual(
    new Set(demo.shots.map((s) => s.cameraPreset)),
    new Set(CAMERAS),
  );
  assert.ok(fs.existsSync(demo.voiceover));
});
for (const [name, mutate] of Object.entries({
  duration: (s) => (s.duration = 1.9),
  fractionalTick: (s) => (s.duration = 2.111),
  wrongKey: (s) => (s.camera = "zoom"),
  focus: (s) => (s.focus = "missing"),
  captionOrder: (s) => s.captions.reverse(),
  unsafeAsset: (s) => (s.actors[0].asset = "__proto__"),
  clip: (s) => (s.actors[0].clip = { name: "Imaginary" }),
  badLabel: (s) => (s.actors[0].text = "Oops"),
  longCaption: (s) => (s.captions[0].text = "one two three four five six"),
  dupe: (s) => s.props.push(s.actors[0]),
  nonVector: (s) => (s.focus = [1, 2]),
  sfx: (s) => (s.sfx = "missing"),
  badMotion: (s) => (s.actors[0].motion = "walk"),
})) {
  test("rejects " + name, () => {
    const d = structuredClone(demo);
    mutate(d.shots[0]);
    assert.throws(() => validate(d), /shot 1/);
  });
}
test("all indexed paths and texture filenames exist on disk", () => {
  for (const p of [...TEXTURES, ...Object.values(MODELS).map((m) => m.path)])
    assert.ok(fs.existsSync(p), p);
});
test("rig inventory records actual parents, imported clips and empty FBX exclusion", () => {
  const { models } = JSON.parse(fs.readFileSync("docs/asset-inventory.json"));
  assert.equal(
    models[MODELS["male.character_01"].path].bones["mixamorig:Spine"],
    "mixamorig:Hips",
  );
  assert.equal(
    models[MODELS["halloween.character_ghost"].path].bones.Head,
    "Neck",
  );
  assert.deepEqual(MODELS["male.character_01"].clips, ["mixamo.com"]);
  assert.ok(!MODELS["quequis_house.quequis_house_props.fbx"]);
});

test("v3 shot contract: inclusive bounds, shorthand, strict cut and pop keys", () => {
  const shot = {
    ...structuredClone(demo.shots[0]),
    captions: [{ time: 0, text: "Test cut" }],
  };
  for (const duration of [2, 3.5])
    assert.equal(validate([{ ...shot, duration }]).shots[0].duration, duration);
  for (const duration of [1.999, 3.51, 35])
    assert.throws(() => validate([{ ...shot, duration }]), /2–3.5s/);
  assert.throws(
    () => validate({ version: 1, title: "legacy", scenes: [shot] }),
    /unknown field scenes/,
  );
  for (const cameraPreset of ["slow_push", "static"])
    assert.throws(() => validate([{ ...shot, cameraPreset }]), /cameraPreset/);
  assert.throws(() => validate([{ ...shot, sfx: undefined }]), /cut sfx/);
  assert.throws(
    () =>
      validate([
        { ...shot, captions: [{ time: 0, text: "This is too long" }] },
      ]),
    /1–3 words/,
  );
  const noAction = structuredClone(shot);
  delete noAction.actors[0].motion;
  validate([noAction]);
});
test("writer guide JSON and both shipped scripts validate", () => {
  const guide = fs.readFileSync("SCRIPT_GUIDE.md", "utf8");
  const examples = [...guide.matchAll(/```json\n([\s\S]*?)\n```/g)];
  assert.ok(examples.length);
  examples.forEach((m) => validate(JSON.parse(m[1])));
  const night = validate(
    JSON.parse(fs.readFileSync("episodes/night-window.json", "utf8")),
  );
  assert.equal(
    night.shots.reduce((n, s) => n + Math.round(s.duration * 60), 0) / 60,
    24,
  );
  assert.equal(night.shots.length, 11);
  assert.equal(night.bgMusic, "synthwave_tense");
  assert.ok(
    night.shots.every(
      (s) =>
        s.duration >= 2 &&
        s.duration <= 2.5 &&
        s.sfx === "whoosh_fast" &&
        [...(s.actors ?? []), ...(s.props ?? [])].every((a) => a.motionSfx),
    ),
  );
  assert.ok(
    night.shots
      .flatMap((s) => s.events ?? [])
      .every((ev) => ["pop", "ding", "click"].includes(ev.sfx)),
  );
  assert.doesNotMatch(night.narration, /hands|peel/i);
  assert.ok(
    !night.shots.some((s) => s.actors?.some((a) => a.motion === "cup_hands")),
  );
  assert.deepEqual(night.shots.at(-1).actors, night.shots[0].actors);
  assert.ok(night.shots.at(-1).matchHook);
  assert.match(night.narration, /^Why does .*and that is exactly…$/);
});
test("motion, narration and spawn contracts are checked before loading assets", () => {
  const make = () => structuredClone(demo);
  for (const mutate of [
    (s) => delete s.cameraMotion,
    (s) => (s.cameraMotion = "tripod"),
    (s) => (s.events = [{ type: "unknown" }]),
    (s) => (s.captions[0] = { at: 0, text: "early" }),
  ]) {
    const e = make();
    mutate(e.shots[0]);
    assert.throws(() => validate(e), /shot 1/);
  }
  const arrow = {
    id: "event",
    type: "spawn_prop",
    asset: "3D_Arrow",
    time: 0.5,
    travel: 1,
    from: [0, 0, 0],
    to: [1, 0, 0],
    sfx: "pop",
  };
  for (const bad of [
    { travel: 5 },
    { time: -1 },
    { to: [0, 0, 0] },
    { sfx: "silent" },
    { asset: "Floating_Icon", icon: "Mars" },
    { id: demo.shots[0].actors[0].id },
  ]) {
    const e = make();
    e.shots[0].events = [{ ...arrow, ...bad }];
    assert.throws(() => validate(e), /shot 1/);
  }
  for (const bad of [
    { narration: "episodes/test.wav" },
    { voiceover: "../escape.wav" },
    { speechRate: 0 },
  ])
    assert.throws(() => validate({ ...make(), ...bad }), /episode:/);
});
