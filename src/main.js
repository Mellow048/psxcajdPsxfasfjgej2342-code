import { EpisodeRunner } from "./episodeRunner.js";
import { StudioUI } from "./studioUI.js";
const runner = new EpisodeRunner(document.getElementById("preview")),
  ui = new StudioUI(runner);
ui.lock(true);
const file =
  new URLSearchParams(location.search).get("episode") ??
  "episodes/night-window.json";
if (!/^episodes\/[\w ./-]+\.json$/.test(file) || file.includes(".."))
  throw Error("Use an episode path under episodes/");
const res = await fetch(file);
if (!res.ok) throw Error("Episode script not found: " + file);
await ui.load(await res.json());
ui.lock(false);
window.addEventListener(
  "pagehide",
  (e) => {
    if (!e.persisted) runner.dispose();
  },
  { once: true },
);
