// A rigid-piece PSX rig (no external feline asset). +Z is the muzzle axis.
import * as T from "three";
const fur = 0xa48d78,
  cream = 0xe7cfaa,
  ink = 0x403534;
function piece(p, g, c, x, y, z) {
  const m = new T.Mesh(
    g,
    new T.MeshLambertMaterial({ color: c, flatShading: true }),
  );
  p.add(m);
  m.position.set(x, y, z);
  return m;
}
function oval(p, c, x, y, z, w, h, d) {
  const m = piece(p, new T.SphereGeometry(1, 12, 8), c, x, y, z);
  m.scale.set(w, h, d);
  return m;
}
function bone(p, name, x, y, z) {
  const b = new T.Bone();
  b.name = name;
  b.position.set(x, y, z);
  p.add(b);
  return b;
}
function fluff(mesh, x, y, z) {
  const g = mesh.geometry,
    attr = g.attributes.position.clone();
  attr.name = "inflate_mesh";
  for (let i = 0; i < attr.count; i++)
    attr.setXYZ(i, attr.getX(i) * x, attr.getY(i) * y, attr.getZ(i) * z);
  g.morphAttributes.position = [attr];
  mesh.updateMorphTargets();
}
// A nearest-filtered atlas swaps progressively from a slit to a circular pupil.
function eyes() {
  const can = document.createElement("canvas");
  can.width = 32 * 9;
  can.height = 32;
  const c = can.getContext("2d");
  for (let i = 0; i < 9; i++) {
    const x = i * 32 + 16;
    c.fillStyle = "#342d31";
    c.beginPath();
    c.arc(x, 16, 16, 0, 7);
    c.fill();
    c.fillStyle = "#d4bc69";
    c.beginPath();
    c.arc(x, 16, 13.8, 0, 7);
    c.fill();
    c.fillStyle = "#242128";
    c.beginPath();
    c.ellipse(x, 16, 2 + i * 0.86, 10 - i * 0.13, 0, 0, 7);
    c.fill();
    c.fillStyle = "#fff7cd";
    c.fillRect(x - 4, 8, 4, 4);
  }
  const tex = new T.CanvasTexture(can);
  tex.colorSpace = T.SRGBColorSpace;
  tex.repeat.x = 1 / 9;
  return tex;
}
export function makeCat() {
  const root = new T.Group(),
    torso = bone(root, "Torso", 0, 0.76, 0),
    head = bone(torso, "Head", 0, 0.39, 0.51);
  const coat = oval(torso, fur, 0, 0, -0.08, 0.37, 0.39, 0.7);
  fluff(coat, 1.68, 1.39, 1.12);
  // Paint the flank markings in UV space so they stretch with the winter coat.
  const skin = document.createElement("canvas");
  skin.width = 128;
  skin.height = 64;
  const brush = skin.getContext("2d");
  brush.fillStyle = "#fff3dc";
  brush.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 720; i++) {
    const x = (i * 47) % 128,
      y = (i * 23 + Math.floor(i / 7)) % 64;
    brush.fillStyle = i % 3 ? "#e1d5c5" : "#eadbc6";
    brush.fillRect(x, y, 2, 2);
  }
  brush.strokeStyle = "#988775";
  brush.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = i * 12;
    brush.beginPath();
    brush.moveTo(x, 4);
    brush.quadraticCurveTo(x + 5, 15, x - 1, 31 + (i % 3) * 4);
    brush.stroke();
  }
  coat.material.map = new T.CanvasTexture(skin);
  coat.material.map.colorSpace = T.SRGBColorSpace;
  const shadow = piece(
    root,
    new T.CircleGeometry(1, 16),
    0x80939e,
    0,
    0.009,
    -0.09,
  );
  shadow.scale.set(0.55, 0.86, 1);
  shadow.rotation.x = -Math.PI / 2;
  fluff(oval(head, fur, 0, 0, 0, 0.41, 0.36, 0.33), 1.3, 1.12, 1.04);
  const eyeMap = eyes();
  for (const side of [-1, 1]) {
    const ear = bone(head, `Ear_${side}`, side * 0.27, 0.2, -0.03);
    ear.rotation.z = -side * 0.26;
    piece(
      ear,
      new T.ConeGeometry(0.16, 0.39, 3),
      0x756152,
      0,
      0.16,
      0,
    ).rotation.y = Math.PI;
    piece(
      ear,
      new T.ConeGeometry(0.095, 0.25, 3),
      0xc48f86,
      0,
      0.16,
      0.058,
    ).rotation.y = Math.PI;
    for (let j = 0; j < 3; j++) {
      const cheek = piece(
        head,
        new T.ConeGeometry(0.1 - j * 0.013, 0.28, 4),
        j === 1 ? ink : cream,
        side * (0.29 + j * 0.027),
        -0.05 - j * 0.061,
        0.24 - j * 0.022,
      );
      cheek.rotation.z = side * -2.26;
    }
    oval(head, cream, side * 0.112, -0.077, 0.332, 0.155, 0.091, 0.088);
    const eye = piece(
      head,
      new T.CircleGeometry(0.095, 14),
      0xffffff,
      side * 0.183,
      0.059,
      0.347,
    );
    eye.rotation.y = side * 0.31;
    eye.material.map = eyeMap;
    eye.material.alphaTest = 0.5;
    eye.name = "PupilAtlas";
    const brow = oval(
      head,
      0x615348,
      side * 0.178,
      0.163,
      0.307,
      0.113,
      0.029,
      0.046,
    );
    brow.name = `Brow_${side}`;
    brow.rotation.z = side * 0.19;
    for (let j = 0; j < 3; j++)
      oval(
        head,
        ink,
        side * (0.055 + j * 0.068),
        0.245 - j * 0.016,
        0.267,
        0.02,
        0.048,
        0.023,
      ).rotation.z = side * -0.24;
    for (const z of [-0.45, 0.37]) {
      const leg = bone(root, `Leg_${side}_${z}`, side * 0.238, 0, z);
      oval(leg, fur, 0, 0.33, 0, 0.108, 0.34, 0.125);
      oval(leg, cream, 0, 0.09, 0.033, 0.12, 0.09, 0.15);
    }
  }
  oval(head, 0x745059, 0, -0.039, 0.409, 0.062, 0.038, 0.034);
  oval(head, cream, 0, -0.165, 0.242, 0.112, 0.066, 0.067);
  const tail = bone(torso, "Tail", 0, -0.08, -0.61);
  for (let i = 0; i < 8; i++)
    oval(
      tail,
      i % 2 ? 0x574e48 : 0xab9781,
      0.045 * i,
      -0.045 * i,
      -0.072 * i,
      0.117 - i * 0.004,
      0.12 - i * 0.004,
      0.145 - i * 0.004,
    );
  return root;
}
