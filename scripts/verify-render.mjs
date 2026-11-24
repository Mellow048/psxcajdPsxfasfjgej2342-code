import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validate } from "../src/schema.js";
import { CONFIG } from "../src/config.js";
const file = process.argv[2],
  ep = validate(JSON.parse(readFileSync(file, "utf8")));
const media = path.join("render-output", path.basename(file, ".json") + ".mp4");
const { streams, format } = JSON.parse(
  execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    media,
  ]),
);
const v = streams.find((s) => s.codec_type === "video"),
  a = streams.find((s) => s.codec_type === "audio");
const ticks = ep.shots.reduce(
    (sum, s) => sum + Math.round(s.duration * CONFIG.hz),
    0,
  ),
  time = ticks / CONFIG.hz;
assert.equal(v.codec_name, "h264");
assert.equal(v.width, CONFIG.width);
assert.equal(v.height, CONFIG.height);
assert.equal(v.avg_frame_rate, CONFIG.fps + "/1");
assert.equal(+v.nb_frames, Math.ceil((ticks * CONFIG.fps) / CONFIG.hz));
assert.equal(a.codec_name, "aac");
assert.ok(Math.abs(+a.duration - time) < 0.06);
assert.ok(Math.abs(+format.duration - time) < 0.06);
console.log(
  `${ep.title}: ${format.duration}s, ${v.nb_frames} frames, ${v.width}×${v.height}, H.264 + AAC`,
);
