/**
 * Primary Persistent Offline Database for RakshaNet using native IndexedDB.
 *
 * Stores structured disaster data locally so that the application is fully
 * functional even with complete internet severance:
 * - emergency_queue: SOS alerts and incident reports awaiting server sync
 * - incident_reports: Historic and newly filed disaster incident reports
 * - emergency_contacts: Saved relatives, doctors, and community responders
 * - cached_facilities: Hospitals, police, fire stations, and emergency shelters
 * - survival_guides: Offline disaster checklists and survival protocols
 * - last_known_location: Cached GPS coordinates and resolved locality
 * - app_state: Cached weather conditions, offline map state, user session
 */

const DB_NAME = "RakshaNetDB";
const DB_VERSION = 1;

let dbInstancePromise = null;

export function openDatabase() {
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported on this device/browser."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Emergency Queue
      if (!db.objectStoreNames.contains("emergency_queue")) {
        const queueStore = db.createObjectStore("emergency_queue", { keyPath: "queueId" });
        queueStore.createIndex("queuedAt", "queuedAt", { unique: false });
      }

      // 2. Incident Reports
      if (!db.objectStoreNames.contains("incident_reports")) {
        const reportStore = db.createObjectStore("incident_reports", { keyPath: "id" });
        reportStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // 3. Emergency Contacts
      if (!db.objectStoreNames.contains("emergency_contacts")) {
        db.createObjectStore("emergency_contacts", { keyPath: "id" });
      }

      // 4. Cached Facilities (Overpass data)
      if (!db.objectStoreNames.contains("cached_facilities")) {
        const facStore = db.createObjectStore("cached_facilities", { keyPath: "id" });
        facStore.createIndex("type", "type", { unique: false });
      }

      // 5. Survival Guides
      if (!db.objectStoreNames.contains("survival_guides")) {
        db.createObjectStore("survival_guides", { keyPath: "id" });
      }

      // 6. Last Known Location
      if (!db.objectStoreNames.contains("last_known_location")) {
        db.createObjectStore("last_known_location", { keyPath: "key" });
      }

      // 7. App State & Key-Value Metadata
      if (!db.objectStoreNames.contains("app_state")) {
        db.createObjectStore("app_state", { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB open error:", event.target.error);
      reject(event.target.error);
    };
  });

  return dbInstancePromise;
}

/* =========================================================================
   GENERIC STORE HELPERS
   ========================================================================= */

async function getStore(storeName, mode = "readonly") {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export async function getAllFromStore(storeName) {
  try {
    const store = await getStore(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`IndexedDB getAll(${storeName}) failed:`, err);
    return [];
  }
}

export async function putInStore(storeName, item) {
  try {
    const store = await getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`IndexedDB put(${storeName}) failed:`, err);
    throw err;
  }
}

export async function deleteFromStore(storeName, key) {
  try {
    const store = await getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`IndexedDB delete(${storeName}, ${key}) failed:`, err);
    throw err;
  }
}

export async function clearStore(storeName) {
  try {
    const store = await getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`IndexedDB clear(${storeName}) failed:`, err);
  }
}

/* =========================================================================
   1. EMERGENCY QUEUE (OFFLINE SOS & INCIDENT QUEUE)
   ========================================================================= */

export async function queueEmergencyItem(item) {
  const queueId = item.queueId || "QUEUE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  const queuedItem = {
    ...item,
    queueId,
    queuedAt: item.queuedAt || new Date().toISOString(),
    synced: false,
  };
  await putInStore("emergency_queue", queuedItem);
  return queuedItem;
}

export async function getEmergencyQueue() {
  const items = await getAllFromStore("emergency_queue");
  // Sort descending by queuedAt
  return items.sort((a, b) => new Date(b.queuedAt) - new Date(a.queuedAt));
}

export async function removeQueuedEmergency(queueId) {
  return deleteFromStore("emergency_queue", queueId);
}

/* =========================================================================
   2. INCIDENT REPORTS
   ========================================================================= */

export async function saveIncidentReport(report) {
  await putInStore("incident_reports", report);
  return report;
}

export async function getIncidentReports() {
  const reports = await getAllFromStore("incident_reports");
  return reports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/* =========================================================================
   3. EMERGENCY CONTACTS
   ========================================================================= */

export async function saveEmergencyContacts(contacts) {
  const db = await openDatabase();
  const tx = db.transaction("emergency_contacts", "readwrite");
  const store = tx.objectStore("emergency_contacts");
  store.clear();
  contacts.forEach((c) => store.put(c));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEmergencyContacts() {
  return getAllFromStore("emergency_contacts");
}

/* =========================================================================
   4. CACHED EMERGENCY FACILITIES
   ========================================================================= */

export async function cacheFacilities(facilities, coordinate = null) {
  const cachedAt = Date.now();
  const db = await openDatabase();
  const tx = db.transaction(["cached_facilities", "app_state"], "readwrite");
  const facStore = tx.objectStore("cached_facilities");
  const stateStore = tx.objectStore("app_state");

  facStore.clear();
  facilities.forEach((f) => facStore.put({ ...f, cachedAt }));

  stateStore.put({
    key: "facilities_meta",
    cachedAt,
    count: facilities.length,
    coordinate,
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ count: facilities.length, cachedAt });
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedFacilities() {
  const facilities = await getAllFromStore("cached_facilities");
  const meta = await getAppState("facilities_meta");
  return {
    facilities,
    cachedAt: meta?.cachedAt || (facilities[0]?.cachedAt ?? null),
    count: facilities.length,
  };
}

/* =========================================================================
   5. LAST KNOWN LOCATION
   ========================================================================= */

export async function saveLastKnownLocation(location) {
  if (!location) return;
  const payload = {
    key: "current",
    ...location,
    updatedAt: Date.now(),
  };
  await putInStore("last_known_location", payload);
  return payload;
}

export async function getLastKnownLocation() {
  try {
    const store = await getStore("last_known_location", "readonly");
    return new Promise((resolve) => {
      const req = store.get("current");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/* =========================================================================
   6. APP STATE (WEATHER, OFFLINE MAP, SESSION)
   ========================================================================= */

export async function saveAppState(key, value) {
  await putInStore("app_state", { key, ...value, savedAt: Date.now() });
}

export async function getAppState(key) {
  try {
    const store = await getStore("app_state", "readonly");
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
