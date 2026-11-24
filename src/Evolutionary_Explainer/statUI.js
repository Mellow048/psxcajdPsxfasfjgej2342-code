import * as T from "three";
// A world-space studded plate with a raised solid glyph and pixel-font printing.
export function createStatUI(ev) {
  const node = new T.Group(),
    bad = ev.spawn_ui === "red_x",
    title = ev.spawn_ui === "PALLAS CAT text";
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 88;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#28333d";
  ctx.fillRect(0, 0, 256, 88);
  for (let y = 8; y < 88; y += 12)
    for (let x = 8; x < 256; x += 12) {
      ctx.fillStyle = "#172935";
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = "#46525b";
      ctx.fillRect(x, y, 3, 1);
    }
  ctx.fillStyle = "#fff5e4";
  for (const x of [3, 253])
    for (const y of [3, 85]) {
      ctx.fillRect(x, y, x > 128 ? -18 : 18, y > 44 ? -3 : 3);
      ctx.fillRect(x, y, x > 128 ? -3 : 3, y > 44 ? -16 : 16);
    }
  ctx.font = "bold 15px monospace";
  ctx.fillStyle = bad ? "#ffaaa1" : "#b0ffc0";
  ctx.fillText(
    bad ? "BUILD CHECK" : title ? "SPECIES UNLOCK" : "TRAIT SLOT",
    74,
    33,
  );
  ctx.fillStyle = "white";
  ctx.font = "bold 27px monospace";
  ctx.fillText(bad ? "DENIED" : title ? "PALLAS CAT" : "STAT UP", 72, 62);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  const panel = new T.Mesh(
    new T.BoxGeometry(1.58, 0.55, 0.075),
    new T.MeshBasicMaterial({ color: 0x192831 }),
  );
  node.add(panel);
  const face = new T.Mesh(
    new T.PlaneGeometry(1.58, 0.55),
    new T.MeshBasicMaterial({ map }),
  );
  face.position.z = 0.041;
  node.add(face);
  const mat = new T.MeshStandardMaterial({
    color: bad ? 0xff3932 : 0x5bff8f,
    emissive: bad ? 0xff190d : 0x38ed78,
    emissiveIntensity: 0.85,
  });
  function bar(w, h, x, y, a) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, 0.095), mat);
    m.position.set(x, y, 0.084);
    m.rotation.z = a;
    node.add(m);
  }
  if (bad) {
    for (const a of [-0.78, 0.78]) bar(0.082, 0.4, -0.56, 0, a);
  } else {
    bar(0.09, 0.31, -0.56, -0.025, 0);
    bar(0.075, 0.19, -0.606, 0.068, -0.73);
    bar(0.075, 0.19, -0.514, 0.068, 0.73);
  }
  return { node, ev };
}
export function sampleStatUI({ node, ev }, t, camera) {
  const age = t - ev.time;
  node.visible = age >= 0;
  node.position.fromArray(ev.position);
  node.quaternion.copy(camera.quaternion);
  if (age < 0) return;
  node.position.y += 0.035 * Math.sin(4 * age);
  node.scale.setScalar(
    (ev.size ?? 1) * (1 - Math.exp(-11 * age) * Math.cos(age * 19)),
  );
}
