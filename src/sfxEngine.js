import { MUSIC_PRESETS, SFX_MANIFEST } from "./config.js";
import { bedAutomation } from "./musicBed.js";
import { takeRate } from "./voiceProfile.js";
const voiceKey = (e) =>
  e.voiceover || (e.narration ? `tts:${takeRate(e)}:${e.narration}` : null);
export class SfxEngine {
  constructor() {
    this.nodes = new Set();
    this.muted = false;
    this.buffers = new Map();
  }
  async ready() {
    if (!this.ctx) {
      const c = (this.ctx = new AudioContext());
      this.bus = c.createGain();
      this.bus.gain.value = 0.65;
      this.out = c.createGain();
      this.out.gain.value = this.muted ? 0 : 1;
      this.dest = c.createMediaStreamDestination();
      this.bus.connect(this.dest);
      this.bus.connect(this.out);
      this.out.connect(c.destination);
    }
    await this.ctx.resume();
  }
  async buffer(url) {
    if (!this.buffers.has(url)) {
      const r = await fetch(url);
      if (!r.ok) throw Error("Audio not found: " + url);
      this.buffers.set(
        url,
        await this.ctx.decodeAudioData(await r.arrayBuffer()),
      );
    }
    return this.buffers.get(url);
  }
  async prepare(e) {
    await this.ready();
    await this.prepareBuffers(e);
  }
  async prepareBuffers(e) {
    // The offline encoder calls the exact same take preparation as Play.
    if (e.narration && !e.voiceover && !this.buffers.has(voiceKey(e))) {
      const { renderNarration } = await import("./narration.js");
      const wav = await renderNarration(e.narration, takeRate(e));
      this.buffers.set(voiceKey(e), await this.ctx.decodeAudioData(wav));
    }
    for (const url of new Set(
      [
        e.voiceover,
        (MUSIC_PRESETS[e.bgMusic] ?? e.music)?.track,
        ...e.shots.map((s) => SFX_MANIFEST[s.sfx]),
      ].filter((v) => v && v !== "synth"),
    ))
      await this.buffer(url);
    const take = this.buffers.get(voiceKey(e));
    if (
      take &&
      take.duration > e.shots.reduce((sum, s) => sum + s.duration, 0) + 0.1
    )
      throw Error(
        `Narration lasts ${take.duration.toFixed(1)}s and would be cut off. Shorten the prose, extend the edit, or raise speechRate for synthesized speech.`,
      );
  }
  track(node, gain) {
    node.connect(gain);
    gain.connect(this.bus);
    this.nodes.add(node);
    node.onended = () => {
      node.disconnect();
      gain.disconnect();
      this.nodes.delete(node);
    };
  }
  sample(url, when, offset = 0) {
    const b = this.buffers.get(url);
    if (!b || offset >= b.duration) return;
    const n = this.ctx.createBufferSource();
    n.buffer = b;
    this.track(n, this.ctx.createGain());
    n.start(when, offset);
  }
  musicBed(music, voice, now, offset, end) {
    const volume = music.volume ?? 0.26,
      duration = end - offset;
    if (volume === 0 || duration <= 0) return;
    const buffer = this.buffers.get(music.track);
    if (!buffer?.duration)
      throw Error("Music was not prepared: " + music.track);
    const n = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    n.buffer = buffer;
    n.loop = true;
    gain.gain.setValueCurveAtTime(
      bedAutomation(volume, offset, end, voice, music.seamless),
      now,
      duration,
    );
    this.track(n, gain);
    n.start(now, offset % buffer.duration);
    n.stop(now + duration);
  }
  tone(key, when) {
    if (key === "cash_register") {
      this.tone("tooth", when);
      this.tone("ding", when + 0.04);
      this.tone("octave", when + 0.085);
      return;
    }
    if (key === "ratchet") {
      for (let i = 0; i < 6; i++) this.tone("tooth", when + i * 0.075);
      return;
    }
    if (key === "level_up") {
      ["ping", "fifth", "octave"].forEach((k, i) =>
        this.tone(k, when + i * 0.065),
      );
      return;
    }
    const c = this.ctx,
      n = c.createOscillator(),
      g = c.createGain();
    const [a, b, len, vol, type] = {
      heavy_thud: [128, 34, 0.31, 0.46, "triangle"],
      tooth: [920, 290, 0.029, 0.14, "square"],
      buzzer: [154, 95, 0.24, 0.14, "sawtooth"],
      ping: [1080, 1050, 0.16, 0.15, "sine"],
      fifth: [1575, 1575, 0.14, 0.11, "sine"],
      octave: [2100, 2100, 0.19, 0.09, "sine"],
      whoosh_fast: [2100, 125, 0.09, 0.115, "sawtooth"],
      ui_pop: [620, 980, 0.062, 0.125, "sine"],
      ding: [1710, 1650, 0.16, 0.1, "sine"],
      pop: [760, 240, 0.105, 0.2, "sine"],
      click: [1650, 210, 0.085, 0.23, "triangle"],
      whoosh: [1600, 110, 0.19, 0.19, "triangle"],
      riser: [260, 1250, 0.23, 0.105, "sawtooth"],
      beat: [96, 41, 0.15, 0.13, "sine"],
    }[key];
    n.type = type;
    n.frequency.setValueAtTime(a, when);
    n.frequency.exponentialRampToValueAtTime(b, when + len);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + len);
    this.track(n, g);
    n.start(when);
    n.stop(when + len + 0.01);
  }
  start(e, offset) {
    this.stop();
    const now = this.ctx.currentTime;
    this.origin = now - offset;
    if (voiceKey(e)) this.sample(voiceKey(e), now, offset);
    let t = 0;
    for (const s of e.shots) {
      if (t >= offset - 1e-6) {
        const when = now + Math.max(0, t - offset);
        for (const def of [...(s.actors ?? []), ...(s.props ?? [])])
          if (def.motionSfx) this.tone(def.motionSfx, when);
        SFX_MANIFEST[s.sfx] === "synth"
          ? this.tone(s.sfx, when)
          : this.sample(SFX_MANIFEST[s.sfx], when);
      }
      for (const ev of s.events ?? []) {
        const at =
          t +
          ev.time +
          (ev.show_graph?.cueAt === "end" ? ev.show_graph.drawTime : 0);
        if (at >= offset - 1e-6) {
          const when = now + Math.max(0, at - offset);
          this.tone(ev.sfx, when);
          if (ev.animationSfx) this.tone(ev.animationSfx, when);
        }
      }
      t += s.duration;
    }
    const music = MUSIC_PRESETS[e.bgMusic] ?? e.music;
    if (music)
      this.musicBed(music, this.buffers.get(voiceKey(e)), now, offset, t);
    if (e.beat && !music)
      for (let i = Math.ceil(offset / 0.5) * 0.5; i < t; i += 0.5)
        this.tone("beat", now + i - offset);
  }
  time() {
    return this.ctx.currentTime - this.origin;
  }
  mute() {
    this.muted = !this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }
  stop() {
    for (const n of this.nodes)
      try {
        n.stop();
      } catch {}
    this.nodes.clear();
  }
  dispose() {
    this.stop();
    this.buffers.clear();
    this.dest?.stream.getTracks().forEach((t) => t.stop());
    this.ctx?.close?.();
  }
}
