import * as T from "three";
import { canvasFace } from "./uiDirector.js";
// One texture, geometry, material and draw call for the entire wall. Matrices
// upload once; only the group transform / visibility changes when sampling.
export function createMass(ev) {
  const { count } = ev.spawn_mass,
    cols = Math.ceil(Math.sqrt(count * 0.64)),
    rows = Math.ceil(count / cols),
    gap = 0.104;
  const geometry = new T.CylinderGeometry(0.049, 0.049, 0.019, 16);
  const bet = ev.spawn_mass.formation === "bet_stack",
    tower = bet || ev.spawn_mass.formation === "table_tower";
  if (!tower) geometry.rotateX(Math.PI / 2);
  const pos = geometry.attributes.position,
    uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++)
    uv.setXY(
      i,
      0.5 + pos.getX(i) * 10,
      0.5 + (tower ? pos.getZ(i) : pos.getY(i)) * 10,
    );
  if (tower) {
    for (let i = 0; i < pos.count; i++)
      if (Math.abs(geometry.attributes.normal.getY(i)) < 0.5) {
        uv.setXY(
          i,
          0.5 + 0.39 * Math.cos(i * 0.81),
          0.5 + 0.39 * Math.sin(i * 0.81),
        );
      }
  }
  const material = canvasFace(64, 64, (c) => {
    c.fillStyle = "#fff2d3";
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = "#a72f48";
    c.beginPath();
    c.arc(32, 32, 31, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 8; i++) {
      c.save();
      c.translate(32, 32);
      c.rotate((i * Math.PI) / 4);
      c.fillStyle = "#fff1d1";
      c.fillRect(-4, 22, 8, 12);
      c.restore();
    }
    c.strokeStyle = "#f2b599";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(32, 32, 19, 0, 7);
    c.stroke();
    c.fillStyle = "#ffe8bb";
    c.fillRect(29, 20, 6, 24);
  });
  const node = new T.InstancedMesh(geometry, material, count),
    matrix = new T.Matrix4();
  for (let i = 0; i < count; i++) {
    const col = i % cols,
      row = Math.floor(i / cols);
    matrix.makeTranslation(
      (col - (cols - 1) / 2) * gap,
      (row - (rows - 1) / 2) * gap,
      0.012 * Math.cos(col * 0.48),
    );
    if (tower) {
      // Nested 5×5, 3×3 and single stacks. The first 800, next 180 and
      // final 20 chips in the demo occupy contiguous layers starting at y=0.
      const n = i < 800 ? 5 : i < 980 ? 3 : 1,
        j = i - (i < 800 ? 0 : i < 980 ? 800 : 980),
        base = i < 800 ? 0 : i < 980 ? 32 : 52;
      matrix.makeTranslation(
        ((j % n) - (n - 1) / 2) * gap,
        (base + Math.floor(j / (n * n)) + 0.5) * 0.019,
        ((Math.floor(j / n) % n) - (n - 1) / 2) * gap,
      );
      if (bet) {
        // Twenty $1 chips per column. Each doubled wager occupies twice the
        // volume and rests on the felt, even when sampled out of sequence.
        const stacks = Math.ceil(count / 20),
          width = Math.ceil(Math.sqrt(stacks)),
          stack = Math.floor(i / 20);
        matrix.makeTranslation(
          ((stack % width) - (width - 1) / 2) * gap,
          ((i % 20) + 0.5) * 0.019,
          (Math.floor(stack / width) - (Math.ceil(stacks / width) - 1) / 2) *
            gap,
        );
      }
      node.setColorAt(
        i,
        new T.Color(Math.floor(j / (n * n)) % 4 === 0 ? 0x9b4359 : 0xffe3bc),
      );
    }
    node.setMatrixAt(i, matrix);
  }
  node.instanceMatrix.needsUpdate = true;
  node.computeBoundingSphere();
  node.position.fromArray(ev.position ?? [0, (rows * gap) / 2, 0]);
  return {
    node,
    sample(t) {
      const age = t - ev.time;
      node.visible = age >= 0 && age < (ev.duration ?? Infinity);
      if (tower) {
        const impact = Math.max(0, age);
        node.scale.set(
          1,
          1 - 0.15 * Math.exp(-12 * impact) * Math.cos(20 * impact),
          1,
        );
        return;
      }
      node.rotation.y = 0.045 * Math.sin(age * 2);
      // All chips exist on the cue frame. Optional pull-back starts close enough
      // to read the markings, then reveals the scale using one parent transform.
      const u = ev.spawn_mass.reveal
        ? Math.max(0, 1 - Math.max(0, age) / ev.spawn_mass.reveal)
        : 0;
      node.scale.setScalar(1 + 7 * u * u);
    },
  };
}
