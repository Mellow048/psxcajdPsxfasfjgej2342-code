import * as T from "three";
export function blizzard(scene) {
  let seed = 873;
  const rand = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const snow = new T.MeshLambertMaterial({
    color: 0xb7ced8,
    flatShading: true,
  });
  const floor = new T.Mesh(new T.BoxGeometry(40, 0.16, 40), snow);
  floor.position.y = -0.09;
  scene.add(floor);
  for (let i = 0; i < 30; i++) {
    const peak = new T.Mesh(new T.ConeGeometry(1 + rand() * 2, 1, 5), snow);
    peak.scale.y = 1 + rand() * 4;
    peak.position.set(
      rand() * 24 - 12,
      peak.scale.y / 2 - 0.35,
      -3 - rand() * 8,
    );
    peak.rotation.y = rand() * 6;
    scene.add(peak);
  }
  const seedPos = Float32Array.from({ length: 280 * 3 }, rand),
    g = new T.BufferGeometry(),
    a = new T.Float32BufferAttribute(seedPos, 3);
  g.setAttribute("position", a);
  const flakes = new T.Points(
    g,
    new T.PointsMaterial({ color: 0xfff9e9, size: 0.035 }),
  );
  flakes.frustumCulled = false;
  scene.add(flakes);
  return (t) => {
    for (let i = 0; i < a.count; i++)
      a.setXYZ(
        i,
        ((seedPos[i * 3] + t * 0.24) % 1) * 9 - 4.5,
        ((seedPos[i * 3 + 1] + 1 - ((t * 0.38) % 1)) % 1) * 5,
        seedPos[i * 3 + 2] * 8 - 5,
      );
    a.needsUpdate = true;
  };
}
