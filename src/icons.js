const paths = {
  book: "M3 4h6q3 0 3 2 0-2 3-2h6v15h-6q-3 0-3 2 0-2-3-2H3z M12 6v14",
  film: "M3 4h18v16H3zM7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4",
  layers: "m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4",
  monitor: "M3 4h18v13H3zM8 21h8m-4-4v4",
  sliders: "M4 6h6m4 0h6M4 12h11m4 0h1M4 18h2m4 0h10M10 3v6m5 0v6m-9 0v6",
  reset: "M3 5v5h5M4 9a8 8 0 1 1 1 9",
  chip: "M6 6h12v12H6z M9 3v3m6-3v3m-6 12v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M10 10h4v4h-4z",
  cpu: "M4 5h16v14H4zM7 8h10v8H7z",
  timeline: "M3 5h18v4H3zm0 9h8v4H3zm11 0h7v4h-7z",
  prev: "M5 5v14m13-14L8 12l10 7z",
  next: "M19 5v14M6 5l10 7-10 7z",
  play: "m7 4 13 8-13 8z",
  pause: "M7 5h3v14H7zm7 0h3v14h-3z",
  volume: "M3 9h4l5-5v16l-5-5H3zM16 8q5 4 0 8m2-11q8 7 0 14",
  mute: "M3 9h4l5-5v16l-5-5H3zM16 9l6 6m0-6-6 6",
};
export function icon(k) {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="${["play", "pause"].includes(k) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[k]}"/></svg>`;
}
