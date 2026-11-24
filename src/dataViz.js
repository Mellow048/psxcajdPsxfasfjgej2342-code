import * as T from "three";
import { canvasFace, mountFace } from "./uiDirector.js";
const clamp = (t) => Math.max(0, Math.min(1, t));
function diagram(c, w, h, spec) {
  const { nodes, edges, title } = spec;
  c.fillStyle = "#f1eee2";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#b2bcb2";
  for (let y = 14; y < h; y += 18)
    for (let x = 14; x < w; x += 18) c.fillRect(x, y, 2, 2);
  c.fillStyle = "#264843";
  c.fillRect(0, 0, w, 64);
  c.font = "bold 30px sans-serif";
  c.fillStyle = "#fff3d9";
  c.fillText(title, 18, 42, w - 36);
  const xy = (n) => [60 + n.x * (w - 120), 110 + n.y * (h - 164)],
    byId = new Map(nodes.map((n) => [n.id, xy(n)]));
  for (const [a, b] of edges) {
    const [ax, ay] = byId.get(a),
      [bx, by] = byId.get(b),
      dx = bx - ax,
      dy = by - ay,
      dist = Math.hypot(dx, dy);
    if (!dist) continue;
    // Clip to the target rectangle so arrowheads stay visible outside nodes.
    const k = Math.min(
      50 / Math.max(0.001, Math.abs(dx)),
      21 / Math.max(0.001, Math.abs(dy)),
    );
    const x = bx - k * dx,
      y = by - k * dy;
    c.strokeStyle = c.fillStyle = "#304b47";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(x, y);
    c.stroke();
    c.save();
    c.translate(x, y);
    c.rotate(Math.atan2(dy, dx));
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-13, -7);
    c.lineTo(-13, 7);
    c.fill();
    c.restore();
  }
  for (const n of nodes) {
    const [x, y] = byId.get(n.id);
    c.fillStyle = { win: "#86cb98", loss: "#e99a8c", step: "#d6cb90" }[n.kind];
    c.fillRect(x - 50, y - 21, 100, 42);
    c.strokeStyle = "#304b47";
    c.lineWidth = 3;
    c.strokeRect(x - 50, y - 21, 100, 42);
    c.fillStyle = "#193934";
    c.font = "bold 23px sans-serif";
    c.textAlign = "center";
    c.fillText(n.label, x, y + 8, 92);
  }
}
export function createBoard(ev) {
  const node = new T.Group(),
    board = ev.show_whiteboard,
    w = 2.3,
    h = 1.95;
  const frame = new T.Mesh(
    new T.BoxGeometry(w + 0.08, h + 0.08, 0.08),
    new T.MeshStandardMaterial({ color: 0x486961 }),
  );
  node.add(frame);
  const face = new T.Mesh(
    new T.PlaneGeometry(w, h),
    canvasFace(480, 408, (c, x, y) => diagram(c, x, y, board)),
  );
  mountFace(face, 0.08 / 2);
  node.add(face);
  node.position.fromArray(ev.position ?? [0, 1.45, 0]);
  const target = new T.Vector3(),
    lens = new T.PerspectiveCamera(),
    dest = new T.Vector3();
  return {
    node,
    sample(t, camera) {
      const age = t - ev.time,
        life = ev.duration ?? Infinity;
      node.visible = age >= 0 && age < life;
      if (!node.visible) return;
      const blend = clamp(
          Math.min(age, life - age) / (board.transition ?? 0.42),
        ),
        mix = blend * blend * (3 - 2 * blend);
      target.copy(node.position);
      const d =
        (w * 1.18) /
        (2 * camera.aspect * Math.tan((camera.fov * Math.PI) / 360));
      dest.copy(target);
      dest.z += d + 0.1 * Math.sin(age * 2);
      dest.x += 0.17 * Math.sin(age * 2.1);
      dest.y += 0.12 * Math.cos(age * 2.1);
      lens.position.copy(dest);
      lens.lookAt(target);
      camera.position.lerp(dest, mix);
      camera.quaternion.slerp(lens.quaternion, mix);
    },
  };
}
export function drawGraph(c, ev, t) {
  const age = t - ev.time;
  if (age < 0 || age >= (ev.duration ?? Infinity)) return;
  const g = ev.show_graph,
    u = clamp(age / g.drawTime),
    x = 71,
    y = 248,
    w = 395,
    h = 200,
    lo = Math.min(g.start, g.end),
    hi = Math.max(g.start, g.end);
  const value = (p) =>
    g.lossStreak
      ? g.start -
        ((g.start - g.end) * (2 ** (g.lossStreak * p) - 1)) /
          (2 ** g.lossStreak - 1)
      : Math.exp(Math.log(g.start) + (Math.log(g.end) - Math.log(g.start)) * p);
  const py = (p) => y + h * (1 - (value(p) - lo) / (hi - lo));
  c.save();
  c.fillStyle = "rgba(17,31,39,.94)";
  c.fillRect(40, 133, 460, 371);
  c.strokeStyle = "#688488";
  c.strokeRect(41, 134, 458, 369);
  c.fillStyle = "#b5d6c8";
  c.font = "bold 18px monospace";
  c.fillText(g.label.toUpperCase(), x, 171, w);
  c.fillStyle = "#fff0ce";
  c.font = "bold 40px monospace";
  c.fillText(
    (g.unit ?? "") +
      value(u).toLocaleString("en-US", { maximumFractionDigits: 2 }),
    x,
    219,
    w,
  );
  c.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    c.beginPath();
    c.moveTo(x, y + (i * h) / 4);
    c.lineTo(x + w, y + (i * h) / 4);
    c.stroke();
  }
  const color = g.end < g.start ? "#ff927f" : "#a8eb8c";
  c.strokeStyle = c.fillStyle = color;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(x, py(0));
  for (let i = 1; i <= 64; i++) {
    const p = (u * i) / 64;
    c.lineTo(x + p * w, py(p));
  }
  c.stroke();
  c.beginPath();
  c.arc(x + w * u, py(u), 7, 0, 7);
  c.fill();
  c.font = "16px monospace";
  c.fillStyle = "#bfcebe";
  c.fillText(g.lossStreak ? "OPEN" : "START", x, 478);
  c.textAlign = "right";
  c.fillText(g.lossStreak ? `${g.lossStreak} LOSSES` : "FINISH", x + w, 478);
  c.restore();
}
