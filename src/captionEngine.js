import { drawGraph } from "./dataViz.js";
// Composite the print graphics and subtitles into the recorded canvas itself.
export function composite(ctx, image, episode, s, index, t) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, w, h);
  ctx.save();
  ctx.scale(w / 540, h / 960);
  const grad = ctx.createLinearGradient(0, 530, 0, 960);
  grad.addColorStop(0, "#13142000");
  grad.addColorStop(1, "#131420c9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 530, 540, 430);
  ctx.font = "bold 15px monospace";
  ctx.fillStyle = "#222236b3";
  ctx.fillRect(28, 35, 170, 33);
  ctx.fillStyle = "#e5efc5";
  ctx.fillRect(40, 47, 8, 8);
  ctx.fillText("FIELD STUDY / " + String(index + 1).padStart(2, "0"), 57, 57);
  ctx.strokeStyle = "#fffa";
  ctx.lineWidth = 2;
  for (const [x, y, a, b] of [
    [20, 20, 1, 1],
    [520, 20, -1, 1],
    [20, 940, 1, -1],
    [520, 940, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + a * 16, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + b * 16);
    ctx.stroke();
  }
  for (const ev of s.events ?? []) if (ev.show_graph) drawGraph(ctx, ev, t);
  const c = s.captions.findLast((c) => c.time <= t);
  if (!c) {
    ctx.restore();
    return;
  }
  const words = c.text.trim().split(/\s+/);
  ctx.font = "900 54px Arial, sans-serif";
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = (line + " " + word).trim();
    if (line && ctx.measureText(test).width > 445) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  lines.push(line);
  ctx.translate(
    270,
    (s.captionPosition === "lower" ? 750 : 480) - ((lines.length - 1) * 59) / 2,
  );
  const k =
    1 - 0.24 * Math.exp(-16 * (t - c.time)) * Math.cos(26 * (t - c.time));
  ctx.scale(k, k);
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 11;
  let offset = 0;
  for (const [i, l] of lines.entries()) {
    const size = ctx.measureText(l).width,
      scale = Math.min(1, 455 / size);
    ctx.save();
    ctx.scale(scale, 1);
    let x = -size / 2;
    const y = i * 59;
    ctx.strokeStyle = "#09090d";
    ctx.shadowColor = "#000";
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 3;
    ctx.strokeText(l, x, y);
    ctx.shadowColor = "transparent";
    for (const ch of l.split(" ")) {
      let hit = false;
      if (c.highlight) {
        const start = c.text.indexOf(c.highlight);
        hit = offset < start + c.highlight.length && offset + ch.length > start;
      }
      ctx.fillStyle = hit ? "#d9faa9" : "#fffcf2";
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch + " ").width;
      offset += ch.length + 1;
    }
    ctx.restore();
  }
  ctx.restore();
}
