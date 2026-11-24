// Bake the same one-take English voice used by the editor, without a browser.
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { validate } from "../src/schema.js";
import { synthesizeTake } from "../src/narration.js";
import { takeRate } from "../src/voiceProfile.js";
const [, , file, out] = process.argv;
if (!file || !out?.endsWith(".wav"))
  throw Error("Usage: npm run narrate -- episodes/script.json output.wav");
const ep = validate(JSON.parse(await readFile(file, "utf8")));
if (!ep.narration) throw Error("Add narration text first");
const engine = await WebAssembly.compile(
  gunzipSync(
    await readFile(new URL("../vendor/flite/flite.wasm.gz", import.meta.url)),
  ),
);
const pcm = await synthesizeTake(engine, ep.narration, takeRate(ep));
await writeFile(out, Buffer.from(pcm));
console.log(`Saved one continuous take: ${out}`);
