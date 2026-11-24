import * as T from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { ASSET_MANIFEST } from "./config.js";
import { TEXTURES } from "./catalog.js";
import { patchTree } from "./psxShader.js";
import { makeCat } from "./Evolutionary_Explainer/catRig.js";
import { makeProp } from "./stages.js";
const leaf = (s) => s.replaceAll("\\", "/").split("/").pop().toLowerCase();
const byName = new Map();
for (const p of TEXTURES) {
  const k = leaf(p);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(p);
}
export function release(roots) {
  const seen = new Set();
  function free(r) {
    if (r && !seen.has(r)) {
      seen.add(r);
      r.dispose?.();
    }
  }
  for (const root of roots)
    root?.traverse((o) => {
      if (o.isInstancedMesh) free(o); // release instance buffers as well as the shared geometry
      free(o.geometry);
      free(o.skeleton);
      for (const m of [].concat(o.material || [])) {
        for (const v of Object.values(m))
          if (v?.isTexture) {
            if (v.image?.close && !seen.has(v.image)) {
              seen.add(v.image);
              v.image.close();
            }
            free(v);
          }
        free(m);
      }
    });
}
export class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.clipCache = new Map();
    this.roots = [];
  }
  async template(key) {
    if (!this.cache.has(key)) this.cache.set(key, this.load(key));
    return this.cache.get(key);
  }
  async load(key) {
    const d = ASSET_MANIFEST[key];
    if (d.builtin) {
      const root = makeProp(key);
      this.roots.push(root);
      return { root, clips: [] };
    }
    const m = new T.LoadingManager(),
      pack = d.path.split("/").slice(0, 2).join("/") + "/";
    let fail = null;
    m.onError = (url) => {
      fail = Error("Missing resource for " + key + ": " + url);
    };
    const finished = new Promise((resolve) => (m.onLoad = resolve));
    m.setURLModifier((url) => {
      if (/^(blob:|data:)/.test(url)) return url;
      const matches = byName.get(leaf(url));
      return (
        matches?.find((p) => p.startsWith(pack)) ??
        matches?.find((p) => p.startsWith("Assets/Textures/")) ??
        matches?.[0] ??
        (/\.(png|jpe?g)$/i.test(url) ? "./vendor/missing-texture.png" : url)
      );
    });
    const glb = d.path.endsWith(".glb");
    const file = await (glb ? new GLTFLoader(m) : new FBXLoader(m)).loadAsync(
      d.path,
    );
    const root = glb ? file.scene : file;
    this.roots.push(root);
    await finished;
    if (fail) throw fail;
    return { root, clips: file.animations || [] };
  }
  async clipsFor(key) {
    if (this.cache.has(key)) return (await this.template(key)).clips;
    if (!this.clipCache.has(key)) {
      const temporary = new AssetLoader();
      try {
        const { clips } = await temporary.template(key);
        this.clipCache.set(
          key,
          clips.map((c) => c.clone()),
        );
      } finally {
        temporary.dispose();
      }
    }
    return this.clipCache.get(key);
  }
  async performanceSource(def, node) {
    const action = def.motion ?? "idle_breathe";
    let request = def.clip;
    if (!request) {
      const named = ASSET_MANIFEST[def.asset].clips.find(
        (n) => n.toLowerCase() === action,
      );
      if (named) request = { name: named };
      else if (node.getObjectByName("mixamorigHips")) {
        // Optional licensed Mixamo donations: after cataloging, a matching
        // Assets/Animations/<action>.fbx can drive every compatible actor.
        const key = "animations." + action,
          name = ASSET_MANIFEST[key]?.clips[0];
        if (name) request = { asset: key, name };
      }
    }
    if (request) {
      const clips = await this.clipsFor(request.asset ?? def.asset);
      const clip = clips.find((c) => c.name === request.name);
      if (!clip) throw Error("Missing animation clip: " + request.name);
      return { clip, take: true };
    }
    const clip = ASSET_MANIFEST[def.asset].clips.length
      ? (await this.clipsFor(def.asset))[0]
      : null;
    return { clip, take: false };
  }
  async instance(def) {
    if (def.asset === "evo_cat") {
      const model = makeCat(),
        node = new T.Group();
      model.scale.setScalar((def.height ?? 1.7) / 1.7);
      node.add(model);
      return patchTree(node);
    }
    const model =
      def.asset === "label"
        ? makeProp("label", def.text)
        : clone((await this.template(def.asset)).root);
    const extracted = def.mesh
      ? (model.getObjectByName(def.mesh) ??
        model
          .getObjectsByProperty("isObject3D", true)
          .find((o) => o.userData.name === def.mesh))
      : model;
    if (!extracted) throw Error(`No mesh ${def.mesh} in ${def.asset}`);
    const pivot = new T.Group();
    if (def.mesh) {
      model.updateMatrixWorld(true);
      pivot.attach(extracted);
    } else pivot.add(model);
    const bounds = new T.Box3().setFromObject(pivot, true),
      size = bounds.getSize(new T.Vector3()),
      center = bounds.getCenter(new T.Vector3());
    const factor = (def.height ?? 1.6) / Math.max(0.001, size.y);
    const normalized = new T.Group();
    normalized.add(pivot);
    pivot.scale.setScalar(factor);
    pivot.position.set(
      -center.x * factor,
      -bounds.min.y * factor,
      -center.z * factor,
    );
    return patchTree(normalized);
  }
  async reflectedInstance(def, opacity) {
    const node = await this.instance(def),
      copies = new Map();
    const tint = (original) => {
      if (!copies.has(original)) {
        const m = original.clone();
        delete m.userData.psx;
        m.transparent = true;
        m.opacity = opacity;
        m.depthWrite = false;
        copies.set(original, m);
      }
      return copies.get(original);
    };
    node.traverse((o) => {
      if (o.material)
        o.material = Array.isArray(o.material)
          ? o.material.map(tint)
          : tint(o.material);
    });
    return patchTree(node);
  }
  dispose(stages = []) {
    release([...this.roots, ...stages]);
    this.cache.clear();
    this.clipCache.clear();
    this.roots = [];
  }
}
