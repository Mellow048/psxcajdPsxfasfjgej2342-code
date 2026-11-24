import * as T from "three";

// Disjoint lens pairs guarantee a lens cut even if two consecutive shots reuse
// the same set, subject, angle and preset. No camera pose depends on the last frame.
const LENS = {
  wide_orbit: 55,
  dutch_tilt_push: 43,
  macro_closeup: 29,
  over_shoulder: 47,
  whip_pan_to_prop: 61,
};
export class CameraDirector {
  camera = new T.PerspectiveCamera(42, 9 / 16, 0.05, 100);
  focus = new T.Vector3();
  offset = new T.Vector3();
  // Analytic integration of motion over elapsed shot time. Runs on every sample,
  // including the shoulder/whip rigs. No accumulated deltas to lose on seeks.
  move(mode, t, u) {
    const c = this.camera;
    if (mode === "orbit_drift") {
      const q = this.orbit.setFromAxisAngle(this.up, 0.24 * u);
      c.position.sub(this.focus).applyQuaternion(q).add(this.focus);
      c.quaternion.premultiply(q);
    } else if (mode === "handheld_bob") {
      c.translateX(0.075 * u);
      c.rotateX(0.025 * Math.sin(3.8 * t));
      c.rotateY(0.033 * Math.cos(3.8 * t));
    } else {
      const delta =
        mode === "slow_push"
          ? -Math.min(0.5, c.position.distanceTo(this.focus) * 0.42)
          : 0.5;
      c.translateZ(delta * u);
    }
    return c;
  }
  orbit = new T.Quaternion();
  up = new T.Vector3(0, 1, 0);
  pose(s, t, target, index, actor) {
    const c = this.camera,
      u = t / s.duration,
      side = index % 2 ? -1 : 1;
    this.focus.copy(target);
    const lens = LENS[s.cameraPreset] + (index % 2) * 2;
    if (c.fov !== lens) {
      c.fov = lens;
      c.updateProjectionMatrix();
    }
    if (s.pov) {
      const turn = Math.min(1, t / 0.36),
        kick = 1 - Math.exp(-8 * t);
      c.position.fromArray(s.pov.eye);
      if (s.pov.dollyTo)
        c.position.lerp(
          this.offset.fromArray(s.pov.dollyTo),
          u * u * (3 - 2 * u),
        );
      c.position.y += 0.014 * Math.sin(5 * t);
      if (s.pov.whipFrom)
        this.focus.lerp(
          this.offset.fromArray(s.pov.whipFrom),
          1 - turn * turn * (3 - 2 * turn),
        );
      c.lookAt(this.focus);
      c.translateZ((s.pov.recoil ?? 0) * kick);
      return this.move(s.cameraMotion, t, u);
    }
    let d = s.distance ?? 4.1,
      a = s.angle ?? 0,
      h = 0.22,
      roll = 0;
    switch (s.cameraPreset) {
      case "wide_orbit":
        a += side * (-0.42 + 0.55 * u);
        h += 0.4 + 0.18 * u;
        break;
      case "dutch_tilt_push":
        d *= 0.95;
        roll = side * (0.24 - 0.13 * u);
        a += side * (0.24 + 0.18 * u);
        break;
      case "macro_closeup":
        d *= 0.62;
        a += side * (-0.19 + 0.44 * u);
        h = 0.08;
        break;
      case "over_shoulder": {
        // For a real observer anchor the lens behind and beside their shoulder.
        if (actor) {
          const shoulder = this.offset.copy(actor.node.position);
          shoulder.y += (actor.def.height ?? 1.6) * 0.87;
          const dx = shoulder.x - target.x,
            dz = shoulder.z - target.z;
          const bearing = Math.hypot(dx, dz) > 0.08 ? Math.atan2(dx, dz) : a;
          c.position.copy(shoulder);
          c.position.x +=
            Math.sin(bearing) * d * 0.37 + side * Math.cos(bearing) * 0.39;
          c.position.z +=
            Math.cos(bearing) * d * 0.37 - side * Math.sin(bearing) * 0.39;
          c.position.y += 0.13 + 0.09 * u;
          c.lookAt(this.focus);
          return this.move(s.cameraMotion, t, u);
        }
        a += side * (0.66 + 0.17 * u);
        h = 0.6;
        d *= 0.81;
        break;
      }
      case "whip_pan_to_prop": {
        const v = Math.min(1, Math.max(0, (u - 0.08) / 0.38)),
          ease = v * v * (3 - 2 * v);
        if (actor) {
          this.offset.copy(actor.node.position);
          this.offset.y += (actor.def.height ?? 1.6) * 0.83;
          this.focus.lerp(this.offset, 1 - ease);
        } else this.focus.x -= side * (s.pan ?? 1.25) * (1 - ease);
        a += side * (0.62 - 0.54 * ease + 0.08 * u);
        d *= 0.88 - 0.09 * u;
        break;
      }
    }
    c.position
      .copy(target)
      .add(
        this.offset.set(
          Math.sin(a) * d,
          h + 0.045 * Math.sin(t * 4),
          Math.cos(a) * d,
        ),
      );
    c.lookAt(this.focus);
    c.rotateZ(roll);
    return this.move(s.cameraMotion, t, u);
  }
}
