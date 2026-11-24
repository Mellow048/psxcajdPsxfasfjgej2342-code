import { EpisodeRunner } from "../src/episodeRunner.js";
const r = new EpisodeRunner(document.getElementById("testcanvas")),
  report = document.getElementById("result");
const assert = (test, what) => {
  if (!test) throw Error(what);
  report.textContent += "\nPASS " + what;
};
const e = await (await fetch("episodes/ghost-in-the-glass.json")).json();
try {
  await r.load(e);
  r.seek(3.1);
  const image = r.ctx.canvas.toDataURL();
  r.seek(7.5);
  assert(r.index === 3, "cut starts on the exact tick");
  r.seek(3.1);
  assert(
    r.ctx.canvas.toDataURL() === image,
    "revisiting a time reproduces identical pixels",
  );
  const shot = {
    ...e.shots[0],
    stage: "house_corner",
    actors: [
      {
        id: "actor",
        asset: "male.character_01",
        motion: "pointing",
        clip: { asset: "female.character_female_02", name: "mixamo.com" },
      },
    ],
    props: [
      {
        id: "cup",
        asset: "quequis_house.quequis_house_props",
        mesh: "plastic_cups.005",
        height: 0.25,
        position: [0.5, 0.9, 0],
        motion: "float_spin",
      },
      {
        id: "tag",
        asset: "label",
        height: 0.2,
        text: "TEST",
        motion: "pop_in",
      },
    ],
  };
  const sample = { ...e, shots: [shot] };
  await r.load(sample);
  r.seek(0.5);
  assert(
    r.frames[0].items[0].mixer.stats.actions.inUse === 1,
    "retargeted donor clip is playing on target skeleton",
  );
  const track = r.frames[0].items[0].mixer._actions[0].getClip().tracks;
  assert(
    track.length > 0 && track.every((t) => t.name.endsWith(".quaternion")),
    "no root translations from donor",
  );
  const memory = () => JSON.stringify(r.pipeline.renderer.info.memory);
  const before = memory();
  await r.load(sample);
  r.seek(0.5);
  assert(
    memory() === before,
    "GPU geometry and texture counts stable after reload",
  );
  const broken = structuredClone(sample);
  broken.shots[0].props[0].mesh = "not in this pack";
  let failed = false;
  try {
    await r.load(broken);
  } catch {
    failed = true;
  }
  assert(
    failed && r.episode === sample,
    "failed asset load keeps previous episode",
  );
  r.seek(1);
  assert(memory() === before, "failed reload releases staged resources");
  // Deliberately repeat the setup: verify a physical lens cut, not just the shot counter.
  const host = { id: "host", asset: "male.character_01" };
  const repeat = {
    ...e.shots[0],
    actors: [host],
    props: [],
    focus: "host",
    cameraPreset: "macro_closeup",
  };
  await r.load([
    repeat,
    { ...repeat, actors: [{ ...host, motion: "pointing" }] },
  ]);
  r.seek(0);
  const idle = r.frames[0].items[0],
    arm = idle.node.getObjectByName("mixamorigRightArm");
  const initial = arm.quaternion.clone();
  r.seek(0.45);
  assert(
    initial.angleTo(arm.quaternion) > 0.01,
    "omitting action animates the arm, not just the actor root",
  );
  r.seek(repeat.duration - 1 / 60);
  const fov = r.director.camera.fov;
  r.seek(repeat.duration);
  const active = r.frames[1].items[0];
  assert(
    r.index === 1 && r.director.camera.fov !== fov,
    "identical presets still hard-cut on the boundary",
  );
  assert(
    active.mixer !== idle.mixer &&
      active.mixer.time === 0 &&
      active.mixer._actions[0].getClip().name === "pointing",
    "new shot starts a fresh action at time zero",
  );
  assert(
    initial.angleTo(
      active.node.getObjectByName("mixamorigRightArm").quaternion,
    ) > 0.2,
    "pointing changes the joint pose on the very first frame",
  );
  assert(
    r.pipeline.target.width === 180 && r.pipeline.target.height === 320,
    "low-res PSX buffer in use",
  );
  // Check every rig/motion pair with stationary subjects, not just changed pixels.
  const { CAMERAS, CAMERA_MOTIONS } = await import("../src/config.js");
  for (const cameraPreset of CAMERAS)
    for (const cameraMotion of CAMERA_MOTIONS) {
      const s = { ...repeat, cameraPreset, cameraMotion },
        d = r.director,
        target = r.focus.set(0, 1, 0),
        observer = r.frames[0].items[0];
      observer.node.position.set(-0.3, 0, 0.8);
      d.pose(s, 0, target, 0, observer);
      for (let tick = 1; tick <= 120; tick++) {
        let pos = d.camera.position.clone(),
          q = d.camera.quaternion.clone();
        d.pose(s, tick / 60, target, 0, observer);
        if (
          pos.distanceToSquared(d.camera.position) < 1e-12 &&
          q.angleTo(d.camera.quaternion) < 1e-6
        )
          throw Error(
            `Camera stalled: ${cameraPreset}/${cameraMotion} at ${tick}`,
          );
      }
    }
  assert(
    true,
    "every camera setup/motion pair keeps moving on successive ticks",
  );
  const ev = {
    type: "spawn_prop",
    asset: "3D_Arrow",
    id: "beam",
    time: 0.5,
    from: [0, 1, 0],
    to: [1, 1.5, 0],
    travel: 1,
    size: 1,
    sfx: "pop",
  };
  const props = {
    ...repeat,
    focus: "beam",
    events: [
      ev,
      {
        type: "spawn_prop",
        asset: "Floating_Icon",
        id: "symbol",
        time: 0.2,
        position: [0, 1, 0],
        icon: "Moon",
        sfx: "whoosh",
      },
    ],
  };
  await r.load([props]);
  const [beam, icon] = r.frames[0].spawns;
  assert(
    !beam.node.visible && !icon.node.visible,
    "spawns hidden before their timestamp",
  );
  r.seek(0.5);
  assert(
    beam.node.visible && beam.node.scale.x === 0,
    "arrow starts exactly on cue",
  );
  r.seek(0.65);
  assert(
    beam.node.scale.x > 1 && beam.node.position.x > 0,
    "3D arrow overshoots and travels",
  );
  const spin = icon.node.rotation.y;
  r.seek(1.5);
  assert(
    beam.node.scale.x === 1 &&
      beam.node.position.x === 1 &&
      spin !== icon.node.rotation.y,
    "arrow arrives; icon keeps spinning",
  );
  r.seek(0.25);
  assert(
    !beam.node.visible && icon.node.visible,
    "backward scrub reconstructs event visibility",
  );
  const { SfxEngine } = await import("../src/sfxEngine.js");
  const a = new SfxEngine();
  a.ctx = new OfflineAudioContext(1, 48000, 48000);
  const spoken = {
    narration: "Two paths reach your eyes.",
    shots: [{ duration: 3.5, sfx: "click" }],
  };
  await a.prepareBuffers(spoken);
  const buffer = [...a.buffers.values()][0];
  assert(
    buffer.duration > 1 && buffer.duration < 3.5,
    "browser worker returns one decodable speech take",
  );
  spoken.shots[0].captions = [{ time: 0.7, text: "unrelated" }];
  await a.prepareBuffers(spoken);
  assert(
    a.buffers.size === 1 && [...a.buffers.values()][0] === buffer,
    "caption edits do not regenerate voice",
  );
  a.dispose();
  const story = await (await fetch("episodes/escalation-lab.json")).json();
  await r.load(story);
  r.seek(0);
  assert(!r.frames[0].visuals[0].node.visible, "screen hidden before its cue");
  r.seek(0.5);
  const device = r.frames[0].visuals[0].node;
  assert(
    device.visible &&
      device.children.some((o) => o.material.map?.isCanvasTexture),
    "phone face is captured WebGL geometry",
  );
  const screenFace = device.children.find(
    (o) => o.material.map?.isCanvasTexture,
  );
  const boardFace = r.frames[3].boards[0].node.children.find(
    (o) => o.material.map?.isCanvasTexture,
  );
  for (const [face, depth] of [
    [screenFace, 0.075],
    [boardFace, 0.08],
  ])
    assert(
      face.position.z - depth / 2 >= 0.0099 &&
        face.material.depthTest &&
        face.material.polygonOffset,
      "UI is separated along its normal and still respects occluders",
    );
  const wall = r.frames[2].visuals[0].node;
  assert(
    wall.isInstancedMesh && wall.count === 1000 && wall.children.length === 0,
    "one instanced mesh contains all thousand chips",
  );
  for (const seconds of [6.25, 8.52, 12.4]) {
    r.seek(seconds);
    const still = r.ctx.canvas.toDataURL();
    r.seek(0.1);
    r.seek(seconds);
    assert(
      r.ctx.canvas.toDataURL() === still,
      `wall, board or graph reproduces pixels at ${seconds}s`,
    );
  }
  const tv = structuredClone(story.shots[1]);
  const event = tv.events[0];
  event.show_tv = event.show_phone;
  delete event.show_phone;
  event.duration = 0.6;
  await r.load([tv]);
  r.seek(0.35);
  assert(
    r.frames[0].visuals[0].node.visible,
    "TV video call is visible inside its window",
  );
  r.seek(1);
  assert(!r.frames[0].visuals[0].node.visible, "TV exits at the authored time");
  const micro = await (await fetch("episodes/casino_martingale.json")).json();
  await r.load(micro);
  const worldImage = () =>
    r.pipeline.render(r.frames[r.index].scene, r.director.camera).toDataURL();
  r.seek(0);
  const opening = worldImage();
  r.seek(r.duration - 1 / 30);
  assert(
    worldImage() === opening,
    "last encoded 3D wheel frame exactly matches opening (before captions)",
  );
  for (const i of [7, 8, 9]) {
    const f = r.frames[i],
      ev = micro.shots[i].events[0],
      cue = f.start / 60 + ev.time;
    const hand = f.items
      .find((item) => item.def.id === ev.placedBy)
      .node.getObjectByName("mixamorigRightHandIndex3");
    const pos = () => hand.getWorldPosition(f.spawns[0].node.position.clone());
    r.seek(cue - 0.4);
    const from = f.spawns[0].node.position.clone();
    r.seek(cue);
    const pile = f.spawns[0].node;
    assert(
      pile.visible &&
        pile.position.z - from.z > 0.15 &&
        Math.abs(pile.position.y - 0.9) < 0.001,
      "wager slides along the felt",
    );
    assert(
      pos().distanceTo(pile.position) < 0.2,
      "player finger reaches the wager at its cue",
    );
    const still = r.ctx.canvas.toDataURL();
    r.seek(cue + 0.5);
    assert(
      pos().y > pile.position.y + 0.23,
      "hand withdraws after chip release",
    );
    r.seek(cue);
    assert(
      r.ctx.canvas.toDataURL() === still,
      "hand/chip contact reproduces on seek",
    );
  }
  report.textContent += "\nAll checks passed.";
  report.dataset.result = "pass";
} catch (e) {
  report.textContent += "\nFAIL " + e.message;
  report.dataset.result = "fail";
} finally {
  r.dispose();
}
