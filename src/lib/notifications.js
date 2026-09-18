/**
 * Web Notification & Audio Alert System
 * Manages browser push notifications, sound cues, and authority broadcasts.
 */

/** Play a synthesized emergency alert chime via Web Audio API */
export function playAlertChime(type = "alert") {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "broadcast" || type === "critical") {
      // High-low two-tone alert
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587.33, now + 0.15);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Pleasant status chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.45);
    }
    // Cleanly close temporary context after chime completes
    setTimeout(() => {
      try {
        if (ctx.state !== "closed") ctx.close().catch(() => {});
      } catch (_) {}
    }, 800);
  } catch (err) {
    // AudioContext blocked by browser policy
  }
}

/** Check if Notification API is supported */
export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Get current permission state */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/** Request notification permission */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Send a native browser push notification if permitted */
export function sendBrowserNotification(title, options = {}) {
  if (!isNotificationSupported()) return;

  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        ...options,
      });
    } catch {
      // Some mobile browsers require ServiceWorkerRegistration.showNotification
      if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        });
      }
    }
  }
}
