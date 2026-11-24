import { createScreen } from "./uiDirector.js";
import { createMass } from "./particleEscalation.js";
import { createBoard } from "./dataViz.js";
import * as T from "three";
import { CONFIG, SCENE_PRESETS } from "./config.js";
import { validate } from "./schema.js";
import { Pipeline, patchTree } from "./psxShader.js";
import { AssetLoader } from "./assetLoader.js";
import { bindPerformance, bindChipPush, pose } from "./animationLibrary.js";
import { createSpawn, sampleSpawn } from "./comedyProps.js";
import { stage } from "./stages.js";
import { CameraDirector } from "./cameraDirector.js";
import { composite } from "./captionEngine.js";
import { SfxEngine } from "./sfxEngine.js";
import { bindMorphs } from "./Evolutionary_Explainer/morphEngine.js";
import { createStatUI, sampleStatUI } from "./Evolutionary_Explainer/statUI.js";
export class EpisodeRunner {
  constructor(canvas) {
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.pipeline = new Pipeline();
    this.director = new CameraDirector();
    this.audio = new SfxEngine();
    this.frames = [];
    this.tick = 0;
    this.playing = false;
    this.focus = new T.Vector3();
    this.raf = 0;
  }
  async load(json) {
    const e = validate(json);
    this.pause();
    const loader = new AssetLoader(),
      frames = [];
    let end = 0;
    try {
      for (const s of e.shots) {
        const f = {
          ...stage(s.stage),
          items: [],
          spawns: [],
          panels: [],
          boards: [],
          visuals: [],
          start: end,
        };
        frames.push(f);
        end += Math.round(s.duration * CONFIG.hz);
        for (const d of SCENE_PRESETS[s.stage].layout ?? []) {
          const fixture = await loader.instance(d);
          fixture.position.fromArray(d.position);
          fixture.rotation.y = d.yaw ?? 0;
          f.scene.add(fixture);
        }
        for (const def of [...(s.actors ?? []), ...(s.props ?? [])]) {
          const node = def.fadeOut
            ? await loader.reflectedInstance(def, 1)
            : await loader.instance(def);
          f.scene.add(node);
          const item = { def, node };
          if (def.fadeOut) {
            const materials = new Set();
            node.traverse((o) => {
              for (const m of [].concat(o.material || [])) materials.add(m);
            });
            // A world-space edge cuts across the skinned mesh. Its uniform
            // follows the same shot clock as captions and survives random seeks.
            const scan = def.fadeStyle === "scan",
              progress = { value: 0 };
            if (scan)
              for (const m of materials) {
                const patch = m.onBeforeCompile.bind(m);
                m.depthWrite = true;
                m.transparent = false;
                m.onBeforeCompile = (s, ...args) => {
                  patch(s, ...args);
                  s.uniforms.phaseEdge = progress;
                  s.vertexShader =
                    "varying float phaseY;\n" +
                    s.vertexShader.replace(
                      "#include <project_vertex>",
                      "#include <project_vertex>\nphaseY=(modelMatrix*vec4(transformed,1.)).y;",
                    );
                  s.fragmentShader =
                    "uniform float phaseEdge; varying float phaseY;\n" +
                    s.fragmentShader.replace(
                      "#include <opaque_fragment>",
                      "if(phaseY < phaseEdge) discard; outgoingLight=mix(vec3(0.32,1.0,0.94),outgoingLight,smoothstep(0.0,.055,phaseY-phaseEdge));\n#include <opaque_fragment>",
                    );
                };
                m.customProgramCacheKey = () => "psx-scan-edge-v1";
                m.needsUpdate = true;
              }
            item.fade = (t) => {
              const [a, b] = def.fadeOut,
                opacity = 1 - T.MathUtils.smoothstep(t, a, b);
              node.visible = opacity > 0;
              if (scan)
                progress.value =
                  (def.position?.[1] ?? 0) -
                  0.12 +
                  (1 - opacity) * ((def.height ?? 1.6) + 0.4);
              else for (const m of materials) m.opacity = opacity;
            };
          }
          const { clip, take } = await loader.performanceSource(def, node);
          if (def.asset === "evo_cat")
            item.morph = bindMorphs(
              node,
              def.traits,
              (s.events ?? []).filter((ev) => ev.target === def.id),
            );
          else item.mixer = bindPerformance(node, clip, def.motion, take);
          if (!f.observer && s.actors?.includes(def)) f.observer = item;
          f.items.push(item);
          const opacity = SCENE_PRESETS[s.stage].reflection;
          if (opacity && s.actors?.includes(def)) {
            const mirror = new T.Group();
            mirror.scale.z = -1;
            f.scene.add(mirror);
            const image = await loader.reflectedInstance(def, opacity);
            mirror.add(image);
            f.items.push({
              node: image,
              def,
              ...(def.asset === "evo_cat"
                ? {
                    morph: bindMorphs(
                      image,
                      def.traits,
                      (s.events ?? []).filter((ev) => ev.target === def.id),
                    ),
                  }
                : { mixer: bindPerformance(image, clip, def.motion, take) }),
            });
          }
        }
        for (const ev of s.events ?? []) {
          if (ev.show_graph) continue; // Composited behind subtitles by captionEngine.
          if (
            ev.show_whiteboard ||
            ev.spawn_mass ||
            ev.show_phone ||
            ev.show_tv
          ) {
            const v = ev.show_whiteboard
              ? createBoard(ev)
              : ev.spawn_mass
                ? createMass(ev)
                : createScreen(ev);
            (ev.show_whiteboard ? f.boards : f.visuals).push(v);
            f.scene.add(v.node);
            continue;
          }
          if (ev.type === "sound" || ev.apply_morph || ev.texture_swap)
            continue;
          if (ev.spawn_ui) {
            const panel = createStatUI(ev);
            f.panels.push(panel);
            f.scene.add(panel.node);
            continue;
          }
          const spawn = createSpawn(ev);
          if (ev.placedBy)
            spawn.pushChips = bindChipPush(
              f.items.find((i) => i.def.id === ev.placedBy),
              spawn,
            );
          f.spawns.push(spawn);
          f.scene.add(spawn.node);
        }
        patchTree(f.scene);
      }
    } catch (err) {
      this.free(loader, frames);
      throw err;
    }
    this.free(this.loader, this.frames);
    this.audio.buffers.clear();
    this.episode = e;
    this.frames = frames;
    this.loader = loader;
    this.end = end;
    this.seek(0);
  }
  free(loader, frames) {
    for (const f of frames)
      for (const i of f.items) {
        i.mixer?.stopAllAction();
        i.mixer?.uncacheRoot(i.node);
      }
    loader?.dispose(frames.map((f) => f.scene));
  }
  get seconds() {
    return this.tick / CONFIG.hz;
  }
  get duration() {
    return this.end / CONFIG.hz;
  }
  seek(sec) {
    this.tick = Math.min(this.end, Math.max(0, Math.round(sec * CONFIG.hz)));
    if (this.playing) this.audio.start(this.episode, this.seconds);
    this.render();
  }
  sample() {
    this.index = this.frames.findLastIndex((f) => f.start <= this.tick);
    const f = this.frames[this.index],
      s = this.episode.shots[this.index],
      t = (this.tick - f.start) / CONFIG.hz;
    // Map the final *encoded* loop frame, not the unencoded end boundary, to frame zero.
    const rigTime = s.matchHook
      ? Math.max(0, s.duration - 1 / CONFIG.fps - t)
      : t;
    for (const i of f.items) {
      pose(i, rigTime);
      i.fade?.(rigTime);
      i.morph?.(rigTime, i.def.motion);
    }
    f.weather?.(rigTime, f.start / CONFIG.hz + rigTime);
    for (const spawn of f.spawns) {
      sampleSpawn(spawn, t);
      spawn.pushChips?.(t);
    }
    f.dust.rotation.y = rigTime * 0.08;
    f.dust.position.y = 0.08 * Math.sin(rigTime);
    if (typeof s.focus === "string") {
      const o = f.items.find((i) => i.def.id === s.focus);
      if (!o)
        this.focus.copy(
          f.spawns.find((p) => p.ev.id === s.focus).node.position,
        );
      else {
        this.focus.copy(o.node.position);
        this.focus.y +=
          (o.def.height ?? 1.6) *
          (s.cameraPreset === "macro_closeup" && s.actors?.includes(o.def)
            ? 0.87
            : 0.51);
      }
    } else this.focus.fromArray(s.focus ?? [0, 1, 0]);
    if (s.matchHook) {
      // Reverse the opening setup and whip through the final approach; the
      // terminal pose, lens and skeletal phase are exactly the hook at t=0.
      const hook = this.episode.shots[0],
        sweep = Math.min(1, rigTime / 0.65);
      if (hook.pov && s.pov?.whipFrom)
        this.focus.lerp(
          this.director.offset.fromArray(s.pov.whipFrom),
          sweep * sweep * (3 - 2 * sweep),
        );
      this.director.pose(
        {
          ...hook,
          angle: (hook.angle ?? 0) + 0.95 * sweep * sweep * (3 - 2 * sweep),
          cameraMotion: s.cameraMotion,
        },
        rigTime,
        this.focus,
        0,
        f.observer,
      );
    } else this.director.pose(s, t, this.focus, this.index, f.observer);
    // Resolve camera handoffs before positioning camera-relative props.
    for (const v of f.boards) v.sample(t, this.director.camera);
    for (const v of f.visuals) v.sample(t, this.director.camera);
    for (const panel of f.panels) sampleStatUI(panel, t, this.director.camera);
  }
  draw() {
    const f = this.frames[this.index];
    composite(
      this.ctx,
      this.pipeline.render(f.scene, this.director.camera),
      this.episode,
      this.episode.shots[this.index],
      this.index,
      (this.tick - f.start) / CONFIG.hz,
    );
    this.onframe?.();
  }
  render() {
    this.sample();
    this.draw();
  }
  async play() {
    if (this.playing) return;
    await this.audio.prepare(this.episode);
    if (this.tick === this.end) this.seek(0);
    this.audio.start(this.episode, this.seconds);
    this.playing = true;
    this.onframe?.();
    const advance = () => {
      if (!this.playing) return;
      const next = Math.min(
        this.end,
        Math.floor(this.audio.time() * CONFIG.hz),
      );
      if (next > this.tick) {
        // Catch up on exact 1/60 s steps. Draw only the last state.
        while (this.tick < next) {
          this.tick++;
          this.sample();
        }
        this.draw();
      }
      if (this.tick >= this.end) {
        this.pause();
        this.onend?.();
      } else this.raf = requestAnimationFrame(advance);
    };
    this.raf = requestAnimationFrame(advance);
  }
  pause() {
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.audio.stop();
    if (this.episode) this.onframe?.();
  }
  dispose() {
    this.pause();
    this.free(this.loader, this.frames);
    this.frames = [];
    this.episode = null;
    this.onframe = null;
    this.audio.dispose();
    this.pipeline.dispose();
  }
}
