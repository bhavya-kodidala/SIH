/**
 * RakshaNet Emergency Siren System
 *
 * Implements a strict, professional singleton emergency siren.
 * Guarantees:
 * - EXACTLY ONE active AudioContext and oscillator at any given time.
 * - Complete idempotency: calling start() multiple times never layers or echoes audio.
 * - Clean start and tear-down: all nodes stopped and disconnected on stop.
 * - Single-voice pure emergency wail tone (no reverb, delay, or acoustic clashing).
 */

const AudioContextClass =
  typeof window !== "undefined"
    ? window.AudioContext || window.webkitAudioContext
    : null;

// Module-level singleton state (survives React re-renders and navigation)
let audioCtx = null;
let mainOsc = null;
let lfoOsc = null;
let lfoGain = null;
let masterGain = null;
let isSirenActive = false;

// Subscribers for UI state synchronization
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(isSirenActive);
    } catch (_) {}
  });
}

/**
 * Cleanly tear down all Web Audio nodes and close the AudioContext.
 */
function cleanupNodes() {
  if (mainOsc) {
    try {
      mainOsc.stop();
    } catch (_) {}
    try {
      mainOsc.disconnect();
    } catch (_) {}
    mainOsc = null;
  }

  if (lfoOsc) {
    try {
      lfoOsc.stop();
    } catch (_) {}
    try {
      lfoOsc.disconnect();
    } catch (_) {}
    lfoOsc = null;
  }

  if (lfoGain) {
    try {
      lfoGain.disconnect();
    } catch (_) {}
    lfoGain = null;
  }

  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch (_) {}
    masterGain = null;
  }

  if (audioCtx) {
    try {
      if (audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    } catch (_) {}
    audioCtx = null;
  }
}

/**
 * Starts the emergency siren.
 * IDEMPOTENT: If already playing, returns immediately without creating any audio nodes.
 */
export function startEmergencySiren() {
  // If already active, DO NOT create another instance or layer audio.
  if (isSirenActive) {
    return;
  }

  if (!AudioContextClass) {
    console.warn("[SIREN] Web Audio API is not supported in this browser.");
    return;
  }

  try {
    // Ensure any leftover nodes from a previous session are completely cleaned up
    cleanupNodes();

    const ctx = new AudioContextClass();

    // If context is suspended (browser autoplay policy), resume it
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // ── Single Main Siren Oscillator ──────────────────────────────────────────
    // Uses a clean sine wave with smooth periodic pitch modulation
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 720; // Center pitch (Hz)

    // ── Single LFO (Low-Frequency Oscillator) for Pitch Modulation ────────────
    // Sweeps smoothly between 540 Hz and 900 Hz at 0.9 Hz (clean emergency wail)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.9; // 0.9 cycles per second — standard emergency tempo

    const lGain = ctx.createGain();
    lGain.gain.value = 180; // Modulation depth (±180 Hz: 540 Hz <-> 900 Hz)

    lfo.connect(lGain);
    lGain.connect(osc.frequency);

    // ── Single Master Gain Node ───────────────────────────────────────────────
    // Smooth ramp-in to avoid any speaker pop or sudden harsh transient
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.08); // Clean, comfortable emergency volume

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);

    // Store references in singleton
    audioCtx = ctx;
    mainOsc = osc;
    lfoOsc = lfo;
    lfoGain = lGain;
    masterGain = gain;
    isSirenActive = true;

    notifyListeners();
  } catch (err) {
    console.warn("[SIREN] Failed to start emergency siren:", err);
    cleanupNodes();
    isSirenActive = false;
    notifyListeners();
  }
}

/**
 * Stops the emergency siren immediately and cleanly releases all audio resources.
 * IDEMPOTENT: Safe to call repeatedly.
 */
export function stopEmergencySiren() {
  if (!isSirenActive && !audioCtx) {
    return;
  }

  isSirenActive = false;
  notifyListeners();

  if (masterGain && audioCtx && audioCtx.state !== "closed") {
    try {
      const now = audioCtx.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      setTimeout(() => {
        cleanupNodes();
      }, 50);
      return;
    } catch (_) {}
  }

  cleanupNodes();
}

/**
 * Toggles the emergency siren on or off.
 */
export function toggleEmergencySiren() {
  if (isSirenActive) {
    stopEmergencySiren();
  } else {
    startEmergencySiren();
  }
}

/**
 * Returns whether the emergency siren is currently active.
 */
export function isEmergencySirenActive() {
  return isSirenActive;
}

/**
 * Subscribe to emergency siren state changes.
 * @param {(active: boolean) => void} fn
 * @returns {() => void} unsubscribe function
 */
export function subscribeSirenState(fn) {
  listeners.add(fn);
  // Immediate callback with current state
  try {
    fn(isSirenActive);
  } catch (_) {}
  return () => {
    listeners.delete(fn);
  };
}

// Ensure cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    stopEmergencySiren();
  });
}
