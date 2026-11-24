import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/schema.js";
import { bindMorphs } from "../src/Evolutionary_Explainer/morphEngine.js";
const ep = JSON.parse(readFileSync("episodes/pallas_cat.json"));
test("seven timed Pallas cat shots and strictly typed upgrade events", () => {
  validate(ep);
  assert.deepEqual(
    ep.shots.map((s) => s.duration),
    [2, 3, 2, 3, 3, 2, 2],
  );
  for (const patch of [
    { duration: 0.49 },
    { duration: 1.1 },
    { target: "other" },
    { sfx: "silent" },
    { apply_morph: "typo" },
  ]) {
    const e = structuredClone(ep);
    Object.assign(e.shots[2].events[0], patch);
    assert.throws(() => validate(e));
  }
  const e = structuredClone(ep);
  delete e.shots[1].events[0].sfx;
  assert.throws(() => validate(e));
});
test("morph sampling restores initial bone, fur and texture state on rewind", () => {
  const mesh = {
      name: "fur",
      morphTargetDictionary: { inflate_mesh: 0 },
      morphTargetInfluences: [0],
    },
    leg = { name: "Leg_1", isBone: true, scale: { y: 2 } },
    map = { offset: { x: 0 } },
    eye = { name: "PupilAtlas", material: { map } };
  const sample = bindMorphs(
    { traverse: (f) => [mesh, leg, eye].forEach(f) },
    [],
    [ep.shots[2].events[0], ep.shots[3].events[0], ep.shots[4].events[0]],
  );
  sample(0.99);
  assert.ok(
    mesh.morphTargetInfluences[0] > 0 && mesh.morphTargetInfluences[0] < 1,
  );
  sample(3);
  assert.equal(mesh.morphTargetInfluences[0], 1);
  assert.equal(leg.scale.y, 1.02);
  assert.equal(map.offset.x, 8 / 9);
  sample(0);
  assert.equal(mesh.morphTargetInfluences[0], 0);
  assert.equal(leg.scale.y, 2);
  assert.equal(map.offset.x, 0);
});
