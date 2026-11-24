import * as T from "three";

// Paint one carriage and repeat it in physical space. Window silhouettes, frames,
// door seams and station typography remain readable at the PSX render resolution.
function paint(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"));
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map });
}
const ink = (c) => new T.MeshBasicMaterial({ color: c });
function plane(g, w, h, m, x, y, z) {
  const o = new T.Mesh(new T.PlaneGeometry(w, h), m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
function box(g, w, h, d, m, x, y, z) {
  const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
function carSkin(ctx) {
  const rect = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  rect(0, 0, 640, 192, "#abbbbf");
  rect(0, 11, 640, 3, "#e9ede8");
  rect(0, 29, 640, 83, "#26394e");
  rect(0, 117, 640, 12, "#d54535");
  rect(0, 131, 640, 3, "#ffd485");
  for (let i = 0; i < 6; i++) {
    const x = 11 + i * 105;
    rect(x, 34, 90, 67, "#111f30");
    rect(x + 4, 38, 81, 57, "#ffcd8e");
    rect(x + 4, 38, 81, 7, "#fff2c6");
    rect(x + 7, 82, 78, 12, "#e29d72");
    rect(x + 12, 42, 3, 43, "#8a857e");
    const k = x + 42 + (i % 2) * 14;
    ctx.fillStyle = i % 2 ? "#765a5d" : "#434358";
    ctx.beginPath();
    ctx.ellipse(k, 66, 8, 10, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(k, 93, 16, 20, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
    rect(k - 4, 73, 8, 8, ctx.fillStyle);
    if (i === 1 || i === 4) {
      rect(x - 4, 20, 2, 153, "#526778");
      rect(x + 92, 20, 2, 153, "#526778");
      rect(x + 45, 20, 3, 154, "#526778");
    }
  }
  for (let j = 0; j < 5; j++) rect(0, 141 + j * 7, 640, 2, "#738993");
  rect(0, 183, 640, 9, "#304458");
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#23384d";
  ctx.fillText("M · 304", 8, 158);
}
export function carWindow(group) {
  const material = paint(640, 192, carSkin);
  const panel = plane(group, 3.06, 1.2, material, 0, 0.6, 0);
  const uv = panel.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, 0.24 + 0.33 * uv.getX(i), 0.4 + 0.5 * uv.getY(i));
}
export function platformThree(s) {
  const slate = ink(0x273b4b),
    ribs = ink(0x51616a),
    dark = ink(0x152331),
    gold = ink(0xedab57),
    glow = ink(0xffedd0);
  box(s, 44, 0.25, 5, slate, 0, -0.13, 1.2);
  box(s, 44, 0.08, 0.19, gold, 0, -0.005, -1.13);
  box(s, 44, 5, 0.15, ribs, 0, 1.3, -5.7);
  box(s, 44, 0.16, 8, dark, 0, 3.8, -0.4);
  for (let i = -5; i <= 5; i++) {
    box(s, 0.12, 0.32, 7, ribs, i * 3.2, 3.58, -0.4);
    box(s, 1.7, 0.09, 0.15, glow, i * 3.2, 3.31, 0.1);
    box(s, 0.1, 4.4, 0.15, dark, i * 3.2, 1.5, -5.55);
    box(s, 0.044, 0.016, 4.8, dark, i * 3.2, 0.012, 1.28);
  }
  const sign = paint(512, 96, (c) => {
    c.fillStyle = "#182630";
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = "#ffbf6a";
    c.fillRect(0, 0, 88, 96);
    c.fillStyle = "#172a3a";
    c.font = "bold 76px sans-serif";
    c.fillText("3", 21, 77);
    c.fillStyle = "#f8edda";
    c.font = "bold 42px sans-serif";
    c.fillText("NORTHBOUND", 103, 52);
    c.font = "19px monospace";
    c.fillStyle = "#84d9cc";
    c.fillText("M LINE    /    DOWNTOWN   →", 106, 80);
  });
  for (const x of [-4.3, 0, 4.3]) {
    box(s, 2.7, 0.53, 0.11, dark, x, 2.7, -0.93);
    plane(s, 2.66, 0.49, sign, x, 2.7, -0.86);
    for (const dx of [-0.93, 0.93])
      box(s, 0.025, 0.94, 0.03, ribs, x + dx, 3.23, -0.93);
  }
  const skin = paint(640, 192, carSkin),
    train = new T.Group();
  s.add(train);
  for (let i = -2; i < 3; i++) {
    const x = i * 7.14;
    box(train, 7.03, 2.43, 1.87, ribs, x, 1.16, -3.08);
    box(train, 6.89, 0.17, 1.68, slate, x, 2.44, -3.08);
    plane(train, 7.03, 2.43, skin, x, 1.16, -2.135);
    box(train, 6.81, 0.18, 0.17, dark, x, -0.11, -2.14);
  }
  // Elongated twin highlights slide over the platform's polished safety strip.
  const smears = [];
  for (let i = -3; i <= 3; i++) {
    smears.push(box(s, 0.66, 0.006, 0.11, ink(0x82796f), i, 0.014, -0.9));
  }
  const rim = new T.PointLight(0xff9e69, 5, 5);
  rim.position.set(-1.5, 1.9, -0.8);
  s.add(rim);
  return (t, clock = t) => {
    train.position.x = (clock * 2.8) % 7.14;
    smears.forEach((o, i) => {
      o.position.x = (i - 3) * 1.19 + ((clock * 2.8) % 1.19);
    });
  };
}

// View down the optical axis: ridged iris, incoming packets, illuminated
// retinal mosaic at the back. Clock-driven travel rather than a flat diagram.
export function insideEye(s) {
  const iris = new T.Group();
  s.add(iris);
  const cyl = new T.Mesh(
    new T.CylinderGeometry(1.02, 1.25, 8, 32, 1, true),
    new T.MeshBasicMaterial({ color: 0x392841, side: T.DoubleSide }),
  );
  cyl.rotation.x = Math.PI / 2;
  cyl.position.set(0, 1.5, -2);
  s.add(cyl);
  for (let k = 0; k < 16; k++) {
    const m = new T.Mesh(
      new T.TorusGeometry(0.96 + 0.03 * Math.cos(k), 0.045, 5, 36),
      ink(k % 4 === 0 ? 0xf78e88 : 0x945477),
    );
    m.position.set(0, 1.5, 1.1 - k * 0.38);
    iris.add(m);
  }
  const strand = new T.BufferGeometry(),
    v = [];
  for (let j = 0; j < 38; j++) {
    for (let i = 0; i < 14; i++) {
      for (const k of [i, i + 1]) {
        const a = j * 0.165 + k * 0.031;
        v.push(0.94 * Math.sin(a), 1.5 + 0.94 * Math.cos(a), 1.3 - k * 0.43);
      }
    }
  }
  strand.setAttribute("position", new T.Float32BufferAttribute(v, 3));
  s.add(
    new T.LineSegments(strand, new T.LineBasicMaterial({ color: 0xbd768d })),
  );
  // Each receptor samples the inverted carriage image. One instanced draw
  // carries the whole changing mosaic, rather than a mesh per receptor.
  const card = document.createElement("canvas");
  card.width = 640;
  card.height = 192;
  const ctx = card.getContext("2d");
  carSkin(ctx);
  const pixels = ctx.getImageData(0, 0, 640, 192).data,
    cells = [];
  for (let j = -13; j <= 13; j++)
    for (let i = -13; i <= 13; i++) {
      const x = i * 0.068 + (j % 2) * 0.033,
        y = j * 0.066;
      if (x * x + y * y < 0.86) cells.push([x, y]);
    }
  const mosaic = new T.InstancedMesh(
    new T.CircleGeometry(0.039, 6),
    ink(0xffffff),
    cells.length,
  );
  const mx = new T.Matrix4(),
    color = new T.Color();
  cells.forEach(([x, y], i) =>
    mosaic.setMatrixAt(i, mx.makeTranslation(x, 1.5 + y, -4.75)),
  );
  s.add(mosaic);
  const photons = Array.from({ length: 12 }, () => {
    const o = new T.Mesh(new T.OctahedronGeometry(0.045), ink(0xffed90));
    s.add(o);
    return o;
  });
  return (t) => {
    for (let i = 0; i < photons.length; i++) {
      const u = (t * 0.81 + i / 12) % 1,
        a = i * 2.4;
      photons[i].position.set(
        (1 - u) * 0.64 * Math.cos(a),
        1.5 + (1 - u) * 0.64 * Math.sin(a),
        1.25 - 6 * u,
      );
    }
    cells.forEach(([x, y], i) => {
      const u = Math.floor(140 - x * 84 + t * 38) % 640,
        v = Math.max(0, Math.min(191, Math.floor(74 + y * 67)));
      const off = (v * 640 + u) * 4;
      color.setRGB(
        pixels[off] / 255,
        pixels[off + 1] / 255,
        pixels[off + 2] / 255,
        T.SRGBColorSpace,
      );
      mosaic.setColorAt(i, color);
    });
    mosaic.instanceColor.needsUpdate = true;
  };
}
