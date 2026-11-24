import * as T from "three";
import { CONFIG } from "./config.js";
const grid = { value: new T.Vector2() },
  affine = { value: 0 };
export function patch(m) {
  if (!m || m.userData.psx) return;
  const uniformTextures = Object.values(m.uniforms ?? {}).map((u) => u.value);
  for (const v of [...Object.values(m), ...uniformTextures])
    if (v?.isTexture) {
      v.magFilter = v.minFilter = T.NearestFilter;
      v.generateMipmaps = false;
      v.anisotropy = 1;
      v.needsUpdate = true;
    }
  if (m.isShaderMaterial) return; // Custom shaders own their vertex layout.
  m.userData.psx = true;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { psxGrid: grid, affine });
    s.vertexShader =
      "uniform vec2 psxGrid;\nvarying vec3 affineUV;\n" +
      s.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
  // Skinning and projection are complete. Round screen-space vertices, not UVs
  // or object coordinates, and preserve the original clip-space w for depth.
  if (psxGrid.x > 0.0 && psxGrid.y > 0.0 && gl_Position.w > 0.0) {
    vec2 pixel = (0.5 * gl_Position.xy / gl_Position.w + 0.5) * psxGrid;
    gl_Position.xy = (2.0 * floor(pixel + 0.5) / psxGrid - 1.0) * gl_Position.w;
  }
  #ifdef USE_MAP
   affineUV=vec3(vMapUv*gl_Position.w,gl_Position.w);
  #endif`,
      );
    s.fragmentShader =
      "uniform float affine;\nvarying vec3 affineUV;\n" +
      s.fragmentShader.replace(
        "#include <map_fragment>",
        T.ShaderChunk.map_fragment.replace(
          "map, vMapUv",
          "map, mix(vMapUv,affineUV.xy/max(affineUV.z,0.00001),affine)",
        ),
      );
  };
  m.customProgramCacheKey = () => "psx-affine-v1";
  m.needsUpdate = true;
}
export function patchTree(root) {
  root.traverse((o) => [].concat(o.material || []).forEach(patch));
  return root;
}
export class Pipeline {
  constructor() {
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    this.target = new T.WebGLRenderTarget(1, 1, {
      generateMipmaps: false,
      minFilter: T.NearestFilter,
      magFilter: T.NearestFilter,
    });
    this.cam = new T.Camera();
    this.post = new T.Scene();
    this.quad = new T.Mesh(
      new T.PlaneGeometry(2, 2),
      new T.ShaderMaterial({
        uniforms: {
          image: { value: this.target.texture },
          dither: { value: 0 },
        },
        vertexShader: "void main(){gl_Position=vec4(position.xy,0.,1.);}",
        fragmentShader: `uniform sampler2D image;uniform float dither;
 void main(){ivec2 p=ivec2(gl_FragCoord.xy);vec3 c=texelFetch(image,p,0).rgb;
 c=mix(12.92*c,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));
 const int b[16]=int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);
 float n=(float(b[(p.y%4)*4+p.x%4])+.5)/16.-.5;gl_FragColor=vec4(clamp(floor(c*31.+.5+n*dither)/31.,0.,1.),1.);}`,
      }),
    );
    this.post.add(this.quad);
  }
  render(scene, cam) {
    const p = CONFIG.psx,
      w = 9 * Math.round((CONFIG.width * p.scale) / 9),
      h = (w / 9) * 16;
    grid.value.set(p.grid, p.gridHeight);
    affine.value = p.affine;
    this.quad.material.uniforms.dither.value = p.dither;
    if (this.target.width !== w || this.target.height !== h) {
      this.renderer.setSize(w, h, false);
      this.target.setSize(w, h);
    }
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(scene, cam);
    r.setRenderTarget(null);
    r.render(this.post, this.cam);
    return r.domElement;
  }
  dispose() {
    this.target.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
    this.renderer.dispose();
  }
}
