import { platformThree, insideEye, carWindow } from "./platformThree.js";
import { casinoRoom } from "./casinoRoom.js";
import * as T from "three";
import { blizzard } from "./Evolutionary_Explainer/blizzard.js";
import { SCENE_PRESETS } from "./config.js";
const basic = (c) => new T.MeshBasicMaterial({ color: c }),
  lit = (c) => new T.MeshLambertMaterial({ color: c, flatShading: true });
function mesh(parent, geo, mat, x, y, z) {
  const o = new T.Mesh(geo, mat);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
const box = (p, w, h, d, m, x, y, z) =>
  mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z);
function rod(p, a, b, r, m, r2 = r) {
  const A = new T.Vector3(...a),
    B = new T.Vector3(...b),
    v = B.clone().sub(A);
  const o = mesh(p, new T.CylinderGeometry(r2, r, v.length(), 5), m, 0, 0, 0);
  o.position.copy(A).lerp(B, 0.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
  return o;
}
function rand(seed) {
  return () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
}
export function makeProp(key, text = "NOTE") {
  const p = new T.Group();
  const dark = () => lit(0x24233b);
  if (key === "car_window") carWindow(p);
  else if (key === "sheet") {
    const points = [],
      idx = [],
      uv = [];
    const rings = [
        [0.04, 0.66],
        [0.23, 0.68],
        [0.68, 0.49],
        [1.12, 0.44],
        [1.43, 0.41],
        [1.58, 0.28],
        [1.63, 0.01],
      ],
      n = 16;
    for (let j = 0; j < rings.length; j++)
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2,
          [y, r] = rings[j],
          fold = Math.cos(a * 6 + j * 0.28),
          amp = (1 - j / 7) * 0.1;
        points.push(
          (r + amp * fold) * Math.sin(a) + 0.09 * (1 - j / 7) ** 2,
          y + (j < 2 ? 0.12 * Math.cos(a * 5 + 0.4) : 0),
          (r + amp * fold) * Math.cos(a) * 0.82,
        );
        uv.push(i / n, j / 6);
        if (j && i) {
          const b = j * (n + 1) + i;
          idx.push(b - n - 2, b - n - 1, b, b - n - 2, b, b - 1);
        }
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const fabric = lit(0xecf4e9);
    const texels = new Uint8Array(32 * 32 * 4);
    for (let i = 0; i < 1024; i++) {
      const n = ((i * 53) ^ ((i >> 3) * 71)) % 19;
      texels.set([234 + n, 235 + n, 232 + n, 255], i * 4);
    }
    fabric.map = new T.DataTexture(texels, 32, 32);
    fabric.map.colorSpace = T.SRGBColorSpace;
    fabric.map.needsUpdate = true;
    fabric.side = T.DoubleSide;
    mesh(p, g, fabric, 0, 0, 0);
    for (const x of [-0.15, 0.15]) {
      const e = mesh(
        p,
        new T.SphereGeometry(1, 8, 5),
        basic(0x24273c),
        x,
        1.25,
        0.324,
      );
      e.scale.set(0.08, 0.146, 0.045);
      e.rotation.y = x * 0.9;
    }
    const mouth = mesh(
      p,
      new T.SphereGeometry(1, 7, 5),
      basic(0x414054),
      0.005,
      1.0,
      0.4,
    );
    mouth.scale.set(0.051, 0.068, 0.032);
  } else if (key === "pane") {
    const m = new T.MeshBasicMaterial({
      color: 0x9ef4f0,
      transparent: true,
      opacity: 0.3,
      side: T.DoubleSide,
      depthWrite: false,
    });
    box(p, 1.8, 1.6, 0.025, m, 0, 0.82, 0);
    for (const x of [-0.92, 0.92])
      box(p, 0.055, 1.68, 0.08, lit(0x77b8bd), x, 0.82, 0);
    for (const y of [0, 1.64]) box(p, 1.9, 0.045, 0.08, lit(0xd0eff1), 0, y, 0);
    for (const x of [-0.45, 0.52])
      rod(p, [x, 0.6, 0.03], [x + 0.22, 1.15, 0.03], 0.012, basic(0xd3f8ec));
  } else if (key === "lamp") {
    box(p, 0.74, 0.14, 0.64, dark(), 0, 0.07, 0);
    rod(p, [0, 0.12, 0], [0, 1.05, 0], 0.05, lit(0xadb6ae));
    const head = mesh(
      p,
      new T.CylinderGeometry(0.34, 0.23, 0.43, 10),
      lit(0x656078),
      0,
      1.12,
      0,
    );
    head.rotation.x = Math.PI / 2;
    mesh(p, new T.CircleGeometry(0.29, 10), basic(0xffda93), 0, 1.12, 0.223);
  } else if (key === "section_eye") {
    // Sagittal teaching model, open to camera: lens on left, retina on right.
    const shell = mesh(
      p,
      new T.SphereGeometry(0.62, 32, 16, 0, Math.PI),
      lit(0x243950),
      0,
      0.65,
      -0.04,
    );
    shell.rotation.y = Math.PI;
    shell.material.side = T.DoubleSide;
    mesh(p, new T.TorusGeometry(0.62, 0.055, 8, 48), lit(0xf7dfae), 0, 0.65, 0);
    const lens = mesh(
      p,
      new T.SphereGeometry(1, 12, 12),
      lit(0x78ead9),
      -0.4,
      0.65,
      0.045,
    );
    lens.scale.set(0.082, 0.245, 0.08);
    for (let j = -8; j <= 8; j++) {
      const a = j * 0.1;
      const cell = mesh(
        p,
        new T.CapsuleGeometry(0.03, 0.055, 3, 6),
        lit(j % 2 ? 0xf28d77 : 0xfad79e),
        0.55 * Math.cos(a),
        0.65 + 0.55 * Math.sin(a),
        0.045,
      );
      cell.rotation.z = a - Math.PI / 2;
    }
  } else if (key === "eye") {
    const e = mesh(
      p,
      new T.SphereGeometry(0.6, 14, 10),
      lit(0xf3e6cf),
      0,
      0.62,
      0,
    );
    e.scale.z = 0.85;
    mesh(p, new T.CircleGeometry(0.26, 12), basic(0x7fc9bc), 0, 0.63, 0.49);
    mesh(p, new T.CircleGeometry(0.13, 10), basic(0x212337), 0, 0.63, 0.5);
  } else if (key === "arrow") {
    rod(p, [-0.62, 0.5, 0], [0.26, 0.5, 0], 0.065, basic(0xc8f694));
    rod(p, [0.2, 0.5, 0], [0.67, 0.5, 0], 0.23, basic(0xc8f694), 0);
  } else if (key === "label") {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2a2638";
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = "#cfb9fb";
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 250, 58);
    ctx.fillStyle = "#ecffe2";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 33, 232);
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    mesh(
      p,
      new T.PlaneGeometry(1.6, 0.4),
      new T.MeshBasicMaterial({ map, side: T.DoubleSide }),
      0,
      0.2,
      0,
    );
  } else if (key === "rays") {
    for (let i = 0; i < 3; i++) {
      const x = -0.7 + i * 0.19;
      rod(p, [x, 0.1, 0], [0.15, 0.83, 0], 0.018, basic(0xffd689));
      rod(p, [0.15, 0.83, 0], [x, 1.55, 0], 0.018, basic(0xb7eee3));
    }
  }
  return p;
}
function cemetery(s) {
  const r = rand(451),
    stone = lit(0x818494),
    edge = lit(0x555466),
    iron = lit(0x282b3b),
    earth = lit(0x49475b);
  // Painted dusk bands rendered as geometry, not a background photograph.
  const bg = new T.BufferGeometry();
  const pts = [],
    colors = [],
    indices = [];
  const shades = [
    [-5, 0xdeaaa4],
    [1, 0xc492ad],
    [4, 0x967cae],
    [8, 0x706493],
    [19, 0x444769],
  ];
  for (const [y, c] of shades) {
    pts.push(-40, y, -12, 40, y, -12);
    for (let j = 0; j < 2; j++) colors.push(...new T.Color(c).toArray());
  }
  for (let j = 0; j < 4; j++) {
    let i = j * 2;
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }
  bg.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
  bg.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  bg.setIndex(indices);
  mesh(
    s,
    bg,
    new T.MeshBasicMaterial({ vertexColors: true, fog: false }),
    0,
    0,
    0,
  );
  const lunar = new T.Group();
  s.add(lunar);
  lunar.position.set(1.1, 3.93, -6.5);
  mesh(
    lunar,
    new T.CircleGeometry(0.94, 40),
    new T.MeshBasicMaterial({ color: 0xffdfb9, fog: false }),
    0,
    0,
    0,
  );
  const crater = basic(0xf0c5ab);
  for (const [x, y, r] of [
    [-0.56, 0.51, 0.2],
    [-0.73, 0.26, 0.1],
    [0.44, -0.6, 0.26],
    [0.69, -0.33, 0.12],
    [0.12, 0.68, 0.09],
  ])
    mesh(lunar, new T.CircleGeometry(r, 7), crater, x, y, 0.015);
  for (let i = 0; i < 61; i++) {
    const x = (r() - 0.5) * 22,
      y = 1 + r() * 8;
    mesh(
      s,
      new T.CircleGeometry(0.012 + 0.023 * r(), 4),
      basic(0xffebd7),
      x,
      y,
      -8,
    );
  }
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 22; i++) {
      const x = (i - 10) * 1.25,
        y = 0.35 + r() * 0.95;
      mesh(
        s,
        new T.ConeGeometry(1.8 + r(), y * 2, 5),
        basic(j ? 0x655e7b : 0x8c7693),
        x,
        0.15,
        -6 + j * 2,
      );
    }
  }
  box(s, 40, 0.22, 25, earth, 0, -0.15, -3);
  const walk = lit(0x716877);
  for (let i = 0; i < 23; i++) {
    let o = box(
      s,
      0.58 + r() * 0.3,
      0.05,
      0.25 + r() * 0.15,
      walk,
      ((i % 3) - 1) * 0.65 + (r() - 0.5) * 0.12,
      -0.01,
      2 - Math.floor(i / 3) * 0.45,
    );
    o.rotation.y = r() * 0.12;
  }
  for (let i = -16; i <= 16; i++) {
    const x = i * 0.31;
    rod(s, [x, 0, -2.4], [x, 0.88, -2.4], 0.026, iron);
    mesh(s, new T.ConeGeometry(0.072, 0.18, 4), iron, x, 0.96, -2.4);
  }
  for (const y of [0.24, 0.72]) box(s, 11, 0.05, 0.05, iron, 0, y, -2.4);
  for (const [x, z, h] of [
    [-1.25, -0.45, 0.85],
    [1.04, -1, 0.86],
    [-2.25, -1.55, 1.1],
    [2.48, -2, 0.7],
    [-1.8, 1, 0.5],
  ]) {
    const q = new T.Group();
    s.add(q);
    q.position.set(x, 0, z);
    q.rotation.y = x * 0.13;
    q.rotation.z = x * 0.024;
    box(q, 0.62, 0.12, 0.42, edge, 0, 0.06, 0);
    box(q, 0.48, h, 0.22, stone, 0, h / 2 + 0.1, 0);
    const o = mesh(
      q,
      new T.CylinderGeometry(0.24, 0.24, 0.22, 10),
      stone,
      0,
      h + 0.1,
      0,
    );
    o.rotation.x = Math.PI / 2;
    box(q, 0.043, 0.23, 0.015, edge, 0, h * 0.8, 0.12);
    box(q, 0.16, 0.04, 0.018, edge, 0, h * 0.87, 0.12);
  }
  for (const [x, z, flip] of [
    [-1.68, -2.1, 1],
    [2.9, -3, -1],
    [-4, -4, 1],
  ]) {
    const q = new T.Group();
    s.add(q);
    q.position.set(x, 0, z);
    q.scale.x = flip;
    const wood = lit(0x3e394e);
    rod(q, [0, 0, 0], [-0.16, 1.6, 0], 0.16, wood, 0.095);
    rod(q, [-0.16, 1.6, 0], [0.14, 2.7, 0], 0.1, wood, 0.05);
    for (const [a, b, v, w] of [
      [[-0.1, 1.3, 0], [-0.8, 2.2, 0.1], 0.085, 0.045],
      [[-0.8, 2.2, 0.1], [-0.77, 2.7, 0.1], 0.05, 0],
      [[-0.8, 2.2, 0.1], [-1.2, 2.4, 0.1], 0.04, 0],
      [[0.12, 2.5, 0], [0.55, 3.1, 0], 0.05, 0],
      [[0.06, 2.3, 0], [-0.22, 3.18, 0.2], 0.05, 0],
      [[-0.14, 1.6, 0], [0.65, 2.1, -0.1], 0.08, 0.035],
      [[0.65, 2.1, -0.1], [0.87, 2.62, -0.1], 0.04, 0],
    ])
      rod(q, a, b, v, wood, w);
  }
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 9,
      z = r() * 6 - 4;
    if (Math.abs(x) < 0.95) continue;
    mesh(
      s,
      new T.ConeGeometry(0.07, 0.16 + r() * 0.21, 3),
      lit(i % 3 ? 0x555365 : 0x787082),
      x,
      0.08,
      z,
    );
  }
}
// Reusable demonstration set: a real opening, a skyline and a fixed glass plane
// at Z=0. The wall masks the virtual actor staged behind the glass.
function windowRoom(s, night) {
  const trim = lit(night ? 0x735649 : 0xb98d65),
    wall = lit(night ? 0x4a4258 : 0xb9a899);
  box(s, 20, 0.12, 16, lit(0x59505b), 0, -0.07, 4);
  for (const x of [-5.65, 5.65]) box(s, 8.7, 7, 0.18, wall, x, 2.8, 0);
  box(s, 2.65, 2, 0.18, wall, 0, -0.81, 0);
  box(s, 2.65, 4, 0.18, wall, 0, 4.52, 0);
  for (const x of [-1.32, 1.32]) box(s, 0.095, 2.43, 0.2, trim, x, 1.36, 0.04);
  for (const y of [0.19, 2.52]) box(s, 2.75, 0.11, 0.25, trim, 0, y, 0.04);
  box(s, 0.04, 2.28, 0.06, trim, 0.57, 1.36, 0);
  const glass = new T.MeshBasicMaterial({
    color: night ? 0x819ab8 : 0xc7e8ff,
    opacity: night ? 0.055 : 0.13,
    transparent: true,
    depthWrite: false,
  });
  box(s, 2.6, 2.3, 0.01, glass, 0, 1.36, 0);
  const r = rand(113);
  for (let i = -9; i < 10; i++) {
    const h = 0.65 + r() * 2.1;
    box(
      s,
      0.73,
      h,
      0.6,
      basic(night ? 0x27324a : 0x7991a0),
      i * 0.8,
      h / 2,
      -4.7,
    );
    for (let j = 0.3; j < h - 0.08; j += 0.36)
      for (const x of [-0.16, 0.16])
        if (r() > 0.25)
          box(
            s,
            0.13,
            0.13,
            0.02,
            basic(night ? 0xe3c490 : 0xc2d8de),
            i * 0.8 + x,
            j,
            -4.38,
          );
  }
  mesh(
    s,
    new T.CircleGeometry(0.35, 16),
    basic(night ? 0xfce8ba : 0xffdb91),
    1.3,
    3.12,
    -6.5,
  );
  if (night) {
    const light = new T.PointLight(0xffc186, 9, 8);
    light.position.set(-1.4, 1.6, 1.6);
    s.add(light);
  }
}
export function stage(name) {
  const s = new T.Scene(),
    p = SCENE_PRESETS[name];
  s.background = new T.Color(p.color);
  s.fog = new T.FogExp2(p.fog, 0.047);
  s.add(new T.HemisphereLight(0xefecff, 0x8986aa, 1.65));
  const key = new T.DirectionalLight(0xffe6c7, 2);
  key.position.set(-3, 6, 3);
  s.add(key);
  let weather = null;
  if (name === "blizzard") weather = blizzard(s);
  else if (name === "platform_three") weather = platformThree(s);
  else if (name === "retina_tunnel") weather = insideEye(s);
  else if (name === "casino_room") weather = casinoRoom(s);
  else if (name === "signal_dark") {
    /* The detector POV has no environmental signal. */
  } else if (p.reflection) windowRoom(s, name === "window_night");
  else if (name === "graveyard") cemetery(s);
  else {
    const back = name === "backstage";
    box(s, 25, 0.16, 24, lit(back ? 0x50374c : 0x2b3546), 0, -0.1, -3);
    const grid = new T.GridHelper(24, 32, 0x677080, 0x495464);
    grid.position.y = 0.005;
    s.add(grid);
    if (name === "light_gallery") {
      // A fixed registration target: stripes continue behind the disappearing face.
      box(s, 12, 5, 0.2, lit(0x1a464c), 0, 2, -2.2);
      box(s, 3.35, 2.7, 0.11, lit(0xdfaa73), 0, 1.6, -2.04);
      box(s, 3.22, 2.57, 0.08, basic(0x165862), 0, 1.6, -1.94);
      mesh(s, new T.CircleGeometry(0.88, 48), basic(0xf87755), 0, 1.7, -1.88);
      for (let j = 0; j < 9; j++)
        box(s, 3.18, 0.061, 0.016, basic(0xffdb96), 0, 0.62 + 0.245 * j, -1.83);
      for (const x of [-2.4, 2.4]) {
        box(s, 0.32, 4, 0.28, lit(0x102d3d), x, 1.95, -1.85);
        box(s, 0.033, 3.1, 0.03, basic(0xffc581), x, 2, -1.67);
      }
      const plinth = mesh(
        s,
        new T.CylinderGeometry(0.84, 0.91, 0.12, 32),
        lit(0xd49c74),
        0,
        0.05,
        0,
      );
      mesh(
        s,
        new T.CylinderGeometry(0.83, 0.83, 0.03, 32),
        lit(0x325868),
        0,
        plinth.position.y + 0.072,
        0,
      );
    }
    if (name === "house_corner") {
      box(s, 6, 3, 0.15, lit(0x867888), 0, 1.5, -2.5);
      box(s, 0.15, 3, 6, lit(0x786a79), -2.85, 1.5, 0);
      box(s, 6, 0.14, 0.1, lit(0x4b4149), 0, 0.09, -2.38);
    }
    if (back) {
      for (let i = 0; i < 12; i++) {
        const x = (i - 5.5) * 0.55;
        mesh(
          s,
          new T.CylinderGeometry(0.36, 0.44, 5, 6),
          lit(i % 2 ? 0x845064 : 0x663f59),
          x,
          2.5,
          -3,
        );
      }
      box(s, 8, 0.18, 0.4, lit(0xd2a47d), 0, 0.12, -2.45);
    } else if (name === "optics_lab") {
      for (let i = -4; i < 5; i++) {
        box(s, 0.035, 2.5, 0.035, basic(0x62778a), i * 0.75, 1.25, -3.4);
      }
      for (let i = 0; i < 4; i++)
        box(s, 6, 0.025, 0.035, basic(0x475969), 0, i * 0.75, -3.4);
    }
  }
  const spark = new T.BufferGeometry(),
    v = [],
    r = rand(95);
  for (let i = 0; i < 90; i++)
    v.push((r() - 0.5) * 8, r() * 3.8, (r() - 0.5) * 6);
  spark.setAttribute("position", new T.Float32BufferAttribute(v, 3));
  const dust = new T.Points(
    spark,
    new T.PointsMaterial({ color: 0xffe9bb, size: 0.018 }),
  );
  if (name !== "signal_dark") s.add(dust);
  return { scene: s, dust, weather };
}
