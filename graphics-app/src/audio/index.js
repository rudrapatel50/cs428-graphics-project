// src/audio/index.js
// Ambient audio with smooth crossfade transitions.

let dayAudio;
let nightAudio;
let rainAudio;

let currentMode = "day";
let audioStarted = false;
let rainSoundEnabled = false;

const FADE_MS = 500;

// ─── Crossfade helper ───────────────────────────────────────────────

/**
 * Smoothly ramp an audio element's volume from → to over `duration` ms.
 * Automatically calls play() when fading in or pause() when fading out.
 */
function fadeAudio(audio, toVol, duration = FADE_MS) {
  if (!audio) return;

  const fromVol = audio.volume;

  // Fading in — start playback at 0 volume first
  if (toVol > 0 && audio.paused) {
    audio.volume = 0;
    audio.play().catch(() => {});
  }

  const startTime = performance.now();

  function tick() {
    const progress = Math.min((performance.now() - startTime) / duration, 1);
    audio.volume = fromVol + (toVol - fromVol) * progress;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (toVol === 0) {
      audio.pause();
    }
  }

  requestAnimationFrame(tick);
}

// ─── Public API ─────────────────────────────────────────────────────

export function createAmbientAudio() {
  dayAudio = new Audio("/audio/day.mp3");
  nightAudio = new Audio("/audio/night.mp3");
  rainAudio = new Audio("/audio/rain.mp3");

  dayAudio.loop = true;
  nightAudio.loop = true;
  rainAudio.loop = true;

  dayAudio.volume = 0.45;
  nightAudio.volume = 0.45;
  rainAudio.volume = 0.5;
}

export function startAmbientAudio() {
  if (audioStarted) return;

  audioStarted = true;

  if (currentMode === "night") {
    nightAudio.play().catch(() => {});
  } else {
    dayAudio.play().catch(() => {});
  }

  if (rainSoundEnabled) {
    rainAudio.play().catch(() => {});
  }
}

export function setAmbientMode(mode) {
  currentMode = mode;

  if (!audioStarted) return;

  if (mode === "night") {
    fadeAudio(dayAudio, 0);
    fadeAudio(nightAudio, 0.45);
  } else {
    fadeAudio(nightAudio, 0);
    fadeAudio(dayAudio, 0.45);
  }
}

export function toggleRainAudio() {
  rainSoundEnabled = !rainSoundEnabled;

  if (!audioStarted) return rainSoundEnabled;

  if (rainSoundEnabled) {
    fadeAudio(rainAudio, 0.5);
  } else {
    fadeAudio(rainAudio, 0);
  }

  return rainSoundEnabled;
}