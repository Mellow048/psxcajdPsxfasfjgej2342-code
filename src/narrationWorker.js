import { synthesizeTake } from "./narration.js";
self.onmessage = async ({ data: { text, rate } }) => {
  try {
    const r = await fetch(
      new URL("../vendor/flite/flite.wasm.gz", import.meta.url),
    );
    if (!r.ok) throw Error("Cannot load the local speech engine");
    const bytes = await new Response(
      r.body.pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
    const wav = await synthesizeTake(
      await WebAssembly.compile(bytes),
      text,
      rate,
    );
    self.postMessage({ wav }, [wav]);
  } catch (e) {
    self.postMessage({ error: e.message });
  }
};
