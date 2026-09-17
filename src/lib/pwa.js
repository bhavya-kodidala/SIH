/**
 * PWA Registration & Offline Emergency Queue Integration
 *
 * Bridges Service Worker registration and IndexedDB offline persistence.
 */

import {
  openDatabase,
  queueEmergencyItem,
  getEmergencyQueue,
  removeQueuedEmergency,
  clearStore,
} from "./offlineDb";
import { syncPendingEmergencyQueue } from "./syncManager";

/** Register Service Worker in browser */
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Initialize DB connection in background
          openDatabase().catch(() => {});
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    });
  }
}

/** Get all items currently in the offline queue (Async from IndexedDB) */
export async function getOfflineQueue() {
  try {
    return await getEmergencyQueue();
  } catch (err) {
    console.warn("Failed to read emergency queue from IndexedDB:", err);
    return [];
  }
}

/** Save an emergency item (SOS or Report) to offline IndexedDB queue */
export async function queueOfflineItem(item) {
  try {
    return await queueEmergencyItem(item);
  } catch (err) {
    console.error("Failed to queue offline emergency item in IndexedDB:", err);
    return item;
  }
}

/** Remove an item from the offline queue */
export async function removeQueuedItem(queueId) {
  try {
    await removeQueuedEmergency(queueId);
    return await getEmergencyQueue();
  } catch (err) {
    console.error("Failed to remove queued item:", err);
    return [];
  }
}

/** Clear all queued items */
export async function clearOfflineQueue() {
  try {
    await clearStore("emergency_queue");
  } catch (err) {
    console.error("Failed to clear emergency queue:", err);
  }
}

/** Process and sync pending queue items when connection returns */
export async function syncOfflineQueue(onSyncSuccess) {
  return syncPendingEmergencyQueue(onSyncSuccess);
}
