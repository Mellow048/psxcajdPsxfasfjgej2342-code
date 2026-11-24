import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { synthesizeTake } from "../src/narration.js";

test("bundled offline voice produces a single non-silent WAV for a complete paragraph", async () => {
  const module = await WebAssembly.compile(
    gunzipSync(
      readFileSync(new URL("../vendor/flite/flite.wasm.gz", import.meta.url)),
    ),
  );
  const text =
    "Two paths of light reach your eyes at the same time. One comes from outside.";
  const wav = Buffer.from(await synthesizeTake(module, text));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  const data = wav.indexOf("data", 12, "ascii");
  assert.ok(data >= 0);
  assert.equal(wav.readUInt32LE(data + 4), wav.length - data - 8);
  const rate = wav.readUInt32LE(24);
  let silence = 0,
    longest = 0,
    heard = false;
  for (let i = data + 8; i + 1 < wav.length; i += 2) {
    if (Math.abs(wav.readInt16LE(i)) < 100) {
      silence++;
    } else {
      if (heard) longest = Math.max(longest, silence);
      heard = true;
      silence = 0;
    }
  }
  assert.ok(heard);
  assert.ok(longest / rate < 0.85, "no one-second silence inside the take");
  const faster = await synthesizeTake(module, text, 1.25);
  assert.ok(faster.byteLength < wav.length);
});
