// Local previews use the exact vendored r170 build. Static deployments default to the CDN.
const choice = new URLSearchParams(location.search).get("modules");
const local = choice
  ? choice === "local"
  : /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$|\.e2b\.app$/.test(location.hostname);
const base = local
  ? "./vendor/three/"
  : "https://cdn.jsdelivr.net/npm/three@0.170.0/";
const map = document.createElement("script");
map.type = "importmap";
map.textContent = JSON.stringify({
  imports: {
    three: base + (local ? "three.module.min.js" : "build/three.module.min.js"),
    "three/addons/": base + (local ? "addons/" : "examples/jsm/"),
  },
});
document.head.append(map);
try {
  await import("./main.js");
} catch (e) {
  document.getElementById("status").textContent =
    "Studio could not start: " +
    e.message +
    " · Try ?modules=local or enable WebGL 2.";
}
