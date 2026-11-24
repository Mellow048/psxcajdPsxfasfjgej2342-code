import { MODELS, SOUNDS } from "./catalog.js";
export const CONFIG = {
  width: 540,
  height: 960,
  fps: 30,
  hz: 60,
  psx: { grid: 160, gridHeight: 240, affine: 1, dither: 1, scale: 1 / 3 },
};
export const SCENE_PRESETS = {
  platform_three: { color: 0x192833, fog: 0x283b49 },
  retina_tunnel: { color: 0x371d36, fog: 0x382339 },
  signal_dark: { color: 0x05060c, fog: 0x05060c },
  light_gallery: { color: 0x234450, fog: 0x426164 },
  casino_room: { color: 0x432737, fog: 0x4c2b39 },
  blizzard: { color: 0x8999b1, fog: 0xb5c9d9 },
  graveyard: { color: 0x716691, fog: 0x706088 },
  backstage: { color: 0x342842, fog: 0x40304c },
  optics_lab: { color: 0x203646, fog: 0x284453 },
  void: { color: 0x262433, fog: 0x2c2939 },
  window_day: { color: 0x92bada, fog: 0xa8c3d9, reflection: 0.1 },
  window_night: { color: 0x172642, fog: 0x27304b, reflection: 0.68 },
  house_corner: {
    color: 0x554759,
    fog: 0x685662,
    layout: [
      {
        asset: "quequis_house.quequis_house_props",
        mesh: "Armchair",
        height: 1.2,
        position: [-1, 0, -1.45],
        yaw: 0.28,
      },
      {
        asset: "quequis_house.quequis_house_props",
        mesh: "Table",
        height: 0.85,
        position: [1.12, 0, -1.65],
      },
      {
        asset: "quequis_house.quequis_house_props",
        mesh: "Painting",
        height: 0.78,
        position: [0, 1.45, -2.36],
      },
    ],
  },
};
export const BUILTINS = [
  "evo_cat",
  "car_window",
  "section_eye",
  "sheet",
  "pane",
  "lamp",
  "eye",
  "arrow",
  "rays",
  "label",
];
export const ASSET_MANIFEST = {
  ...MODELS,
  ...Object.fromEntries(BUILTINS.map((k) => [k, { builtin: true, clips: [] }])),
};
export const MUSIC_PRESETS = {
  tense_heartbeat: { track: "episodes/tense-heartbeat.wav", volume: 0.44 },
  synthwave_tense: {
    track: "episodes/synthwave-tense.wav",
    volume: 0.34,
    seamless: true,
  },
};
export const SFX_MANIFEST = {
  whoosh_fast: "synth",
  ui_pop: "synth",
  ding: "synth",
  whoosh: "synth",
  riser: "synth",
  click: "synth",
  ...Object.fromEntries(SOUNDS.map((p) => [p, p])),
};
export const CAMERAS = [
  "wide_orbit",
  "dutch_tilt_push",
  "macro_closeup",
  "over_shoulder",
  "whip_pan_to_prop",
];
export const MOTIONS = [
  "idle_breathe",
  "talking",
  "pointing",
  "cup_hands",
  "thinking",
  "place_bet",
  "wince",
  "shiver",
  "grumpy",
  "shocked",
  "float_spin",
  "pop_in",
];

export const CAMERA_MOTIONS = [
  "slow_push",
  "slow_pull",
  "orbit_drift",
  "handheld_bob",
];
export const ICONS = ["Sun", "Moon", "Lightbulb", "Eyeball"];
