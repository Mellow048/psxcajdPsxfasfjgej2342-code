// Kept independent of WebGL so CI and the static editor enforce identical limits.
export const STORY_KEYS = [
  "show_phone",
  "show_tv",
  "spawn_mass",
  "show_whiteboard",
  "show_graph",
];
export const storyKey = (ev) => STORY_KEYS.find((k) => Object.hasOwn(ev, k));
export function validateStoryEvent(ev, key, shot, { check, keys, vec }) {
  const label = (v, n) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= n;
  const positioned =
    key === "spawn_mass" ||
    key === "show_whiteboard" ||
    key === "show_phone" ||
    key === "show_tv";
  keys(ev, `${key} time sfx duration${positioned ? " position" : ""}`);
  check(
    Number.isFinite(ev.time) && ev.time >= 0 && ev.time < shot.duration,
    "invalid visual event time",
  );
  const life = ev.duration ?? shot.duration - ev.time;
  check(
    Number.isFinite(life) && life > 0 && ev.time + life <= shot.duration + 1e-8,
    "visual event duration exceeds shot",
  );
  check(
    [
      "pop",
      "click",
      "ding",
      "whoosh",
      "ui_pop",
      "whoosh_fast",
      "cash_register",
      "heavy_thud",
      "buzzer",
    ].includes(ev.sfx),
    "visual event requires a synthesized cue",
  );
  check(
    ev.position === undefined || vec(ev.position),
    "invalid visual event position",
  );
  const v = ev[key];
  if (key === "show_phone" || key === "show_tv") {
    keys(v, v?.app === "bank" ? "app balance debit" : "app avatar");
    check(
      v.app === "bank"
        ? label(v.balance, 18) && (v.debit === undefined || label(v.debit, 20))
        : v.app === "video_call" && v.avatar === "guru",
      "expected bank balance or guru video call",
    );
  }
  if (key === "spawn_mass") {
    keys(v, "prop count formation reveal");
    check(
      v.reveal === undefined ||
        (Number.isFinite(v.reveal) && v.reveal > 0 && v.reveal <= life),
      "invalid reveal window",
    );
    check(
      v.prop === "casino_chip" &&
        ["grid_wall", "table_tower", "bet_stack"].includes(v.formation),
      "unknown mass prop or formation",
    );
    check(
      Number.isInteger(v.count) && v.count >= 1 && v.count <= 4096,
      "mass count must be 1–4096",
    );
  }
  if (key === "show_whiteboard") {
    keys(v, "title nodes edges transition");
    check(
      label(v.title, 35) &&
        Array.isArray(v.nodes) &&
        v.nodes.length >= 1 &&
        v.nodes.length <= 12,
      "invalid whiteboard title or nodes",
    );
    check(
      v.transition === undefined ||
        (Number.isFinite(v.transition) &&
          v.transition > 0 &&
          v.transition <= life),
      "invalid board transition",
    );
    const ids = new Set();
    for (const n of v.nodes) {
      keys(n, "id kind label x y");
      check(
        label(n.id, 24) &&
          !ids.has(n.id) &&
          label(n.label, 16) &&
          ["step", "win", "loss"].includes(n.kind),
        "invalid or duplicate whiteboard node",
      );
      check(
        [n.x, n.y].every((a) => Number.isFinite(a) && a >= 0 && a <= 1),
        "board coordinates must be 0–1",
      );
      ids.add(n.id);
    }
    check(
      Array.isArray(v.edges) &&
        v.edges.length <= 24 &&
        v.edges.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p[0] !== p[1] &&
            p.every((id) => ids.has(id)),
        ),
      "invalid whiteboard edge",
    );
  }
  if (key === "show_graph") {
    keys(v, "label start end drawTime unit lossStreak cueAt");
    check(
      label(v.label, 32) && (v.unit === undefined || label(v.unit, 5)),
      "invalid graph label or unit",
    );
    check(
      [v.start, v.end].every(
        (x) =>
          Number.isFinite(x) && x >= (v.lossStreak ? 0 : 0.0001) && x <= 1e12,
      ) && v.start !== v.end,
      "exponential graph needs unequal positive endpoints",
    );
    check(
      v.cueAt === undefined || v.cueAt === "end",
      "invalid graph cue timing",
    );
    if (v.lossStreak !== undefined)
      check(
        Number.isInteger(v.lossStreak) &&
          v.lossStreak >= 1 &&
          v.lossStreak <= 24 &&
          v.start > v.end,
        "invalid doubling loss streak",
      );
    check(
      Number.isFinite(v.drawTime) && v.drawTime > 0 && v.drawTime <= life,
      "invalid graph drawTime",
    );
  }
}
