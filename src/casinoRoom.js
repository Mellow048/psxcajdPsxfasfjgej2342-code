// World Y=.90 is the betting surface shared by the set and its mounted props.
import * as T from "three";
import { canvasFace, SURFACE_GAP } from "./uiDirector.js";
export const FELT_Y = 0.9;
export function casinoRoom(scene) {
  const mat = (c) => new T.MeshLambertMaterial({ color: c, flatShading: true }),
    glow = (c) => new T.MeshBasicMaterial({ color: c });
  const add = (geo, m, x, y, z) => {
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    scene.add(o);
    return o;
  };
  const box = (x, y, z, w, h, d, m) =>
    add(new T.BoxGeometry(w, h, d), m, x, y, z);
  const wood = mat(0x653935),
    rail = mat(0x332025),
    gold = mat(0xc89755),
    wine = mat(0x702b47),
    amber = glow(0xffbc65),
    pink = glow(0xee6b7d);
  box(0, -0.1, 1, 18, 0.2, 20, wine);
  box(0, 2.4, -4.2, 15, 5, 0.3, wood);
  box(-4.3, 2.4, 0, 0.2, 5, 9, wine);
  box(4.3, 2.4, 0, 0.2, 5, 9, wine);
  for (let i = -5; i <= 5; i++) box(i * 0.75, 2, -4, 0.055, 4, 0.12, gold);
  for (const y of [0.7, 1, 3]) box(0, y, -3.96, 9, 0.04, 0.1, amber);
  for (const x of [-3.2, -2.1, 1.9, 3]) {
    box(x, 0.74, -2.9, 0.85, 1.48, 0.65, rail);
    box(x, 1.7, -3, 0.87, 0.91, 0.43, gold);
    box(x, 1.7, -2.76, 0.78, 0.76, 0.03, wine);
    for (let i = -1; i <= 1; i++) {
      box(x + i * 0.21, 1.7, -2.73, 0.18, 0.29, 0.025, mat(0xffe7b4));
      box(x + i * 0.21, 1.7, -2.7, 0.1, 0.12, 0.02, pink);
    }
    box(x, 2.25, -3, 0.81, 0.12, 0.38, amber);
  }
  const face = canvasFace(768, 448, (c, w, h) => {
    c.fillStyle = "#115647";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#c6b589";
    c.lineWidth = 3;
    c.strokeRect(15, 15, w - 30, h - 30);
    c.font = "bold 22px monospace";
    c.fillStyle = "#f5dca4";
    c.textAlign = "center";
    c.fillText("◆   NOIR CASINO   ◆", 384, 55);
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18];
    for (let i = 0; i < 18; i++) {
      let x = 91 + (i % 9) * 65,
        y = 77 + Math.floor(i / 9) * 62;
      c.fillStyle = reds.includes(i + 1) ? "#af3744" : "#212d35";
      c.fillRect(x, y, 61, 58);
      c.fillStyle = "#fff1c8";
      c.fillText(i + 1, x + 30, y + 37);
    }
    for (let i = 0; i < 4; i++) {
      const x = 51 + i * 167;
      c.strokeRect(x, 243, 158, 87);
      c.fillStyle = i === 1 ? "#dc4b56" : "#efe0ae";
      c.fillText(["EVEN", "◆ RED", "BLACK", "ODD"][i], x + 79, 296);
    }
    c.font = "16px monospace";
    c.fillStyle = "#d9cda3";
    c.fillText("SINGLE ZERO     /     TABLE 07", 384, 391);
  });
  box(0, 0.75, 0, 4.18, 0.22, 2.65, wood);
  box(0, 0.835, 0, 4.22, 0.09, 2.69, rail);
  box(0, FELT_Y - SURFACE_GAP - 0.01, 0, 4, 0.02, 2.45, mat(0x115647));
  const top = add(new T.PlaneGeometry(4, 2.45, 16, 10), face, 0, FELT_Y, 0);
  top.rotation.x = -Math.PI / 2;
  for (const x of [-1.64, 1.64])
    for (const z of [-0.93, 0.93]) box(x, 0.35, z, 0.2, 0.7, 0.2, gold);
  for (const x of [-1.2, 0, 1.2]) {
    box(x, 0.65, -1.7, 0.65, 0.12, 0.6, wine);
    box(x, 1.14, -2, 0.63, 0.88, 0.12, wine);
    box(x, 0.31, -1.7, 0.1, 0.62, 0.1, gold);
    const lamp = add(new T.ConeGeometry(0.41, 0.34, 10), gold, x, 2.8, -1.04);
    add(
      new T.CylinderGeometry(0.37, 0.37, 0.028, 10),
      amber,
      x,
      lamp.position.y - 0.17,
      -1.04,
    );
  }
  // The wager sits on RED; the ball settles into a black pocket. All time
  // sampling is absolute, including when the loop cuts back to the wheel.
  const x = -0.86,
    z = -0.35,
    r = 0.47;
  add(
    new T.CylinderGeometry(r + 0.035, r + 0.055, 0.11, 40),
    wood,
    x,
    FELT_Y + 0.055,
    z,
  );
  const rotor = add(
    new T.CircleGeometry(r, 64),
    canvasFace(320, 320, (c) => {
      c.translate(160, 160);
      c.fillStyle = "#a68151";
      c.fillRect(-160, -160, 320, 320);
      for (let i = 0; i < 37; i++) {
        const a = (i * 2 * Math.PI) / 37,
          b = ((i + 1) * 2 * Math.PI) / 37;
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, 148, a, b);
        c.closePath();
        c.fillStyle = i === 0 ? "#14705a" : i % 2 ? "#bc3d46" : "#27212d";
        c.fill();
        c.strokeStyle = "#d3ab79";
        c.lineWidth = 1;
        c.stroke();
      }
      for (const [rad, color] of [
        [103, "#dcb16e"],
        [96, "#764532"],
        [58, "#af744b"],
        [27, "#d2a66c"],
      ]) {
        c.fillStyle = color;
        c.beginPath();
        c.arc(0, 0, rad, 0, 7);
        c.fill();
      }
    }),
    x,
    FELT_Y + 0.11 + SURFACE_GAP,
    z,
  );
  rotor.rotation.x = -Math.PI / 2;
  add(
    new T.CylinderGeometry(0.042, 0.082, 0.13, 12),
    gold,
    x,
    FELT_Y + 0.19,
    z,
  );
  const ball = add(
    new T.SphereGeometry(0.028, 10, 8),
    glow(0xfff1c7),
    x,
    rotor.position.y + 0.028,
    z,
  );
  add(
    new T.CylinderGeometry(0.1, 0.1, 0.032, 16),
    mat(0xca4742),
    -0.44,
    FELT_Y + 0.016,
    0.31,
  );
  const wager = add(
    new T.CircleGeometry(0.093, 16),
    canvasFace(96, 96, (c) => {
      c.fillStyle = "#ae3841";
      c.fillRect(0, 0, 96, 96);
      c.strokeStyle = "#ffe5b1";
      c.lineWidth = 5;
      c.setLineDash([10, 7]);
      c.beginPath();
      c.arc(48, 48, 42, 0, 7);
      c.stroke();
      c.fillStyle = "#fff1cc";
      c.textAlign = "center";
      c.font = "bold 36px sans-serif";
      c.fillText("$10", 48, 60);
    }),
    -0.44,
    FELT_Y + 0.032 + SURFACE_GAP,
    0.31,
  );
  wager.rotation.x = -Math.PI / 2;
  return (t) => {
    const u = Math.min(1, t / 2.28),
      spin = 6 * (1 - u) ** 2;
    rotor.rotation.z = spin;
    const a = 2 * Math.PI * (2.5 / 37) + spin * 2,
      radius = r * (0.77 + 0.1 * (1 - u));
    ball.position.x = x + radius * Math.cos(a);
    ball.position.z = z + radius * Math.sin(a);
  };
}
