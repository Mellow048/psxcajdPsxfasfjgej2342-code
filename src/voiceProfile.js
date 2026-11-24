// Local fallback for new text, distinct from the selected studio takes on the demos.
export const OFFLINE_VOICE = "rms"; // CMU US English, masculine
export const DEFAULT_SPEECH_RATE = 1.08;

export const takeRate = (e) =>
  e.speechRate ?? (e.narratorStyle === "urgent" ? 1.4 : DEFAULT_SPEECH_RATE);
