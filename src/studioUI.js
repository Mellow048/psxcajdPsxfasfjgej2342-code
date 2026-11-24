import { CONFIG, ASSET_MANIFEST } from "./config.js";
import { icon } from "./icons.js";
const $ = (id) => document.getElementById(id),
  el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  };
const pad = (n) => String(n).padStart(2, "0"),
  tc = (s) =>
    `${pad(Math.floor(s / 60))}:${(s % 60).toFixed(1).padStart(4, "0")}`;
function download(data, name) {
  const url = URL.createObjectURL(data),
    a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
export class StudioUI {
  constructor(r) {
    this.r = r;
    this.modal = $("modal");
    this.defaults = { ...CONFIG.psx };
    this.rec = null;
    this.busy = false;
    document
      .querySelectorAll("[data-ic]")
      .forEach((i) => (i.outerHTML = icon(i.dataset.ic)));
    $("edit").onclick = () => this.editor();
    $("library").onclick = () => this.library();
    $("workspace").onclick = () => this.modal.close();
    $("close").onclick = () => this.modal.close();
    $("play").onclick = () =>
      this.run(() => (r.playing ? r.pause() : r.play()));
    $("mute").onclick = () => {
      const m = r.audio.mute();
      $("mute").innerHTML = icon(m ? "mute" : "volume");
      $("mute").setAttribute(
        "aria-label",
        m ? "Unmute speakers" : "Mute speakers",
      );
    };
    $("back").onclick = () => this.jump(Math.max(0, r.index - 1));
    $("next").onclick = () =>
      this.jump(Math.min(r.frames.length - 1, r.index + 1));
    $("scrub").oninput = (e) => r.seek(+e.target.value / 60);
    $("export").onclick = () =>
      this.rec ? this.stopRecording(true) : this.record();
    $("reset").onclick = () => {
      Object.assign(CONFIG.psx, this.defaults);
      this.sliders();
      r.render();
    };
    document.addEventListener("keydown", (e) => {
      if (
        e.code === "Space" &&
        !this.modal.open &&
        !["INPUT", "BUTTON", "TEXTAREA"].includes(e.target.tagName) &&
        !this.busy &&
        !this.rec
      ) {
        e.preventDefault();
        $("play").click();
      }
    });
    r.onend = () => {
      if (this.rec) this.stopRecording(false);
    };
    this.sliders();
  }
  note(t) {
    $("status").textContent = t;
  }
  lock(v) {
    for (const id of [
      "edit",
      "library",
      "play",
      "next",
      "back",
      "scrub",
      "reset",
      "export",
    ])
      $(id).disabled = v;
    document
      .querySelectorAll(".shot,.control input")
      .forEach((b) => (b.disabled = v));
  }
  async run(fn) {
    if (this.busy) return;
    this.busy = true;
    this.lock(true);
    try {
      await fn();
    } catch (e) {
      this.note(e.message);
    } finally {
      this.busy = false;
      if (!this.rec) this.lock(false);
    }
  }
  sliders() {
    const root = $("sliders");
    root.replaceChildren();
    for (const [key, title, min, max, step, fmt] of [
      ["grid", "Snap grid width", 0, 360, 10, (v) => (v ? v + " px" : "Off")],
      ["gridHeight", "Snap grid height", 80, 480, 10, (v) => v + " px"],
      [
        "affine",
        "Affine warping",
        0,
        1,
        0.05,
        (v) => Math.round(v * 100) + "%",
      ],
      [
        "dither",
        "Dither intensity",
        0,
        1,
        0.05,
        (v) => Math.round(v * 100) + "%",
      ],
      [
        "scale",
        "Render scale",
        1 / 6,
        1,
        "any",
        (v) => Math.round(v * 100) + "%",
      ],
    ]) {
      const l = el("label", "control"),
        row = el("span", "", title),
        out = el("output"),
        input = el("input");
      input.type = "range";
      Object.assign(input, { min, max, step, value: CONFIG.psx[key] });
      input.setAttribute("aria-label", title);
      const sync = () => {
        out.value = fmt(+input.value);
        input.style.setProperty(
          "--pct",
          (100 * (input.value - min)) / (max - min) + "%",
        );
      };
      sync();
      input.oninput = () => {
        CONFIG.psx[key] = +input.value;
        sync();
        this.r.render();
      };
      row.append(out);
      l.append(row, input);
      root.append(l);
    }
  }
  async load(json) {
    const r = this.r;
    await r.load(json);
    json = r.episode;
    r.onframe = null;
    $("title").textContent = json.title;
    $("series").textContent = json.series ?? "Custom episode";
    const n = json.shots.length;
    $("quantity").textContent = n + " shots";
    $("length").textContent = r.duration + " seconds";
    $("count").textContent = pad(n);
    $("seqinfo").textContent = n + " cuts · 60 Hz sequence";
    $("total").textContent = tc(r.duration);
    $("scrub").max = r.end;
    const list = $("list"),
      sg = $("segments");
    list.replaceChildren();
    sg.replaceChildren();
    const thumb = document.createElement("canvas");
    thumb.width = 100;
    thumb.height = 76;
    const tx = thumb.getContext("2d");
    for (const [i, s] of json.shots.entries()) {
      r.seek(r.frames[i].start / 60 + 0.3);
      const pic = r.pipeline.renderer.domElement;
      tx.imageSmoothingEnabled = false;
      tx.drawImage(
        pic,
        0,
        pic.height * 0.24,
        pic.width,
        pic.width * 0.76,
        0,
        0,
        100,
        76,
      );
      const b = el("button", "shot"),
        im = el("img", "thumb");
      im.alt = "";
      im.src = thumb.toDataURL();
      const text = el("span", "shottext");
      text.append(el("strong", "", s.title), el("small", "", s.cameraPreset));
      b.append(
        el("span", "num", pad(i + 1)),
        im,
        text,
        el("span", "duration", s.duration + "s"),
      );
      b.title = `${s.cameraPreset} · ${s.cameraMotion} · ${(s.events ?? []).length} prop spawns`;
      b.onclick = () => this.jump(i);
      list.append(b);
      const seg = el("span", "seg", pad(i + 1) + "  " + s.title);
      seg.style.flex = s.duration + " 1 0";
      sg.append(seg);
    }
    const ruler = $("ruler");
    ruler.replaceChildren();
    for (let i = 0; i <= 5; i++)
      ruler.append(el("span", "", ((r.duration * i) / 5).toFixed(1) + "s"));
    this.last = -1;
    r.onframe = () => this.frame();
    r.seek(0);
    this.note("Renderer ready");
  }
  jump(i) {
    this.r.seek(this.r.frames[i].start / 60);
  }
  frame() {
    const r = this.r;
    $("time").textContent = tc(r.seconds);
    $("scrub").value = r.tick;
    $("cursor").style.left = (r.tick / r.end) * 100 + "%";
    if (this.last !== r.index) {
      Array.from($("list").children).forEach((b, i) => {
        b.classList.toggle("selected", i === r.index);
        b.setAttribute("aria-current", i === r.index ? "step" : "false");
      });
      Array.from($("segments").children).forEach((v, i) =>
        v.classList.toggle("sel", i === r.index),
      );
      document.querySelector(".stageinfo").textContent =
        "CAM " + pad(r.index + 1);
      this.last = r.index;
    }
    if (this.wasPlaying !== r.playing) {
      $("play").innerHTML = icon(r.playing ? "pause" : "play");
      $("play").setAttribute(
        "aria-label",
        r.playing ? "Pause episode" : "Play episode",
      );
      this.wasPlaying = r.playing;
    }
  }
  dialog(k, title) {
    this.r.pause();
    $("modalKicker").textContent = k;
    $("modalTitle").textContent = title;
    const b = $("modalBody");
    b.replaceChildren();
    this.modal.showModal();
    return b;
  }
  editor() {
    const b = this.dialog("EPISODE SOURCE", "JSON editor"),
      ta = el("textarea"),
      err = el("p", "err");
    err.setAttribute("role", "alert");
    ta.setAttribute("aria-label", "Episode JSON");
    ta.spellcheck = false;
    ta.value = JSON.stringify(this.r.episode, null, 2);
    const row = el("div", "dialogfoot"),
      save = el("button", "", "Save JSON"),
      apply = el("button", "primary", "Apply episode");
    save.onclick = () =>
      download(
        new Blob([ta.value], { type: "application/json" }),
        "episode.json",
      );
    apply.onclick = async () => {
      apply.disabled = true;
      $("close").disabled = true;
      this.modal.oncancel = (e) => e.preventDefault();
      err.textContent = "Preparing episode…";
      try {
        await this.load(JSON.parse(ta.value));
        this.modal.close();
      } catch (e) {
        err.textContent = e.message;
      } finally {
        apply.disabled = false;
        $("close").disabled = false;
        this.modal.oncancel = null;
      }
    };
    const open = el("button", "", "Open JSON"),
      pick = el("input");
    pick.type = "file";
    pick.accept = ".json,application/json";
    pick.hidden = true;
    open.onclick = () => pick.click();
    pick.onchange = async () => {
      try {
        if (pick.files[0]) ta.value = await pick.files[0].text();
      } catch (e) {
        err.textContent = e.message;
      }
    };
    row.append(open, save, apply, pick);
    b.append(ta, err, row);
  }
  library() {
    const b = this.dialog("VERIFIED ASSETS", "Asset library"),
      input = el("input", "search"),
      list = el("ul", "catalog");
    input.placeholder = "Filter by key or pack…";
    input.setAttribute("aria-label", "Filter assets");
    const search = () => {
      list.replaceChildren();
      for (const [k, d] of Object.entries(ASSET_MANIFEST)) {
        if (!k.includes(input.value.toLowerCase())) continue;
        const li = el("li", "", k);
        li.append(el("small", "", d.path ?? "Procedural studio prop"));
        list.append(li);
      }
    };
    input.oninput = search;
    search();
    b.append(
      el("p", "help", "Use these exact keys in actors or props."),
      input,
      list,
    );
    input.focus();
  }
  stopRecording(cancel) {
    if (!this.rec) return;
    this.cancelled = cancel;
    this.r.pause();
    if (this.rec.state !== "inactive") this.rec.stop();
  }
  async record() {
    await this.run(async () => {
      const r = this.r,
        c = $("preview");
      if (!c.captureStream || !window.MediaRecorder)
        throw Error(
          "WebM capture is unavailable in this browser. Try Chromium.",
        );
      const mime = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) throw Error("No WebM encoder available. Try Chromium.");
      r.pause();
      await r.audio.prepare(r.episode);
      r.seek(0);
      const stream = c.captureStream(CONFIG.fps);
      const audio = r.audio.dest.stream.getAudioTracks()[0].clone();
      stream.addTrack(audio);
      let rec;
      try {
        rec = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: 3000000,
        });
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        throw e;
      }
      this.rec = rec;
      const chunks = [];
      this.cancelled = false;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        this.rec = null;
        this.lock(false);
        $("export").innerHTML = icon("download") + "Export WebM";
        if (!this.cancelled && chunks.length) {
          download(new Blob(chunks, { type: mime }), r.episode.title + ".webm");
          this.note("WebM exported");
        } else this.note("Export cancelled");
      };
      rec.onerror = () => this.stopRecording(true);
      try {
        rec.start(250);
        this.note("Recording real time · keep this tab visible");
        $("export").textContent = "Cancel export";
        $("export").disabled = false;
        await r.play();
      } catch (e) {
        if (rec.state === "inactive") {
          stream.getTracks().forEach((t) => t.stop());
          this.rec = null;
        } else this.stopRecording(true);
        throw e;
      }
    });
  }
}
