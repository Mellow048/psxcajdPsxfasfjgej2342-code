import * as T from "three";

// World/local normal clearance, not camera-space depth. Keep depth testing so
// other props still occlude screens. The small material bias also protects
// decals at grazing angles after the PSX shader snaps projected vertices.
export const SURFACE_GAP = 0.01;
export function mountFace(mesh, frontZ) {
  mesh.position.z = frontZ + SURFACE_GAP;
  Object.assign(mesh.material, {
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  return mesh;
}
// HTMLCanvasElement UI: local type and vector art only. No DOM overlay or remote
// avatar to disappear from captureStream / the headless encoder.
export function canvasFace(width, height, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map, toneMapped: false });
}
const text = (c, s, x, y, size, color, weight = "bold", max) => {
  c.fillStyle = color;
  c.font = `${weight} ${size}px sans-serif`;
  c.fillText(s, x, y, max);
};
function paintApp(c, w, h, app) {
  const bank = app.app === "bank",
    wide = w > h,
    fg = "#f2f8df",
    mint = "#c3ff75";
  c.fillStyle = bank ? "#123f39" : "#251e43";
  c.fillRect(0, 0, w, h);
  c.fillStyle = bank ? "#184d45" : "#33294d";
  for (let y = 0; y < h; y += 12) c.fillRect(0, y, w, 1);
  text(
    c,
    bank ? "▰   FIELD BANK" : "●   LIVE LINK",
    18,
    34,
    20,
    bank ? mint : "#e9c1fa",
  );
  text(c, "▮▮▮", w - 53, 32, 17, fg);
  c.fillStyle = bank ? "#71b59a" : "#826790";
  c.fillRect(18, 47, w - 36, 2);
  if (bank) {
    const y = wide ? 92 : 150;
    text(c, "AVAILABLE BALANCE", 19, y, 18, "#a9d3bd");
    text(c, app.balance, 16, y + 58, 57, fg, "bold", w - 32);
    c.fillStyle = mint;
    c.fillRect(20, y + 76, 54, 5);
    if (app.debit) text(c, app.debit, 20, y + 119, 29, "#ffac9e");
    text(c, "CASH ACCOUNT   /   01", 20, h - 69, 16, "#a9d3bd");
    c.fillStyle = "#b8ed87";
    c.fillRect(18, h - 48, w - 36, 30);
    text(c, "ACCOUNT OVERVIEW   →", 28, h - 27, 15, "#153c36");
  } else {
    const size = wide ? 73 : 95,
      x = w / 2,
      y = wide ? 119 : 176;
    c.save();
    c.translate(x, y);
    c.scale(size / 100, size / 100);
    const disk = (r, color) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
    };
    disk(99, "#a087b4");
    disk(93, "#705789");
    const poly = (pts, color) => {
      c.fillStyle = color;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
    };
    poly(
      [
        [-76, 69],
        [-44, 39],
        [40, 39],
        [76, 69],
        [48, 85],
        [-46, 85],
      ],
      "#dbaf74",
    );
    poly(
      [
        [-41, -39],
        [-17, -60],
        [26, -50],
        [44, -21],
        [33, 22],
        [4, 57],
        [-24, 34],
        [-40, 5],
      ],
      "#e0aa82",
    );
    poly(
      [
        [-49, -22],
        [-38, -61],
        [2, -73],
        [43, -55],
        [49, -21],
        [18, -34],
        [-17, -32],
      ],
      "#e6d6bc",
    );
    poly(
      [
        [-33, 11],
        [-7, 22],
        [27, 6],
        [15, 42],
        [-4, 62],
        [-22, 38],
      ],
      "#eee1cb",
    );
    c.fillStyle = "#302437";
    c.fillRect(-31, -12, 22, 7);
    c.fillRect(8, -12, 22, 7);
    c.restore();
    c.textAlign = "center";
    text(
      c,
      app.avatar.toUpperCase(),
      w / 2,
      wide ? h - 43 : 314,
      wide ? 24 : 38,
      fg,
      "bold",
      w - 36,
    );
    text(c, "CONNECTED  /  VIDEO", w / 2, h - 16, 15, "#c9d3b7");
    c.textAlign = "left";
  }
}
export function createScreen(ev) {
  const phone = !!ev.show_phone,
    app = ev.show_phone ?? ev.show_tv,
    ratio = phone ? 0.6 : 1.6,
    node = new T.Group();
  const box = (w, h, d, color, x, y, z) => {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.53 }),
    );
    m.position.set(x, y, z);
    node.add(m);
  };
  box(ratio + 0.052, 1.07, 0.075, 0x232736, 0, 0, 0);
  box(ratio * 0.33, 0.012, 0.012, 0x627680, 0, 0.51, 0.038);
  if (!phone) {
    box(0.1, 0.16, 0.07, 0x354250, 0, -0.56, 0);
    box(0.62, 0.04, 0.22, 0x354250, 0, -0.65, 0);
  }
  const face = new T.Mesh(
    new T.PlaneGeometry(ratio, 1),
    canvasFace(phone ? 288 : 480, phone ? 480 : 300, (c, w, h) =>
      paintApp(c, w, h, app),
    ),
  );
  mountFace(face, 0.075 / 2);
  node.add(face);
  return {
    node,
    sample(t, camera) {
      const age = t - ev.time;
      node.visible = age >= 0 && age < (ev.duration ?? Infinity);
      if (!node.visible) return;
      if (ev.position) {
        const scale = phone ? 0.67 : 0.84;
        node.scale.setScalar(scale);
        node.position.fromArray(ev.position);
        node.rotation.set(phone ? -Math.PI / 2 : 0, 0, 0);
        node.position.y += SURFACE_GAP + scale * (phone ? 0.0375 : 0.67);
        return;
      }
      const pop = 1 - Math.exp(-13 * age) * Math.cos(17 * age),
        depth = 1.25,
        span = 2 * Math.tan((camera.fov * Math.PI) / 360) * depth;
      node.position.copy(camera.position);
      node.quaternion.copy(camera.quaternion);
      node.translateZ(-depth);
      node.translateY(span * (0.07 - 0.18 * Math.exp(-12 * age)));
      node.rotateY(0.11 * Math.sin(2.6 * age) + 0.35 * Math.exp(-10 * age));
      node.rotateZ(-0.025 * Math.cos(3 * age));
      node.scale.setScalar(span * (phone ? 0.61 : 0.28) * pop);
    },
  };
}
