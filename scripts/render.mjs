// Deterministic headless export. No rAF, speaker device, GPU or live recording required.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import {
  readFile,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import puppeteer from "puppeteer-core";
import { CONFIG } from "../src/config.js";
import { validate } from "../src/schema.js";

const file = process.argv[2] ?? "episodes/night-window.json";
if (!/^episodes\/[a-zA-Z0-9_/-]+\.json$/.test(file))
  throw Error("Expected episodes/name.json");
const episode = validate(JSON.parse(await readFile(file, "utf8")));
const frames = Math.ceil(
  (episode.shots.reduce((n, s) => n + Math.round(s.duration * CONFIG.hz), 0) *
    CONFIG.fps) /
    CONFIG.hz,
);
const root = await realpath("."),
  output = path.resolve("render-output", path.basename(file, ".json") + ".mp4");
const tmp = await mkdtemp(path.join(tmpdir(), "cutframe-"));
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    ).slice(1);
    if (
      !/^(?:src\/|vendor\/|Assets\/|SoundEffects\/|episodes\/|scripts\/render\.html$)/.test(
        url,
      )
    )
      throw Error();
    const p = await realpath(path.join(root, url));
    if (!p.startsWith(root + path.sep) || !(await stat(p)).isFile())
      throw Error();
    res.setHeader(
      "Content-Type",
      {
        ".js": "application/javascript",
        ".html": "text/html",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".wav": "audio/wav",
      }[path.extname(p)] ?? "application/octet-stream",
    );
    createReadStream(p)
      .on("error", () => res.destroy())
      .pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
let browser, encoder;
try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      ...(process.env.GITHUB_ACTIONS || process.env.CHROME_NO_SANDBOX === "1"
        ? ["--no-sandbox"]
        : []),
    ],
  });
  const page = await browser.newPage();
  let browserError;
  page.on("pageerror", (e) => (browserError = e));
  page.on("console", (m) => {
    if (m.type() === "error") browserError = Error(m.text());
  });
  await page.goto(
    `http://127.0.0.1:${server.address().port}/scripts/render.html`,
  );
  const pcm = await page.evaluate(async (e) => {
    const { EpisodeRunner } = await import("/src/episodeRunner.js");
    const runner = (globalThis.cutframe = new EpisodeRunner(
      document.querySelector("canvas"),
    ));
    await runner.load(e);
    const audio = runner.audio,
      rate = 48000,
      ctx = (audio.ctx = new OfflineAudioContext(
        1,
        Math.round(rate * runner.duration),
        rate,
      ));
    audio.bus = ctx.createGain();
    audio.bus.gain.value = 0.65;
    audio.bus.connect(ctx.destination);
    await audio.prepareBuffers(e);
    audio.start(e, 0);
    const samples = (await ctx.startRendering()).getChannelData(0);
    const bytes = new Uint8Array(samples.length * 2),
      view = new DataView(bytes.buffer);
    for (let i = 0; i < samples.length; i++)
      view.setInt16(
        i * 2,
        Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
        true,
      );
    let text = "";
    for (let i = 0; i < bytes.length; i += 8192)
      text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(text);
  }, episode);
  const raw = path.join(tmp, "mix.s16le");
  await writeFile(raw, Buffer.from(pcm, "base64"));
  await mkdir(path.dirname(output), { recursive: true });
  encoder = spawn(
    process.env.FFMPEG_BIN || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(CONFIG.fps),
      "-vcodec",
      "png",
      "-i",
      "pipe:0",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "1",
      "-i",
      raw,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      output + ".part.mp4",
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  async function* pictures() {
    for (let i = 0; i < frames; i++) {
      if (browserError) throw browserError;
      const data = await page.evaluate(
        ([n, hz]) => {
          cutframe.seek(n / hz);
          return cutframe.ctx.canvas.toDataURL("image/png").split(",")[1];
        },
        [i, CONFIG.fps],
      );
      yield Buffer.from(data, "base64");
      if ((i + 1) % 150 === 0) console.log(`${i + 1}/${frames} frames`);
    }
    if (browserError) throw browserError;
  }
  await Promise.all([
    once(encoder, "close").then(([code]) => {
      if (code !== 0) throw Error(`FFmpeg exited ${code}`);
    }),
    pipeline(Readable.from(pictures()), encoder.stdin),
  ]);
  await rename(output + ".part.mp4", output);
  console.log(`${output}: ${frames} frames at ${CONFIG.fps} fps`);
} finally {
  encoder?.kill();
  await browser?.close();
  server.close();
  server.closeAllConnections();
  await rm(tmp, { recursive: true, force: true });
  await rm(output + ".part.mp4", { force: true });
}
