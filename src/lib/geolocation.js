/**
 * Real Device Geolocation Engine with continuous watchPosition tracking.
 * Strictly avoids mock, fake, or fallback coordinates (no "Kavali" or dummy locations).
 * Provides live accuracy monitoring, error categorization, and status states:
 * - "Acquiring": Tracking initiated, waiting for fix
 * - "Active": Fix acquired with high accuracy (<= 100m)
 * - "Low Accuracy": Fix acquired but accuracy > 100m
 * - "Unavailable": Hardware or network couldn't determine location
 * - "Permission Denied": User denied location access
 */

export class GeoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GeoError";
    this.code = code; // "unsupported" | "denied" | "unavailable" | "timeout" | "unknown"
  }
}

export function isGeolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

const HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 15000,
};

function determineStatus(accuracy) {
  if (accuracy == null) return "Acquiring";
  return accuracy <= 100 ? "Active" : "Low Accuracy";
}

/**
 * Perform a one-time high-accuracy position fetch.
 * Returns Promise<{ lat, lng, accuracy, timestamp, status }>
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new GeoError("unsupported", "This browser doesn't support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: accuracy,
          timestamp: position.timestamp,
          status: determineStatus(accuracy),
          source: "gps",
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeoError("denied", "Location access was denied. Enable it in your browser or device settings."));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new GeoError("unavailable", "Device location is currently unavailable."));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeoError("timeout", "Getting your location timed out. Please retry."));
        } else {
          reject(new GeoError("unknown", "Unable to acquire location fix."));
        }
      },
      { ...HIGH_ACCURACY_OPTIONS, ...options }
    );
  });
}

/**
 * Continuously watch device position using navigator.geolocation.watchPosition.
 * 
 * @param {Function} onUpdate - callback({ lat, lng, accuracy, timestamp, status, error: null })
 * @param {Function} onError - callback({ lat, lng, accuracy, timestamp, status, error })
 * @param {Object} options - GeolocationOptions
 * @returns {Function} unwatch - function to stop watching
 */
export function watchDeviceLocation(onUpdate, onError, options = {}) {
  if (!isGeolocationSupported()) {
    const err = new GeoError("unsupported", "Location services are unsupported on this browser.");
    if (onError) {
      onError({
        lat: null,
        lng: null,
        accuracy: null,
        timestamp: Date.now(),
        status: "Unavailable",
        error: err.message,
      });
    }
    return () => {};
  }

  // Initial state callback: Acquiring
  if (onUpdate) {
    onUpdate({
      lat: null,
      lng: null,
      accuracy: null,
      timestamp: Date.now(),
      status: "Acquiring",
      error: null,
    });
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const accuracy = position.coords.accuracy;
      const status = determineStatus(accuracy);
      if (onUpdate) {
        onUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: accuracy,
          timestamp: position.timestamp,
          status: status,
          error: null,
          source: "gps",
        });
      }
    },
    (err) => {
      let code = "unknown";
      let message = "Location unavailable.";
      let status = "Unavailable";

      if (err.code === err.PERMISSION_DENIED) {
        code = "denied";
        message = "Location access was denied in browser/device settings.";
        status = "Permission Denied";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        code = "unavailable";
        message = "Your device cannot detect a GPS/network position right now.";
        status = "Unavailable";
      } else if (err.code === err.TIMEOUT) {
        code = "timeout";
        message = "Acquiring location timed out. Retrying…";
        status = "Unavailable";
      }

      if (onError) {
        onError({
          lat: null,
          lng: null,
          accuracy: null,
          timestamp: Date.now(),
          status: status,
          error: message,
          code: code,
        });
      }
    },
    { ...HIGH_ACCURACY_OPTIONS, ...options }
  );

  return () => {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch {}
  };
}
