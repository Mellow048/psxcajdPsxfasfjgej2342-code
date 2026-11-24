// Derive the same music automation from the decoded voice in live and offline mixes.
// No realtime analyser or frame-loop dependency: random access is sample-clock based.
const STEP = 0.05;
const profiles = new WeakMap();
function dialogueProfile(voice) {
  if (profiles.has(voice)) return profiles.get(voice);
  const samples = voice.getChannelData(0),
    hop = Math.round(voice.sampleRate * STEP);
  const levels = new Float32Array(Math.ceil(samples.length / hop) + 16);
  let level = 1;
  for (let i = 0; i < levels.length; i++) {
    let energy = 0;
    for (let j = i * hop; j < Math.min(samples.length, (i + 1) * hop); j += 8)
      energy += samples[j] * samples[j];
    const activity = Math.min(1, Math.sqrt(energy / (hop / 8)) / 0.035);
    const target = 1 - 0.5 * activity;
    level += (target - level) * (target < level ? 0.9 : 0.17);
    levels[i] = level;
  }
  profiles.set(voice, levels);
  return levels;
}
export function bedAutomation(volume, offset, end, voice, seamless = false) {
  const levels = voice ? dialogueProfile(voice) : null,
    duration = end - offset;
  const curve = new Float32Array(Math.max(2, Math.ceil(duration / STEP) + 1));
  for (let i = 0; i < curve.length; i++) {
    const t = offset + (duration * i) / (curve.length - 1),
      k = Math.floor(t / STEP),
      u = t / STEP - k;
    const duck = levels
      ? (levels[k] ?? 1) * (1 - u) + (levels[k + 1] ?? 1) * u
      : 1;
    curve[i] =
      volume *
      duck *
      (seamless && offset === 0
        ? 1
        : Math.max(0, Math.min(1, (t - offset) / 0.045))) *
      (seamless ? 1 : Math.max(0, Math.min(1, (end - t) / 0.32)));
  }
  return curve;
}
