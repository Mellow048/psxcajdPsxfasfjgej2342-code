// One invocation, one in-memory WAV for the entire script. No shot or caption input.
import {
  WASI,
  File,
  OpenFile,
  ConsoleStdout,
  PreopenDirectory,
} from "../vendor/flite/wasi/index.js";
import { DEFAULT_SPEECH_RATE, OFFLINE_VOICE } from "./voiceProfile.js";
export async function synthesizeTake(module, text, rate = DEFAULT_SPEECH_RATE) {
  const wav = new File([]),
    errors = [];
  const script = new File(
    new TextEncoder().encode(text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"')),
  );
  const args = [
    "flite",
    "-voice",
    OFFLINE_VOICE,
    "--setf",
    `duration_stretch=${1 / rate}`,
    "-f",
    "/script.txt",
    "-o",
    "/take.wav",
  ];
  const wasi = new WASI(
    args,
    [],
    [
      new OpenFile(new File([])),
      ConsoleStdout.lineBuffered(() => {}),
      ConsoleStdout.lineBuffered((s) => errors.push(s)),
      new PreopenDirectory("/", [
        ["take.wav", wav],
        ["script.txt", script],
      ]),
    ],
    { debug: false },
  );
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  const status = wasi.start(instance);
  if (status !== 0 || wav.data.length <= 44)
    throw Error(`Narration synthesis failed: ${errors.join(" ") || status}`);
  return wav.data.slice().buffer;
}
export function renderNarration(text, rate = DEFAULT_SPEECH_RATE) {
  const worker = new Worker(new URL("./narrationWorker.js", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      worker.terminate();
      data.error ? reject(Error(data.error)) : resolve(data.wav);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(Error(e.message || "Narration worker failed"));
    };
    worker.postMessage({ text, rate });
  });
}
