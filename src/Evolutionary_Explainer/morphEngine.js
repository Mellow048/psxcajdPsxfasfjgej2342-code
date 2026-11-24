// Bind once; sample absolute shot time. No tweens, accumulated scales or GPU allocations on seek.
export function bindMorphs(root, initial = [], events = []) {
  const fur = [],
    legs = [],
    ears = [],
    pupils = new Set(),
    brows = [];
  let torso, head, tail;
  root.traverse((o) => {
    const i = o.morphTargetDictionary?.inflate_mesh;
    if (i !== undefined) fur.push([o, i]);
    if (o.isBone) {
      if (o.name.startsWith("Leg_")) legs.push([o, o.scale.y]);
      if (o.name.startsWith("Ear_"))
        ears.push([
          o,
          o.scale.y,
          o.rotation.z,
          Math.sign(o.position.x),
          o.position.x,
        ]);
      if (o.name === "Torso") torso = o;
      if (o.name === "Head") head = o;
      if (o.name === "Tail") tail = o;
    }
    if (o.name === "PupilAtlas") pupils.add(o.material.map);
    if (o.name.startsWith("Brow_")) brows.push(o);
  });
  const restY = torso?.position.y ?? 0;
  function weight(name, t) {
    if (initial.includes(name)) return 1;
    let w = 0;
    for (const ev of events) {
      if ((ev.apply_morph ?? ev.texture_swap) !== name) continue;
      const u = Math.min(1, Math.max(0, (t - ev.time) / ev.duration));
      w = Math.max(w, u * u * (3 - 2 * u));
    }
    return w;
  }
  return (t, motion) => {
    const coat = weight("thick_fur", t),
      short = weight("short_legs_flat_ears", t),
      round = weight("round_pupils", t);
    for (const [m, i] of fur) m.morphTargetInfluences[i] = coat;
    for (const [b, y] of legs) b.scale.y = y * (1 - 0.49 * short);
    for (const [b, y, z, side, x] of ears) {
      b.position.x = x + side * (0.07 * coat + 0.055 * short);
      b.scale.y = y * (1 - 0.4 * short);
      b.rotation.z = z - side * 0.82 * short;
    }
    for (const tex of pupils) tex.offset.x = Math.round(round * 8) / 9;
    if (torso) {
      torso.position.y = restY - 0.27 * short + 0.018 * Math.sin(4 * t);
      torso.rotation.z =
        motion === "shiver"
          ? 0.046 * Math.sin(40 * t)
          : 0.012 * Math.sin(3 * t);
    }
    if (head) {
      head.rotation.y = 0.09 * Math.sin(t * 3);
      head.rotation.x =
        motion === "grumpy"
          ? 0.12 + 0.08 * Math.sin(5 * t)
          : 0.025 * Math.cos(4 * t);
    }
    for (const b of brows)
      b.rotation.z =
        Math.sign(b.position.x) *
        (motion === "grumpy" ? 0.48 + 0.11 * Math.sin(6 * t) : 0.19);
    if (tail)
      tail.rotation.y = 0.45 * Math.sin(t * (motion === "grumpy" ? 7 : 3));
  };
}
