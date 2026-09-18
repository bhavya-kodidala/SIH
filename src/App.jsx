import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import {
  MapPin, Phone, Users, MoreVertical, Map as MapIcon, FileWarning, Siren,
  Building2, ShieldCheck, X, ChevronRight, ChevronLeft, Plus, Camera, Video,
  Mic, CheckCircle2, Navigation2, Sun, Moon, Globe, Info, Search,
  Star, Trash2, Pencil, Flame, Stethoscope, Car, Waves, Mountain,
  Building, UserX, CloudRain, HelpCircle, Square, Clock, ClipboardList,
  BadgeCheck, ChevronDown, Volume2, VolumeX, LocateFixed, PhoneCall,
  Fingerprint, KeyRound, Loader2, ShieldAlert,
  WifiOff, Wifi, Send, Share2, Radio, BellRing, BookOpen, AlertTriangle,
  CloudLightning, Wind, Droplets, Thermometer, RefreshCw, MessageSquare,
  Download, Check
} from "lucide-react";
import { checkUserExists, registerPasskey, loginWithPasskey, isWebAuthnSupported, verifyCurrentSession, logout, clearSession } from "./lib/auth";
import { supabase } from "./lib/supabaseClient";
import { getCurrentPosition, watchDeviceLocation } from "./lib/geolocation";
import { reverseGeocode, searchLocation } from "./lib/geocoding";
import { fetchNearbyFacilities } from "./lib/facilities";
import { coloredDotIcon, youAreHereIcon } from "./lib/mapIcons";
import { getOfflineQueue, queueOfflineItem, syncOfflineQueue } from "./lib/pwa";
import { generateSosMessage, generateReportMessage, openWhatsApp, openSms, blastWhatsAppToContacts } from "./lib/messaging";
import { fetchLiveWeatherAndHazard } from "./lib/weather";
import { playAlertChime, isNotificationSupported, getNotificationPermission, requestNotificationPermission, sendBrowserNotification } from "./lib/notifications";
import {
  startEmergencySiren,
  stopEmergencySiren,
  toggleEmergencySiren,
  isEmergencySirenActive,
  subscribeSirenState,
} from "./lib/emergencyAudio";
import { SURVIVAL_GUIDES } from "./lib/survivalGuides";
import {
  cacheFacilities,
  getCachedFacilities,
  saveLastKnownLocation,
  getLastKnownLocation,
  saveAppState,
  getAppState,
  getIncidentReports,
  saveIncidentReport,
  saveEmergencyContacts,
  getEmergencyContacts,
} from "./lib/offlineDb";
import {
  cacheEmergencyAreaTiles,
  getCachedMapStatus,
  clearOfflineMapCache,
  estimateTileCountAndSize,
  OfflineTileLayer,
} from "./lib/mapTiles";
import { initAutoSync, syncPendingEmergencyQueue, subscribeToSyncEvents } from "./lib/syncManager";


/* =========================================================================
   DESIGN TOKENS
   ========================================================================= */
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');";

const LIGHT = {
  bg: "#F5F7F8",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F4",
  border: "#DDE3E7",
  ink: "#12181F",
  inkSoft: "#5B6772",
  primary: "#0F3D5C",
  primarySoft: "#E7EEF3",
  safe: "#12805F",
  safeSoft: "#E4F3ED",
  warn: "#C97A00",
  warnSoft: "#FBEBD3",
  danger: "#D62828",
  dangerSoft: "#FBE2E2",
  critical: "#8A1220",
  headerText: "#FFFFFF",
};
const DARK = {
  bg: "#0B1117",
  surface: "#141C24",
  surfaceAlt: "#1B2530",
  border: "#28333F",
  ink: "#EDF1F4",
  inkSoft: "#96A3AF",
  primary: "#4C8FBE",
  primarySoft: "#1B2C38",
  safe: "#3FBF93",
  safeSoft: "#12291F",
  warn: "#F2A93B",
  warnSoft: "#2E2412",
  danger: "#FF5A5A",
  dangerSoft: "#331414",
  critical: "#FF8080",
  headerText: "#F5F7F8",
};

const STRINGS = {
  en: {
    appName: "RakshaNet",
    passkeyCreateHint: "Register this device using fingerprint, face recognition, or device PIN.",
    newUserLink: "New user? Create Passkey",
    existingUserLink: "Already registered? Sign in with Passkey",
    signOut: "Sign Out",

    tagline: "Emergency response, one tap away",
    phone: "Phone number",
    passkeyContinue: "Continue with Passkey", passkeyCreate: "Create Passkey",
    passkeyHint: "Use your device's fingerprint, face recognition, or device PIN.",
    passkeyChecking: "Checking your account…", passkeyCreating: "Creating your passkey…",
    passkeyVerifying: "Verifying your passkey…", passkeyCreated: "Passkey created successfully",
    passkeyUnsupported: "Passkeys are not supported on this device or browser.",
    invalidPhone: "Enter a valid 10-digit mobile number.",
    fetchingLoc: "Finding your location…", locFound: "Location found",
    manualLoc: "Enter location manually", allowLoc: "Allow location access",
    continueApp: "Continue",
    navMaps: "Maps", navReport: "Report", navSos: "SOS", navShelter: "Shelter", navAuthority: "Authority",
    contacts: "Contacts", currentLocation: "Current location",
    theme: "Theme", language: "Language", siren: "Emergency siren", about: "About",
  },
  te: {
    appName: "RakshaNet",
    passkeyCreateHint: "ఫింగర్‌ప్రింట్, ఫేస్ లేదా PIN తో మీ పరికరాన్ని నమోదు చేయండి.",
    newUserLink: "కొత్త వినియోగదారులా? పాస్‌కీ సృష్టించండి",
    existingUserLink: "ఇప్పటికే ఖాతా ఉందా? పాస్‌కీతో లాగిన్ అవ్వండి",
    signOut: "సైన్ అవుట్",
    tagline: "అత్యవసర సహాయం, ఒక్క నొక్కుతో",
    phone: "ఫోన్ నంబర్",
    passkeyContinue: "పాస్‌కీతో కొనసాగించండి", passkeyCreate: "పాస్‌కీ సృష్టించండి",
    passkeyHint: "మీ పరికరం యొక్క ఫింగర్‌ప్రింట్, ఫేస్ రికగ్నిషన్ లేదా PIN ఉపయోగించండి.",
    passkeyChecking: "మీ ఖాతాను తనిఖీ చేస్తోంది…", passkeyCreating: "పాస్‌కీని సృష్టిస్తోంది…",
    passkeyVerifying: "పాస్‌కీని ధృవీకరిస్తోంది…", passkeyCreated: "పాస్‌కీ విజయవంతంగా సృష్టించబడింది",
    passkeyUnsupported: "ఈ పరికరం లేదా బ్రౌజర్‌లో పాస్‌కీలు మద్దతు లేవు.",
    invalidPhone: "సరైన 10-అంకెల మొబైల్ నంబర్ నమోదు చేయండి.",
    fetchingLoc: "మీ లొకేషన్ కనుగొంటోంది…", locFound: "లొకేషన్ దొరికింది",
    manualLoc: "మాన్యువల్‌గా నమోదు చేయండి", allowLoc: "లొకేషన్ యాక్సెస్ ఇవ్వండి",
    continueApp: "కొనసాగించు",
    navMaps: "మ్యాప్స్", navReport: "రిపోర్ట్", navSos: "SOS", navShelter: "షెల్టర్", navAuthority: "అథారిటీ",
    contacts: "కాంటాక్ట్స్", currentLocation: "ప్రస్తుత లొకేషన్",
    theme: "థీమ్", language: "భాష", siren: "అత్యవసర సైరన్", about: "గురించి",
  },
  hi: {
    appName: "RakshaNet",
    passkeyCreateHint: "फिंगरप्रिंट, फेस या PIN से अपना डिवाइस पंजीकृत करें।",
    newUserLink: "नए उपयोगकर्ता? पासकी बनाएं",
    existingUserLink: "पहले से खाता है? पासकी से लॉगिन करें",
    signOut: "साइन आउट",
    tagline: "आपातकालीन सहायता, एक टैप में",
    phone: "फ़ोन नंबर",
    passkeyContinue: "पासकी से जारी रखें", passkeyCreate: "पासकी बनाएं",
    passkeyHint: "अपने डिवाइस के फिंगरप्रिंट, फेस रिकग्निशन या PIN का उपयोग करें।",
    passkeyChecking: "आपका खाता जांचा जा रहा है…", passkeyCreating: "पासकी बनाई जा रही है…",
    passkeyVerifying: "पासकी सत्यापित की जा रही है…", passkeyCreated: "पासकी सफलतापूर्वक बनाई गई",
    passkeyUnsupported: "इस डिवाइस या ब्राउज़र पर पासकी समर्थित नहीं है।",
    invalidPhone: "एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।",
    fetchingLoc: "आपकी लोकेशन ढूंढी जा रही है…", locFound: "लोकेशन मिल गई",
    manualLoc: "मैन्युअल रूप से दर्ज करें", allowLoc: "लोकेशन एक्सेस दें",
    continueApp: "जारी रखें",
    navMaps: "मैप्स", navReport: "रिपोर्ट", navSos: "SOS", navShelter: "शेल्टर", navAuthority: "अथॉरिटी",
    contacts: "संपर्क", currentLocation: "वर्तमान स्थान",
    theme: "थीम", language: "भाषा", siren: "आपातकालीन सायरन", about: "जानकारी",
  },
};

/* =========================================================================
   REAL FACILITY TYPE STYLING
   (the facility DATA itself is fetched live from OpenStreetMap Overpass —
   see src/lib/facilities.js — this map only controls icon/color/label)
   ========================================================================= */
const FACILITY_META = {
  hospital: { label: "Hospital", icon: Stethoscope, color: "danger" },
  fire: { label: "Fire Station", icon: Flame, color: "warn" },
  police: { label: "Police Station", icon: ShieldCheck, color: "primary" },
  shelter: { label: "Emergency Shelter", icon: Building2, color: "safe" },
};

const EMERGENCY_TYPES = [
  { id: "medical", label: "Medical Emergency", icon: Stethoscope },
  { id: "fire", label: "Fire Accident", icon: Flame },
  { id: "road", label: "Road Accident", icon: Car },
  { id: "flood", label: "Flood", icon: Waves },
  { id: "earthquake", label: "Earthquake", icon: Mountain },
  { id: "collapse", label: "Building Collapse", icon: Building },
  { id: "missing", label: "Missing Person", icon: UserX },
  { id: "natural", label: "Natural Disaster", icon: CloudRain },
  { id: "other", label: "Other Emergency", icon: HelpCircle },
];

const RECIPIENTS_BY_TYPE = {
  medical: ["Nearest Hospital", "Ambulance Service", "Emergency Contacts"],
  fire: ["Fire Station", "Police Station", "Emergency Contacts"],
  road: ["Hospital", "Ambulance", "Police Station", "Emergency Contacts"],
  flood: ["Disaster Management Authority", "Local Government Authority", "Emergency Contacts"],
  earthquake: ["Disaster Management Authority", "Local Government Authority", "Emergency Contacts"],
  collapse: ["Disaster Management Authority", "Fire Station", "Emergency Contacts"],
  missing: ["Police Station", "Emergency Contacts"],
  natural: ["Disaster Management Authority", "Local Government Authority", "Emergency Contacts"],
  other: ["Emergency Contacts"],
};

const AUTHORITY_FOR = {
  medical: "Hospital / Ambulance", fire: "Fire Department", road: "Hospital / Police",
  flood: "Disaster Management Authority", earthquake: "Disaster Management Authority",
  collapse: "Disaster Mgmt. & Fire Dept.", missing: "Police Department",
  natural: "Disaster Management Authority", other: "Local Authority",
};

const SEVERITIES = [
  { id: "low", label: "Low", color: "safe" },
  { id: "medium", label: "Medium", color: "warn" },
  { id: "high", label: "High", color: "danger" },
  { id: "critical", label: "Critical", color: "critical" },
];

const STATUS_STEPS = ["Report Submitted", "Report Received", "Assigned to Authority", "In Progress", "Resolved"];

// Example past-report records shown on the Authority tab. These are static
// demo history (not tied to the live location feature at all), but the
// place names are kept generic/non-specific rather than a fixed fake town.
const SEED_REPORTS = [
  { id: "RN-48213", type: "flood", severity: "high", location: "Field-reported location", time: "Today, 9:14 AM", status: 2, authority: "Disaster Management Authority", description: "Water entering ground-floor houses near a canal bund." },
  { id: "RN-48187", type: "road", severity: "critical", location: "Field-reported location", time: "Yesterday, 6:40 PM", status: 4, authority: "Hospital / Police", description: "Two-vehicle collision, one person trapped." },
  { id: "RN-48122", type: "medical", severity: "medium", location: "Field-reported location", time: "2 days ago", status: 3, authority: "Hospital / Ambulance", description: "Elderly person collapsed, needs assistance." },
];

/* =========================================================================
   SMALL HELPERS
   ========================================================================= */
function useAudioSiren() {
  const [active, setActive] = useState(() => isEmergencySirenActive());

  useEffect(() => {
    return subscribeSirenState((isPlaying) => {
      setActive(isPlaying);
    });
  }, []);

  return {
    active,
    start: startEmergencySiren,
    stop: stopEmergencySiren,
    toggle: toggleEmergencySiren,
  };
}

function Sheet({ open, onClose, title, children, height = "auto" }) {
  if (!open) return null;
  const safeMaxHeight = typeof height === "string" && height.endsWith("vh") ? "88%" : height;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" style={{ maxHeight: safeMaxHeight }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function StatusBar({ c, bg }) {
  return (
    <div className="statusbar" style={{ color: c?.headerText || "#fff", background: bg || "transparent" }}>
      <span>9:41</span>
      <div className="statusbar-icons">
        <span className="sb-dot" /><span className="sb-dot" /><span className="sb-dot" />
      </div>
    </div>
  );
}

/* =========================================================================
   LOGIN / PASSKEY / LOCATION SCREENS
   ========================================================================= */
function LoginScreen({ c, t, onAuthenticated }) {
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [status, setStatus] = useState("idle"); // idle | checking | registering | authenticating | success
  const [knownUser, setKnownUser] = useState(null); // null = not checked yet, else boolean
  const [errorMsg, setErrorMsg] = useState("");
  const supportedRef = useRef(isWebAuthnSupported());
  const supported = supportedRef.current;

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const busy = status !== "idle" && status !== "success";

  // Quietly check (debounced, 200 ms) whether this number already has a RakshaNet
  // account, purely to label the button correctly ("Continue" vs "Create").
  useEffect(() => {
    setKnownUser(null);
    if (!phoneValid || !supported) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await checkUserExists(phone);
        if (!cancelled) {
          const hasAccount = typeof res === "object" ? !!res.hasPasskey : !!res;
          setKnownUser(hasAccount);
        }
      } catch {
        /* stay silent here — handleContinue will surface any real error */
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phone, phoneValid, supported]);

  const handleContinue = async () => {
    if (!phoneValid || busy || status === "success") return;
    setErrorMsg("");
    if (!supported) {
      setErrorMsg(t.passkeyUnsupported);
      return;
    }
    try {
      setStatus("checking");
      const checkRes = knownUser !== null ? knownUser : await checkUserExists(phone);
      const isExisting = typeof checkRes === "object" ? !!checkRes.hasPasskey : !!checkRes;

      let sessionOrUser;
      if (mode === "register" || (mode === "login" && knownUser === false)) {
        setStatus("registering");
        sessionOrUser = await registerPasskey(phone);
      } else {
        setStatus("authenticating");
        sessionOrUser = await loginWithPasskey(phone);
      }

      setStatus("success");
      const authedPhone = sessionOrUser?.phone || sessionOrUser?.user?.phone || phone;
      onAuthenticated(authedPhone);
    } catch (err) {
      setStatus("idle");
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    }
  };

  const buttonLabel = () => {
    if (status === "checking") return t.passkeyChecking;
    if (status === "registering") return t.passkeyCreating;
    if (status === "authenticating") return t.passkeyVerifying;
    if (status === "success") return t.passkeyCreated;
    if (mode === "register") return t.passkeyCreate;
    return knownUser === false ? t.passkeyCreate : t.passkeyContinue;
  };

  const ButtonIcon = status === "success" ? CheckCircle2 : busy ? Loader2 : Fingerprint;

  return (
    <div className="screen login-screen" style={{ background: c.primary }}>
      <div className="login-top">
        <div className="brand-mark"><ShieldCheck size={30} color={c.primary} /></div>
        <h1 className="brand-name">{t.appName}</h1>
        <p className="brand-tag">{t.tagline}</p>
      </div>
      <div className="login-card" style={{ background: c.surface }}>
        <label className="field-label" htmlFor="phone" style={{ color: c.inkSoft }}>{t.phone}</label>
        <div className="phone-input-row" style={{ borderColor: c.border }}>
          <span className="phone-cc" style={{ color: c.ink, borderColor: c.border }}>+91</span>
          <input
            inputMode="numeric"
            placeholder="98765 43210"
            value={phone}
            maxLength={10}
            disabled={busy || status === "success"}
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrorMsg(""); }}
            style={{ color: c.ink }}
          />
        </div>

        <button
          className="primary-btn passkey-btn"
          disabled={!phoneValid || busy || status === "success"}
          style={{
            background: (phoneValid && !busy && status !== "success") ? c.primary : c.border,
            color: (phoneValid && !busy && status !== "success") ? "#fff" : c.inkSoft,
          }}
          onClick={handleContinue}
        >
          <ButtonIcon size={18} className={busy ? "spin" : ""} />
          <span>{buttonLabel()}</span>
        </button>

        <p className="fine-print passkey-hint" style={{ color: c.inkSoft }}>
          <KeyRound size={13} className="inline-icon" />
          {mode === "register" ? (t.passkeyCreateHint || t.passkeyHint) : t.passkeyHint}
        </p>

        <button
          type="button"
          className="text-btn"
          style={{ color: c.primary, padding: "2px 0", fontSize: "0.8125rem", cursor: "pointer", background: "none", border: "none" }}
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setErrorMsg("");
          }}
          disabled={busy || status === "success"}
        >
          {mode === "login" ? t.newUserLink : t.existingUserLink}
        </button>

        {!supported && (
          <p className="fine-print passkey-error" style={{ color: c.danger }}>
            <ShieldAlert size={13} className="inline-icon" />
            {t.passkeyUnsupported}
          </p>
        )}
        {supported && errorMsg && (
          <p className="fine-print passkey-error" style={{ color: c.danger }}>
            <ShieldAlert size={13} className="inline-icon" />
            {errorMsg}
          </p>
        )}

        <p className="fine-print" style={{ color: c.inkSoft }}>
          By continuing you agree this number may be used to alert emergency contacts and authorities during an SOS.
        </p>

        {/* Offline Emergency Access Bypass */}
        <button
          className="secondary-btn"
          style={{ borderColor: c.danger, color: c.danger, width: "100%", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => onAuthenticated("Offline Responder")}
          title="Access survival guides, local map, and emergency SOS queue without network connection"
        >
          <ShieldAlert size={16} />
          <span>Enter Offline Emergency Mode</span>
        </button>
      </div>
    </div>
  );
}


function LocationScreen({ c, t, onDone }) {
  const [phase, setPhase] = useState("asking"); // asking | fetching | found | error | manual
  const [errorMsg, setErrorMsg] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualResults, setManualResults] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const debounceRef = useRef(null);

  // Live search when typing manually
  useEffect(() => {
    if (phase !== "manual") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!manualText || manualText.trim().length < 2) {
      setManualResults([]);
      setManualSearching(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setManualResults([]);
        setManualSearching(false);
        return;
      }
      setManualSearching(true);
      try {
        const found = await searchLocation(manualText.trim());
        setManualResults(found);
      } catch {
        setManualResults([]);
      } finally {
        setManualSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [manualText, phase]);

  const runLocate = async () => {
    setPhase("fetching");
    setErrorMsg("");
    try {
      const pos = await getCurrentPosition();
      let label = null;
      if (navigator.onLine) {
        try {
          label = await reverseGeocode(pos.lat, pos.lng);
        } catch {
          label = null;
        }
      }
      setPhase("found");
      setTimeout(() => {
        onDone({
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy,
          timestamp: pos.timestamp,
          status: pos.status || "Active",
          label: label || "Live GPS Location",
          source: "gps",
        });
      }, 600);
    } catch (err) {
      setErrorMsg(err?.message || "Couldn't get your location. Please try again.");
      setPhase("error");
    }
  };

  return (
    <div className="screen loc-screen" style={{ background: c.bg }}>
      <div className="loc-container">
        {/* Top Hero / Radar Section */}
        <div className="loc-hero">
          <div className="loc-pulse-wrap">
            <div className="loc-radar-halo" style={{ borderColor: `${c.primary}40` }} />
            <div
              className={"loc-pulse" + (phase === "fetching" ? " pulsing" : "")}
              style={{
                background: phase === "error" ? c.dangerSoft : phase === "found" ? c.safeSoft : c.primarySoft,
              }}
            >
              {phase === "found" ? (
                <CheckCircle2 size={34} color={c.safe} />
              ) : phase === "error" ? (
                <ShieldAlert size={34} color={c.danger} />
              ) : phase === "fetching" ? (
                <Loader2 size={32} className="spin" color={c.primary} />
              ) : (
                <LocateFixed size={32} color={c.primary} />
              )}
            </div>
          </div>

          <div className="loc-badge-tag" style={{ background: c.primarySoft, color: c.primary }}>
            <Navigation2 size={11} style={{ transform: "rotate(45deg)" }} />
            <span>GPS DISPATCH SYSTEM</span>
          </div>

          <h2 className="loc-title" style={{ color: c.ink }}>
            {phase === "fetching"
              ? t.fetchingLoc
              : phase === "found"
              ? t.locFound
              : phase === "error"
              ? "Location Unavailable"
              : phase === "manual"
              ? "Set Location Manually"
              : t.allowLoc}
          </h2>

          <p className="loc-desc" style={{ color: c.inkSoft }}>
            {phase === "fetching"
              ? "Connecting with device GPS satellites for high-accuracy triage coordinates…"
              : phase === "found"
              ? "GPS lock established. Directing you to your regional disaster response network…"
              : phase === "error"
              ? errorMsg || "We could not access your device location. Try again or enter manually."
              : phase === "manual"
              ? "Search by street name, landmark, town, city or pincode for exact coordinates."
              : "RakshaNet requires device GPS to route live SOS alerts, dispatch rescue teams, and map open shelters."}
          </p>
        </div>

        {/* Feature Highlights - fills the screen with purposeful, beautiful guidance cards */}
        {phase === "asking" && (
          <div className="loc-features">
            <div className="loc-feat-card" style={{ background: c.surface, borderColor: c.border }}>
              <div className="loc-feat-icon" style={{ background: c.dangerSoft, color: c.danger }}>
                <Siren size={18} />
              </div>
              <div className="loc-feat-text">
                <span className="loc-feat-head" style={{ color: c.ink }}>Rapid SOS Response</span>
                <span className="loc-feat-sub" style={{ color: c.inkSoft }}>Broadcasts exact coordinates to nearest responders</span>
              </div>
            </div>

            <div className="loc-feat-card" style={{ background: c.surface, borderColor: c.border }}>
              <div className="loc-feat-icon" style={{ background: c.safeSoft, color: c.safe }}>
                <Building2 size={18} />
              </div>
              <div className="loc-feat-text">
                <span className="loc-feat-head" style={{ color: c.ink }}>Verified Safe Shelters</span>
                <span className="loc-feat-sub" style={{ color: c.inkSoft }}>Navigates to active relief camps, hospitals & police</span>
              </div>
            </div>

            <div className="loc-feat-card" style={{ background: c.surface, borderColor: c.border }}>
              <div className="loc-feat-icon" style={{ background: c.warnSoft, color: c.warn }}>
                <AlertTriangle size={18} />
              </div>
              <div className="loc-feat-text">
                <span className="loc-feat-head" style={{ color: c.ink }}>Localized Hazard Alerts</span>
                <span className="loc-feat-sub" style={{ color: c.inkSoft }}>Instant flood, storm & seismic risk warnings</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Input Mode Form */}
        {phase === "manual" && (
          <div className="manual-loc-card" style={{ background: c.surface, borderColor: c.border, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: c.ink, fontFamily: "'Manrope', sans-serif" }}>
              Enter Street, Locality, City, or Pincode
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="manual-loc-input"
                placeholder="e.g. MG Road Vijayawada, or 520001"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                style={{ borderColor: c.border, color: c.ink, background: c.surfaceAlt, width: "100%", paddingRight: manualSearching ? 34 : 12 }}
                autoFocus
              />
              {manualSearching && (
                <Loader2 size={15} className="spin" color={c.primary} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
              )}
            </div>

            {/* Results list */}
            {manualResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {manualResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onDone({
                        lat: r.lat,
                        lng: r.lng,
                        accuracy: null,
                        timestamp: Date.now(),
                        status: "Active",
                        label: r.label || r.displayName,
                        source: "manual",
                      });
                    }}
                    style={{
                      textAlign: "left", padding: "9px 11px", borderRadius: 10,
                      border: `1px solid ${c.border}`, background: c.surfaceAlt,
                      cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8,
                    }}
                  >
                    <MapPin size={15} color={c.primary} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: c.ink, lineHeight: 1.35 }}>
                        {r.label || r.displayName}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: c.inkSoft, marginTop: 2, fontFamily: "monospace" }}>
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              className="primary-btn"
              disabled={!manualText.trim() || manualSearching}
              style={{ background: manualText.trim() ? c.primary : c.border, color: "#fff", height: 42 }}
              onClick={async () => {
                if (manualResults.length > 0) {
                  const r = manualResults[0];
                  onDone({
                    lat: r.lat,
                    lng: r.lng,
                    accuracy: null,
                    timestamp: Date.now(),
                    status: "Active",
                    label: r.label || r.displayName,
                    source: "manual",
                  });
                  return;
                }
                setManualSearching(true);
                try {
                  const found = await searchLocation(manualText.trim());
                  if (found.length > 0) {
                    const r = found[0];
                    onDone({
                      lat: r.lat,
                      lng: r.lng,
                      accuracy: null,
                      timestamp: Date.now(),
                      status: "Active",
                      label: r.label || r.displayName,
                      source: "manual",
                    });
                    return;
                  }
                } catch {}
                finally {
                  setManualSearching(false);
                }
                // Fallback if search returns nothing
                onDone({
                  lat: null,
                  lng: null,
                  accuracy: null,
                  timestamp: Date.now(),
                  label: manualText.trim(),
                  source: "manual",
                });
              }}
            >
              {manualSearching ? "Searching…" : t.continueApp}
            </button>

            <button
              className="text-btn"
              style={{ color: c.inkSoft, fontSize: "0.78rem" }}
              onClick={() => setPhase("asking")}
            >
              ← Back to GPS Auto-Detect
            </button>
          </div>
        )}

        {/* Action Buttons Section - Docked cleanly at bottom */}
        <div className="loc-actions">
          {phase === "asking" && (
            <>
              <button
                className="primary-btn loc-allow-btn"
                style={{ background: c.primary, color: "#fff" }}
                onClick={runLocate}
              >
                <LocateFixed size={18} />
                <span>Allow while using app</span>
              </button>
              <button
                className="text-btn"
                style={{ color: c.inkSoft, marginTop: 2 }}
                onClick={() => setPhase("manual")}
              >
                {t.manualLoc}
              </button>
              <span className="loc-privacy-note" style={{ color: c.inkSoft }}>
                🔒 Coordinates are encrypted and only used for emergency relief.
              </span>
            </>
          )}

          {phase === "error" && (
            <>
              <button
                className="primary-btn loc-allow-btn"
                style={{ background: c.primary, color: "#fff" }}
                onClick={runLocate}
              >
                <RefreshCw size={17} />
                <span>Try GPS Again</span>
              </button>
              <button
                className="text-btn"
                style={{ color: c.inkSoft }}
                onClick={() => setPhase("manual")}
              >
                {t.manualLoc}
              </button>
            </>
          )}

          {phase === "manual" && (
            <button
              className="text-btn"
              style={{ color: c.primary, display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={runLocate}
            >
              <LocateFixed size={15} />
              <span>Use Device GPS Instead</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   LOCATION PICKER SHEET
   ========================================================================= */

function LocationPickerSheet({ c, open, onClose, onSelectLocation, onUseGPS, locating, currentLocation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false); // true once a search completes
  const [noNetwork, setNoNetwork] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Reset when sheet opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSearched(false);
      setNoNetwork(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setNoNetwork(true);
        setResults([]);
        setSearched(true);
        return;
      }
      setNoNetwork(false);
      setSearching(true);
      try {
        const found = await searchLocation(query);
        setResults(found);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (!open) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Set Location" height="85vh">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Current Active Location Card */}
        {currentLocation && (
          <div style={{
            background: c.surfaceAlt,
            border: `1px solid ${c.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.05em", color: c.inkSoft }}>
                CURRENT ACTIVE LOCATION
              </span>
              <span style={{
                fontSize: "0.625rem", fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                background: currentLocation.source === "manual" ? `${c.primary}25` : "rgba(18,128,95,0.2)",
                color: currentLocation.source === "manual" ? c.primary : "#12805f",
              }}>
                {currentLocation.source === "manual" ? "Manually Set" : "Device GPS"}
              </span>
            </div>
            <div style={{ fontSize: "0.8438rem", fontWeight: 700, color: c.ink, lineHeight: 1.4, wordBreak: "break-word" }}>
              {currentLocation.label || "Address unavailable"}
            </div>
            {currentLocation.lat != null && currentLocation.lng != null && (
              <div style={{ fontSize: "0.6875rem", color: c.inkSoft, fontFamily: "monospace" }}>
                Coordinates: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                {currentLocation.accuracy != null ? ` (±${Math.round(currentLocation.accuracy)}m)` : ""}
              </div>
            )}
          </div>
        )}

        {/* GPS Reset button */}
        <button
          onClick={() => { onUseGPS(); onClose(); }}
          disabled={locating}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px 16px",
            borderRadius: 14,
            border: `1.5px solid ${c.primary}`,
            background: c.primarySoft,
            color: c.primary,
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700, fontSize: "0.875rem",
            cursor: locating ? "not-allowed" : "pointer",
            transition: "opacity 0.15s",
            opacity: locating ? 0.65 : 1,
          }}
        >
          {locating
            ? <><Loader2 size={15} className="spin" /> Acquiring GPS…</>
            : <><LocateFixed size={15} /> Use My Current Location (GPS)</>}
        </button>

        {/* Informative explanation for PC users */}
        <div style={{
          background: `${c.primary}10`,
          border: `1px solid ${c.primary}25`,
          borderRadius: 10,
          padding: "8px 11px",
          fontSize: "0.72rem",
          color: c.ink,
          lineHeight: 1.4,
        }}>
          <strong style={{ color: c.primary }}>💡 On Desktop / PC:</strong> Browsers lack satellite GPS chips and estimate position using Wi-Fi / IP routing (which often points to your ISP hub). Type your exact street, colony, city or pincode below to pinpoint your true location.
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: c.border }} />
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: c.inkSoft, letterSpacing: "0.05em" }}>OR SEARCH EXACT ADDRESS</span>
          <div style={{ flex: 1, height: 1, background: c.border }} />
        </div>

        {/* Search input */}
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            color={c.inkSoft}
            style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search street, area, city or pincode…"
            style={{
              width: "100%",
              padding: "11px 12px 11px 36px",
              borderRadius: 12,
              border: `1.5px solid ${c.border}`,
              background: c.surfaceAlt,
              color: c.ink,
              fontSize: "0.875rem",
              fontFamily: "'Inter', sans-serif",
              outline: "none",
            }}
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 4, color: c.inkSoft,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Offline notice */}
        {noNetwork && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: c.warnSoft, borderRadius: 10, padding: "10px 12px",
            color: c.warn, fontSize: "0.8125rem", fontWeight: 600,
          }}>
            <WifiOff size={14} style={{ flexShrink: 0 }} />
            You are offline. Connect to the internet to search for a location.
          </div>
        )}

        {/* Spinner while searching */}
        {searching && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.inkSoft, fontSize: "0.8125rem", padding: "4px 0" }}>
            <Loader2 size={15} className="spin" color={c.primary} />
            Searching…
          </div>
        )}

        {/* Results */}
        {!searching && searched && results.length === 0 && !noNetwork && (
          <div style={{ color: c.inkSoft, fontSize: "0.8125rem", padding: "6px 0", textAlign: "center" }}>
            No results found. Try a different search term or pincode.
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.05em", color: c.inkSoft }}>SEARCH RESULTS</span>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelectLocation(r);
                  onClose();
                }}
                style={{
                  width: "100%", textAlign: "left",
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "11px 12px",
                  borderRadius: 12,
                  border: `1px solid ${c.border}`,
                  background: c.surface,
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.surfaceAlt}
                onMouseLeave={(e) => e.currentTarget.style.background = c.surface}
              >
                <MapPin size={16} color={c.primary} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8438rem", color: c.ink, lineHeight: 1.35, wordBreak: "break-word" }}>
                    {r.label || r.displayName}
                  </div>
                  <div style={{ fontSize: "0.7188rem", color: c.inkSoft, marginTop: 3, lineHeight: 1.3, wordBreak: "break-word" }}>
                    {r.displayName}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: c.primary, fontFamily: "monospace", marginTop: 4, fontWeight: 600 }}>
                    📍 {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Hint */}
        {!searched && !searching && (
          <div style={{ color: c.inkSoft, fontSize: "0.75rem", textAlign: "center", lineHeight: 1.5, padding: "4px 0" }}>
            Type your street, colony, city or pincode to search real locations from OpenStreetMap.
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* =========================================================================
   HEADER / BOTTOM NAV
   ========================================================================= */
function locationDisplayLabel(location) {
  if (!location) return "Location unavailable";
  if (location.source === "manual") return location.label || "Location unavailable";
  if (location.lat == null) return "Location unavailable";
  return location.label || "Address unavailable";
}

function AppHeader({ c, t, location, locating, isOnline = true, onOpenContacts, onOpenMenu, onRefreshLocation, onOpenLocationPicker }) {
  const accuracy = location?.accuracy;
  const isLowAccuracy = accuracy != null && accuracy > 100;
  const accuracyText = accuracy != null ? `±${Math.round(accuracy)} m` : null;

  return (
    <div className="app-header" style={{ background: c.primary }}>
      <button
        className="header-loc"
        onClick={onOpenLocationPicker}
        title="Tap to change location or search manually"
        style={{ cursor: "pointer" }}
      >
        <MapPin size={16} color={c.headerText} />
        <div className="header-loc-text">
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <span className="header-loc-label" style={{ color: "rgba(255,255,255,0.7)" }}>
              {location?.source === "manual" ? "Manual" : t.currentLocation}
            </span>
            {/* Online / Offline */}
            <span style={{
              fontSize: "0.56rem", fontWeight: 800, padding: "1px 5px", borderRadius: 6,
              background: isOnline ? "rgba(18,128,95,0.45)" : "rgba(214,40,40,0.55)",
              color: "#fff", letterSpacing: "0.04em",
            }}>
              {isOnline ? "● ONLINE" : "● OFFLINE"}
            </span>
            {/* GPS accuracy badge */}
            {!locating && accuracyText && location?.source !== "manual" && (
              <span style={{
                fontSize: "0.56rem", fontWeight: 800, padding: "1px 5px", borderRadius: 6,
                background: isLowAccuracy ? "rgba(201,122,0,0.55)" : "rgba(18,128,95,0.35)",
                color: "#fff", letterSpacing: "0.03em",
              }}>
                {isLowAccuracy ? "⚠ " : "✓ "}{accuracyText}
              </span>
            )}
          </div>
          <span
            className="header-loc-value"
            style={{ color: c.headerText, fontSize: "0.8125rem", lineHeight: 1.35 }}
          >
            {locating ? "Updating…" : locationDisplayLabel(location)}
          </span>
          {/* Low accuracy nudge */}
          {!locating && isLowAccuracy && location?.source !== "manual" && (
            <span style={{ fontSize: "0.6rem", color: "rgba(255,200,100,0.9)", fontWeight: 600 }}>
              Low GPS signal — tap to refine location
            </span>
          )}
        </div>
        {location?.source === "manual"
          ? <Search size={14} color="rgba(255,255,255,0.7)" />
          : locating
            ? <Loader2 size={14} className="spin" color="rgba(255,255,255,0.85)" />
            : <ChevronDown size={14} color="rgba(255,255,255,0.7)" />
        }
      </button>
      <button className="header-mid" onClick={onOpenContacts} style={{ color: c.headerText, borderColor: "rgba(255,255,255,0.25)" }}>
        <Users size={16} />
        <span>{t.contacts}</span>
      </button>
      <button className="icon-btn" onClick={onOpenMenu} style={{ color: c.headerText }} aria-label="Menu">
        <MoreVertical size={20} />
      </button>
    </div>
  );
}


function BottomNav({ c, t, active, setActive }) {
  const items = [
    { id: "maps", label: t.navMaps, icon: MapIcon },
    { id: "report", label: t.navReport, icon: FileWarning },
    { id: "sos", label: t.navSos, icon: Siren },
    { id: "shelter", label: t.navShelter, icon: Building2 },
    { id: "authority", label: t.navAuthority, icon: ShieldCheck },
  ];
  return (
    <div className="bottom-nav" style={{ background: c.surface, borderColor: c.border }}>
      {items.map((it) => {
        const isSos = it.id === "sos";
        const isActive = active === it.id;
        if (isSos) {
          return (
            <button key={it.id} className="nav-sos-wrap" onClick={() => setActive(it.id)}>
              <div className={"nav-sos-btn" + (isActive ? " nav-sos-active" : "")} style={{ background: "#D62828" }}>
                <Siren size={24} color="#fff" />
              </div>
              <span className="nav-label" style={{ color: isActive ? "#D62828" : c.inkSoft }}>{it.label}</span>
            </button>
          );
        }
        return (
          <button key={it.id} className="nav-item" onClick={() => setActive(it.id)}>
            <it.icon size={20} color={isActive ? c.primary : c.inkSoft} />
            <span className="nav-label" style={{ color: isActive ? c.primary : c.inkSoft }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   MAPS MODULE
   ========================================================================= */
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

function LocationEmptyState({ c, locating, onRefreshLocation, title = "Location unavailable", body = "Enable device location to see the live map and nearby emergency facilities." }) {
  return (
    <div className="module-screen">
      <div className="loc-empty-state" style={{ background: c.surface, borderColor: c.border }}>
        <LocateFixed size={28} color={c.primary} />
        <h3 style={{ color: c.ink }}>{title}</h3>
        <p style={{ color: c.inkSoft }}>{body}</p>
        <button className="primary-btn" style={{ background: c.primary, color: "#fff" }} onClick={onRefreshLocation} disabled={locating}>
          {locating ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />}
          <span>Use My Current Location</span>
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   LIVE WEATHER & FLOOD HAZARD SHEET
   ========================================================================= */
function WeatherHazardSheet({ c, open, onClose, weatherData, weatherLoading, onRefreshWeather }) {
  if (!open) return null;

  const hazardColors = {
    safe: c.safe,
    low: c.safe,
    warn: c.warn,
    danger: c.danger,
    critical: c.critical,
  };

  const hazardBg = {
    safe: c.safeSoft,
    low: c.safeSoft,
    warn: c.warnSoft,
    danger: c.dangerSoft,
    critical: c.dangerSoft,
  };

  const level = weatherData?.hazardLevel || "safe";
  const badgeColor = hazardColors[level] || c.safe;
  const badgeBg = hazardBg[level] || c.safeSoft;

  return (
    <Sheet open={open} onClose={onClose} title="Live Weather & Flood Advisory" height="85vh">
      {weatherLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 30, gap: 12 }}>
          <Loader2 size={30} className="spin" color={c.primary} />
          <p style={{ color: c.inkSoft }}>Fetching real-time atmospheric data from Open-Meteo…</p>
        </div>
      ) : weatherData ? (
        <div className="weather-detail-wrap">
          <div className="hazard-hero" style={{ background: badgeBg, border: `1.5px solid ${badgeColor}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CloudLightning size={26} color={badgeColor} />
              <div>
                <span className="hazard-badge-tag" style={{ background: badgeColor, color: "#fff", fontSize: "0.6875rem", fontWeight: 800, padding: "2px 8px", borderRadius: 8, textTransform: "uppercase" }}>
                  {level} Alert
                </span>
                <h3 style={{ color: c.ink, fontSize: "1rem", marginTop: 4 }}>{weatherData.hazardTitle}</h3>
              </div>
            </div>
            <p style={{ color: c.ink, marginTop: 8, fontSize: "0.8125rem", lineHeight: 1.4 }}>
              {weatherData.hazardDescription}
            </p>
          </div>

          <div className="hazard-metric-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div className="hazard-metric-card" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Thermometer size={16} color={c.primary} />
                <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Temperature</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: c.ink }}>{weatherData.temp}°C</span>
              <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Feels like {weatherData.feelsLike}°C</span>
            </div>

            <div className="hazard-metric-card" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Droplets size={16} color={weatherData.rain > 5 ? c.danger : c.primary} />
                <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Precipitation</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: weatherData.rain > 5 ? c.danger : c.ink }}>{weatherData.rain} <span style={{ fontSize: "0.8125rem" }}>mm/h</span></span>
              <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>{weatherData.condition}</span>
            </div>

            <div className="hazard-metric-card" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wind size={16} color={weatherData.windSpeed > 30 ? c.warn : c.primary} />
                <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Wind Speed</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: c.ink }}>{weatherData.windSpeed} <span style={{ fontSize: "0.8125rem" }}>km/h</span></span>
              <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Gusts {weatherData.windGusts} km/h</span>
            </div>

            <div className="hazard-metric-card" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CloudRain size={16} color={c.primary} />
                <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Humidity</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: c.ink }}>{weatherData.humidity}%</span>
              <span style={{ fontSize: "0.75rem", color: c.inkSoft }}>Relative level</span>
            </div>
          </div>

          <div className="section-heading" style={{ color: c.ink, marginTop: 10, fontSize: "0.9375rem" }}>
            Disaster Preparedness Directives
          </div>
          <div style={{ color: c.inkSoft, fontSize: "0.8125rem", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {weatherData.rain > 10 ? (
              <>
                <p>• <b>Avoid low-lying routes:</b> Flash flood risk is elevated. Keep clear of underground canals and underpasses.</p>
                <p>• <b>Charge power sources:</b> Severe weather may disrupt grid power. Maintain device charge above 80%.</p>
                <p>• <b>Shelter availability:</b> Check the Shelter tab to review pre-mapped emergency shelters.</p>
              </>
            ) : (
              <>
                <p>• <b>Normal conditions:</b> Atmospheric stability is within standard parameters with low disaster hazard.</p>
                <p>• <b>Emergency preparedness:</b> Always keep offline survival protocols handy in the Menu tab.</p>
              </>
            )}
          </div>

          <button
            className="secondary-btn"
            onClick={onRefreshWeather}
            style={{ width: "100%", borderColor: c.border, color: c.ink }}
          >
            <RefreshCw size={15} />&nbsp;Refresh Live Weather
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 20 }}>
          <p style={{ color: c.inkSoft }}>Weather intelligence is unavailable. Ensure location is enabled.</p>
        </div>
      )}
    </Sheet>
  );
}

/* =========================================================================
   OFFLINE SURVIVAL GUIDES SHEET
   ========================================================================= */
function SurvivalGuidesSheet({ c, open, onClose }) {
  const [selectedGuide, setSelectedGuide] = useState(SURVIVAL_GUIDES[0]);
  if (!open) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Offline Survival Protocols" height="85vh">
      <div className="chip-row" style={{ marginBottom: 12 }}>
        {SURVIVAL_GUIDES.map((g) => (
          <button
            key={g.id}
            className="chip"
            onClick={() => setSelectedGuide(g)}
            style={{
              background: selectedGuide.id === g.id ? c.primary : c.surface,
              color: selectedGuide.id === g.id ? "#fff" : c.ink,
              borderColor: selectedGuide.id === g.id ? c.primary : c.border,
            }}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 14 }}>
        <h3 style={{ color: c.ink, fontSize: "1.0625rem", marginBottom: 4 }}>{selectedGuide.title}</h3>
        <p style={{ color: c.inkSoft, fontSize: "0.8125rem", marginBottom: 14 }}>{selectedGuide.summary}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedGuide.steps.map((step, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.primarySoft, color: c.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {idx + 1}
              </div>
              <span style={{ color: c.ink, fontSize: "0.8125rem", lineHeight: 1.45 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* =========================================================================
   OFFLINE MAP CACHE SHEET
   ========================================================================= */
function CacheAreaSheet({
  c,
  open,
  onClose,
  location,
  locating,
  onRefreshLocation,
  mapCacheStatus,
  cachingMap,
  mapProgress,
  onStartCache,
  onClearCache,
}) {
  const [selectedRadius, setSelectedRadius] = useState(3);

  if (!open) return null;

  const hasCoords = location?.lat != null && location?.lng != null;
  const radiusOptions = [
    { km: 1, label: "1 km", desc: "Immediate Zone" },
    { km: 3, label: "3 km", desc: "Recommended", badge: "Default" },
    { km: 5, label: "5 km", desc: "Wide Coverage" },
  ];

  const currentEst = hasCoords ? estimateTileCountAndSize(location.lat, location.lng, selectedRadius) : { count: 0, estMb: "0.0" };
  const progressPercent = mapProgress?.total > 0
    ? Math.round((mapProgress.completed / mapProgress.total) * 100)
    : 0;

  return (
    <Sheet open={open} onClose={cachingMap ? () => {} : onClose} title="Offline Map Cache" height="88vh">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Real Location Information Card */}
        <div style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em", color: c.inkSoft }}>
              CURRENT GPS COORDINATES
            </span>
            <span style={{
              fontSize: "0.6875rem", fontWeight: 700, padding: "2px 7px", borderRadius: 6,
              background: hasCoords ? c.safeSoft : c.dangerSoft,
              color: hasCoords ? c.safe : c.danger,
              display: "inline-flex", alignItems: "center", gap: 4
            }}>
              ● {hasCoords ? "Real GPS Lock" : "Location Unavailable"}
            </span>
          </div>

          {locating ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", color: c.inkSoft, fontSize: "0.8125rem" }}>
              <Loader2 size={15} className="spin" color={c.primary} />
              <span>Acquiring real-time GPS coordinates from device satellites…</span>
            </div>
          ) : hasCoords ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: "0.8125rem", marginBottom: 4 }}>
                <div><span style={{ color: c.inkSoft }}>Lat:</span> <b style={{ color: c.ink, fontFamily: "monospace" }}>{location.lat.toFixed(6)}</b></div>
                <div><span style={{ color: c.inkSoft }}>Lng:</span> <b style={{ color: c.ink, fontFamily: "monospace" }}>{location.lng.toFixed(6)}</b></div>
              </div>
              <div style={{ fontSize: "0.75rem", color: c.inkSoft, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Accuracy: <b style={{ color: c.ink }}>{location.accuracy ? `±${Math.round(location.accuracy)} m` : "Normal"}</b></span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{location.label || "Live Coordinates"}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
              <span style={{ color: c.danger, fontSize: "0.7812rem", fontWeight: 600 }}>
                Location unavailable. Real GPS coordinates are required to calculate offline map tiles.
              </span>
              <button
                className="secondary-btn small"
                onClick={onRefreshLocation}
                style={{ alignSelf: "flex-start", borderColor: c.primary, color: c.primary, gap: 5 }}
              >
                <LocateFixed size={13} />
                <span>Retry Location</span>
              </button>
            </div>
          )}
        </div>

        {/* Radius Selector */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em", color: c.ink, fontFamily: "'Manrope', sans-serif" }}>
              CHOOSE EMERGENCY CACHE RADIUS
            </label>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: c.primary, background: c.primarySoft, padding: "2px 6px", borderRadius: 6 }}>
              Storage Limit: 50 MB
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {radiusOptions.map((opt) => {
              const isSelected = selectedRadius === opt.km;
              const est = hasCoords ? estimateTileCountAndSize(location.lat, location.lng, opt.km) : null;
              return (
                <button
                  key={opt.km}
                  type="button"
                  disabled={cachingMap}
                  onClick={() => setSelectedRadius(opt.km)}
                  style={{
                    border: `1.5px solid ${isSelected ? c.primary : c.border}`,
                    background: isSelected ? c.primarySoft : c.surface,
                    borderRadius: 14,
                    padding: "10px 6px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    cursor: cachingMap ? "not-allowed" : "pointer",
                    position: "relative",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.badge && (
                    <span style={{
                      position: "absolute", top: -7,
                      background: c.primary, color: "#fff",
                      fontSize: "0.5625rem", fontWeight: 800,
                      padding: "1px 5px", borderRadius: 6
                    }}>
                      {opt.badge}
                    </span>
                  )}
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: isSelected ? c.primary : c.ink, fontFamily: "'Manrope', sans-serif" }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: isSelected ? c.primary : c.inkSoft }}>
                    {opt.desc}
                  </span>
                  <span style={{ fontSize: "0.625rem", color: c.inkSoft, marginTop: 2 }}>
                    {est ? `~${est.count} tiles · ${est.estMb} MB` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Offline Features Info Box */}
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: "10px 12px", fontSize: "0.7812rem", color: c.inkSoft, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: c.ink, fontWeight: 700 }}>
            <ShieldCheck size={16} color={c.safe} />
            <span>Emergency Offline Resilience</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.7188rem", lineHeight: 1.4 }}>
            • Pre-caches high-resolution street tiles (zoom 13–15) for immediate navigation when mobile data and Wi-Fi are disconnected.<br />
            • Automatically saves all nearby hospitals, fire departments, police stations, and shelters into local IndexedDB storage.<br />
            • Offline Map Storage quota: <b>~{currentEst.estMb} MB</b> (well under 50 MB limit).
          </p>
        </div>

        {/* Existing Cache Status Banner (if cached) */}
        {mapCacheStatus?.isCached && (
          <div style={{ background: c.safeSoft, border: `1px solid ${c.safe}`, borderRadius: 12, padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: c.safe, display: "block" }}>
                ✓ Current Area Cached Offline
              </span>
              <span style={{ fontSize: "0.6875rem", color: c.inkSoft }}>
                {mapCacheStatus.meta?.cachedTiles || 0} tiles ({mapCacheStatus.meta?.radiusKm || 3} km) · {new Date(mapCacheStatus.meta?.cachedAt || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button
              className="secondary-btn small"
              disabled={cachingMap}
              onClick={onClearCache}
              style={{ borderColor: c.danger, color: c.danger, padding: "4px 8px", fontSize: "0.6875rem" }}
            >
              <Trash2 size={12} />
              <span>Clear Cache</span>
            </button>
          </div>
        )}

        {/* Real Progress Bar during Caching */}
        {cachingMap && (
          <div style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: c.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" color={c.primary} />
                {mapProgress?.phase === "facilities" ? "Caching emergency facilities…" : "Downloading map tiles…"}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: c.primary }}>
                {progressPercent}%
              </span>
            </div>
            {/* Progress Track */}
            <div style={{ width: "100%", height: 7, borderRadius: 4, background: c.border, overflow: "hidden", marginBottom: 6 }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: c.primary,
                  borderRadius: 4,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: c.inkSoft }}>
              <span>Processed: <b>{mapProgress?.completed || 0} / {mapProgress?.total || 0}</b> tiles</span>
              <span>Saved to Cache Storage</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <button
            className="primary-btn"
            disabled={cachingMap || !hasCoords}
            onClick={() => onStartCache(selectedRadius)}
            style={{
              background: !hasCoords || cachingMap ? c.border : c.primary,
              color: !hasCoords || cachingMap ? c.inkSoft : "#fff",
              height: 44,
              fontSize: "0.875rem",
              borderRadius: 13,
            }}
          >
            {cachingMap ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Downloading Offline Area ({progressPercent}%)…</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>
                  {mapCacheStatus?.isCached ? `Re-cache ${selectedRadius} km Area` : `Download for Offline Use (${selectedRadius} km)`}
                </span>
              </>
            )}
          </button>

          {!cachingMap && (
            <button
              className="text-btn"
              onClick={onClose}
              style={{ color: c.inkSoft, padding: "4px" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function MapsScreen({
  c,
  location,
  facilities,
  facilitiesStatus,
  facilitiesFromCache,
  locating,
  onRefreshLocation,
  weatherData,
  onOpenWeather,
  mapCacheStatus,
  cachingMap,
  mapProgress,
  onCacheAreaMap,
  onClearMapCache,
  facilitiesCachedAt,
  isOnline = true,
}) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const hasCoords = location?.lat != null && location?.lng != null;

  if (!hasCoords) {
    return <LocationEmptyState c={c} locating={locating} onRefreshLocation={onRefreshLocation} />;
  }

  const availableTypes = Array.from(new Set(facilities.map((f) => f.type)));
  const filtered = filter === "all" ? facilities : facilities.filter((f) => f.type === filter);

  return (
    <div className="module-screen">
      {/* Live Continuous Location Card */}
      <div style={{ background: c.surface, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em", color: c.inkSoft }}>LIVE LOCATION</span>
          <span style={{
            fontSize: "0.7188rem", fontWeight: 700, padding: "2px 8px", borderRadius: 8,
            background: location?.status === "Active" ? c.safeSoft : location?.status === "Low Accuracy" ? c.warnSoft : c.dangerSoft,
            color: location?.status === "Active" ? c.safe : location?.status === "Low Accuracy" ? c.warn : c.danger,
            display: "inline-flex", alignItems: "center", gap: 4
          }}>
            ● {location?.status === "Active" ? "Location Active" : location?.status === "Low Accuracy" ? "Low Accuracy" : location?.status || "Acquiring"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: "0.8125rem" }}>
          <div><span style={{ color: c.inkSoft }}>Latitude:</span> <b style={{ color: c.ink, fontFamily: "monospace" }}>{location?.lat != null ? location.lat.toFixed(6) : "—"}</b></div>
          <div><span style={{ color: c.inkSoft }}>Longitude:</span> <b style={{ color: c.ink, fontFamily: "monospace" }}>{location?.lng != null ? location.lng.toFixed(6) : "—"}</b></div>
          <div><span style={{ color: c.inkSoft }}>Accuracy:</span> <b style={{ color: c.ink }}>{location?.accuracy != null ? `±${Math.round(location.accuracy)} m` : "—"}</b></div>
          <div><span style={{ color: c.inkSoft }}>Updated:</span> <b style={{ color: c.ink }}>{location?.timestamp ? "Live (continuous)" : "Just now"}</b></div>
        </div>
      </div>

      {/* Offline Area Map Cache Card */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: cachingMap ? 8 : 0,
        marginBottom: 12,
        background: c.surface,
        border: `1px solid ${c.border}`,
        padding: "8px 12px",
        borderRadius: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.7812rem", minWidth: 0, flex: 1 }}>
            <MapIcon size={16} color={c.primary} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: c.ink }}>
                  {mapCacheStatus?.isCached ? "Emergency Area Map Cached" : "Offline Map Cache"}
                </span>
                {mapCacheStatus?.isCached && !cachingMap && (
                  <button
                    onClick={onClearMapCache}
                    style={{
                      background: "none",
                      border: "none",
                      color: c.danger,
                      fontSize: "0.6563rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "0 2px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                    title="Clear offline map cache"
                  >
                    <Trash2 size={10} />
                    <span>Clear Cache</span>
                  </button>
                )}
              </div>
              <span style={{ fontSize: "0.6875rem", color: c.inkSoft, display: "block" }}>
                {cachingMap
                  ? `Caching tiles: ${mapProgress?.completed || 0}/${mapProgress?.total || 0} (${Math.round(((mapProgress?.completed || 0) / Math.max(1, mapProgress?.total || 1)) * 100)}%)`
                  : mapCacheStatus?.isCached
                  ? `${mapCacheStatus.meta?.cachedTiles || 0} tiles (${mapCacheStatus.meta?.radiusKm || 3} km) · ${(Number(mapCacheStatus.meta?.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB`
                  : "Cache map for offline emergency use"}
              </span>
            </div>
          </div>
          <button
            className="secondary-btn small"
            disabled={cachingMap}
            onClick={onCacheAreaMap}
            style={{
              borderColor: c.primary,
              color: c.primary,
              padding: "5px 10px",
              fontSize: "0.7188rem",
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {cachingMap ? (
              <Loader2 size={12} className="spin" />
            ) : mapCacheStatus?.isCached ? (
              <RefreshCw size={11} />
            ) : (
              <Download size={12} />
            )}
            <span>{cachingMap ? "Caching…" : mapCacheStatus?.isCached ? "Re-cache" : "Cache Area"}</span>
          </button>
        </div>

        {cachingMap && (
          <div style={{ width: "100%", height: 3, borderRadius: 2, background: c.border, overflow: "hidden", marginTop: 2 }}>
            <div
              style={{
                width: `${Math.round(((mapProgress?.completed || 0) / Math.max(1, mapProgress?.total || 1)) * 100)}%`,
                height: "100%",
                background: c.primary,
                transition: "width 0.2s ease"
              }}
            />
          </div>
        )}
      </div>

      {/* Offline Facilities Cache Notice */}
      {facilitiesFromCache && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.warnSoft, borderRadius: 10, padding: "6px 10px", marginBottom: 10, fontSize: "0.75rem", color: c.warn, fontWeight: 600 }}>
          <WifiOff size={13} style={{ flexShrink: 0 }} />
          Facilities loaded from offline cache — go online to refresh
        </div>
      )}

      {/* Live Weather & Flood Hazard Banner */}
      {weatherData && (
        <button
          className="weather-hazard-pill"
          onClick={onOpenWeather}
          style={{
            background: weatherData.hazardLevel === "danger" || weatherData.hazardLevel === "critical" ? c.dangerSoft : c.surface,
            border: `1.5px solid ${weatherData.hazardLevel === "danger" || weatherData.hazardLevel === "critical" ? c.danger : c.border}`,
            borderRadius: 14,
            padding: "10px 12px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
            {weatherData.hazardLevel === "danger" || weatherData.hazardLevel === "critical" ? (
              <AlertTriangle size={17} color={c.danger} style={{ flexShrink: 0 }} />
            ) : (
              <CloudRain size={17} color={c.primary} style={{ flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: weatherData.hazardLevel === "danger" || weatherData.hazardLevel === "critical" ? c.danger : c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {weatherData.isCached ? "Last Known Weather" : weatherData.hazardTitle}
                {weatherData.isCached && <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: c.warn, marginLeft: 6 }}>[Cached Offline]</span>}
              </div>
              <div style={{ fontSize: "0.6875rem", color: c.inkSoft }}>
                {weatherData.temp}°C · {weatherData.rain > 0 ? `Rain ${weatherData.rain} mm/h` : weatherData.condition}
                {weatherData.isCached ? ` · Cached: ${new Date(weatherData.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " · Live"}
              </div>
            </div>
          </div>
          <ChevronRight size={16} color={c.inkSoft} style={{ flexShrink: 0 }} />
        </button>
      )}

      <div className="chip-row">
        {["all", ...availableTypes].map((k) => (
          <button
            key={k}
            className="chip"
            onClick={() => setFilter(k)}
            style={{
              background: filter === k ? c.primary : c.surface,
              color: filter === k ? "#fff" : c.ink,
              borderColor: filter === k ? c.primary : c.border,
            }}
          >
            {k === "all" ? "All" : FACILITY_META[k]?.label ?? k}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="map-refresh-btn" onClick={onRefreshLocation} disabled={locating} title="Use my current location" style={{ color: c.primary, borderColor: c.border }}>
          {locating ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />}
        </button>
      </div>

      <div className="leaflet-wrap" style={{ borderColor: c.border, height: 190, position: "relative" }}>
        <MapContainer center={[location.lat, location.lng]} zoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <OfflineTileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          <RecenterMap lat={location.lat} lng={location.lng} />
          {mapCacheStatus?.isCached && mapCacheStatus?.meta?.lat && (
            <Circle
              center={[mapCacheStatus.meta.lat, mapCacheStatus.meta.lng]}
              radius={(mapCacheStatus.meta.radiusKm || 3) * 1000}
              pathOptions={{
                color: c.safe,
                fillColor: c.safe,
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: "4 4",
              }}
            />
          )}
          {location.accuracy && (
            <Circle
              center={[location.lat, location.lng]}
              radius={location.accuracy}
              pathOptions={{
                color: c.primary,
                fillColor: c.primary,
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
          )}
          <Marker position={[location.lat, location.lng]} icon={youAreHereIcon(c.primary)}>
            <Popup>
              <b>Your current location</b><br />
              Status: {location.status || "Active"}<br />
              Accuracy: {location.accuracy ? `±${Math.round(location.accuracy)} m` : "Normal"}
            </Popup>
          </Marker>
          {filtered.map((f) => {
            const meta = FACILITY_META[f.type];
            const color = c[meta?.color] || c.primary;
            return (
              <Marker key={f.id} position={[f.lat, f.lng]} icon={coloredDotIcon(color)} eventHandlers={{ click: () => setSelected(f) }}>
                <Popup>{f.name}</Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {!isOnline && mapCacheStatus?.isCached && (
          <div style={{
            position: "absolute", top: 8, right: 8, zIndex: 1000,
            background: "rgba(18, 128, 95, 0.9)", color: "#fff",
            fontSize: "0.625rem", fontWeight: 700, padding: "3px 8px",
            borderRadius: 12, backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", gap: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)", pointerEvents: "none"
          }}>
            <CheckCircle2 size={11} />
            <span>OFFLINE MAP READY</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="section-heading" style={{ color: c.ink, margin: 0 }}>Nearby emergency facilities</div>
        {facilitiesCachedAt && (
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: c.inkSoft, background: c.surfaceAlt, padding: "3px 8px", borderRadius: 8 }}>
            Cached: {new Date(facilitiesCachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {facilitiesStatus === "loading" && <p className="fine-print" style={{ color: c.inkSoft, marginBottom: 12 }}>Loading nearby facilities from OpenStreetMap…</p>}
      {facilitiesStatus === "error" && (
        <p className="fine-print passkey-error" style={{ color: c.danger, marginBottom: 12 }}>
          <ShieldAlert size={13} className="inline-icon" />
          Couldn't load nearby facilities. Check your connection and try refreshing your location.
        </p>
      )}
      {facilitiesStatus === "ready" && filtered.length === 0 && (
        <p className="fine-print" style={{ color: c.inkSoft, marginBottom: 12 }}>No mapped facilities of this type found nearby on OpenStreetMap.</p>
      )}

      <div className="list-col">
        {filtered.map((f) => {
          const meta = FACILITY_META[f.type];
          const Icon = meta?.icon || Building2;
          const color = c[meta?.color] || c.primary;
          return (
            <button key={f.id} className="facility-row" style={{ background: c.surface, borderLeftColor: color }} onClick={() => setSelected(f)}>
              <div className="facility-icon" style={{ background: color + "1A" }}><Icon size={18} color={color} /></div>
              <div className="facility-info">
                <span className="facility-name" style={{ color: c.ink }}>{f.name}</span>
                <span className="facility-sub" style={{ color: c.inkSoft }}>{meta?.label ?? f.type} · {f.distanceKm.toFixed(1)} km</span>
              </div>
              <ChevronRight size={18} color={c.inkSoft} />
            </button>
          );
        })}
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? (FACILITY_META[selected.type]?.label ?? selected.type) : ""}>
        {selected && (
          <div className="facility-detail">
            <h3 style={{ color: c.ink }}>{selected.name}</h3>
            <div className="detail-row"><MapPin size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.address || "Address unavailable"} · {selected.distanceKm.toFixed(1)} km</span></div>
            <div className="detail-row"><Phone size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.phone || "Phone number not listed on OpenStreetMap"}</span></div>
            <div className="detail-actions">
              <a
                className="primary-btn flex1" style={{ background: c.primary, color: "#fff", textDecoration: "none" }}
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"
              >
                <Navigation2 size={16} />&nbsp;Directions
              </a>
              {selected.phone ? (
                <a className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink, textDecoration: "none" }} href={`tel:${selected.phone}`}>
                  <PhoneCall size={16} />&nbsp;Call
                </a>
              ) : (
                <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.inkSoft }} disabled>
                  <PhoneCall size={16} />&nbsp;No number
                </button>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* =========================================================================
   REPORT MODULE
   ========================================================================= */
function ReportScreen({ c, location, isOnline = true, onQueueReport }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");

  // Real media state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoURL, setPhotoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // Camera / video modal state
  const [cameraMode, setCameraMode] = useState(null); // null | "photo" | "video"
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"
  const [cameraError, setCameraError] = useState("");
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);

  const [recipients, setRecipients] = useState([]);
  const [submitted, setSubmitted] = useState(null);

  const timerRef = useRef(null);
  const videoTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);   // for voice
  const videoRecorderRef = useRef(null);   // for video
  const audioChunksRef = useRef([]);
  const videoChunksRef = useRef([]);
  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);     // <video> element in camera modal
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const locationLabel = locationDisplayLabel(location);

  useEffect(() => {
    if (type && step === 3) setRecipients(RECIPIENTS_BY_TYPE[type.id] || []);
  }, [type, step]);

  // Voice timer
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  // Video recording timer
  useEffect(() => {
    if (videoRecording) {
      videoTimerRef.current = setInterval(() => setVideoSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(videoTimerRef.current);
    }
    return () => clearInterval(videoTimerRef.current);
  }, [videoRecording]);

  // Wire live camera stream to <video> element when modal opens
  useEffect(() => {
    if (cameraMode && cameraVideoRef.current && cameraStreamRef.current) {
      const vid = cameraVideoRef.current;
      vid.srcObject = cameraStreamRef.current;
      vid.onloadedmetadata = () => { vid.play().catch(() => {}); };
      vid.play().catch(() => {});
    }
  }, [cameraMode, facingMode]);

  // Cleanup camera + recorders on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") videoRecorderRef.current.stop();
    };
  }, []);

  // ---------- camera helpers ----------
  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  };

  const getMediaStream = async (mode, facing = "environment") => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Camera API not supported in this browser environment.");
    }
    const videoConstraints = {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
    try {
      return await navigator.mediaDevices.getUserMedia(
        mode === "photo"
          ? { video: videoConstraints, audio: false }
          : { video: videoConstraints, audio: true }
      );
    } catch (e1) {
      if (mode === "video") {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch (e2) {}
      }
      try {
        return await navigator.mediaDevices.getUserMedia(
          mode === "photo"
            ? { video: true, audio: false }
            : { video: true, audio: true }
        );
      } catch (e3) {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    }
  };

  const openCamera = async (mode, facing = facingMode) => {
    setCameraError("");
    setVideoSeconds(0);
    setVideoRecording(false);
    stopCameraStream();

    try {
      const stream = await getMediaStream(mode, facing);
      cameraStreamRef.current = stream;
      setCameraMode(mode);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("Camera error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera access denied. Please allow camera permissions in your browser or select a file below."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "No camera found on this device. You can select an image/video file below."
          : "Camera error: " + (err.message || "Please grant permissions or select a file.")
      );
    }
  };

  const flipCamera = async () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    if (cameraMode) {
      await openCamera(cameraMode, nextFacing);
    }
  };

  const closeCamera = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
      videoRecorderRef.current.stop();
    }
    stopCameraStream();
    setCameraMode(null);
    setVideoRecording(false);
  };

  // Capture a still photo from the live video stream
  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPhotoFile(blob);
        setPhotoURL(url);
        closeCamera();
      }
    }, "image/jpeg", 0.92);
  };

  // Start recording video from the live stream
  const startVideoRecording = () => {
    const stream = cameraStreamRef.current;
    if (!stream) return;
    videoChunksRef.current = [];
    let options = {};
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) options = { mimeType: "video/webm;codecs=vp9" };
      else if (MediaRecorder.isTypeSupported("video/webm")) options = { mimeType: "video/webm" };
      else if (MediaRecorder.isTypeSupported("video/mp4")) options = { mimeType: "video/mp4" };
    }
    try {
      const mr = new MediaRecorder(stream, options);
      videoRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: mr.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoURL(url);
        closeCamera();
      };
      mr.start(100);
      setVideoSeconds(0);
      setVideoRecording(true);
    } catch (err) {
      console.error("MediaRecorder start failed:", err);
      setCameraError("Video recording failed to start: " + err.message);
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
      videoRecorderRef.current.stop();
    }
    setVideoRecording(false);
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoURL(URL.createObjectURL(file));
      setCameraError("");
    }
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoBlob(file);
      setVideoURL(URL.createObjectURL(file));
      setCameraError("");
    }
  };

  // ---------- voice helpers ----------
  const startVoiceRecording = async () => {
    setVoiceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setVoiceBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setVoiceSeconds(0);
      setRecording(true);
    } catch (err) {
      setVoiceError("Microphone access denied. Please allow mic permissions.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const toggleRecipient = (r) => {
    setRecipients((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const reset = () => {
    setStep(1); setType(null); setDescription(""); setSeverity("medium");
    setPhotoFile(null); setPhotoURL(null); setVideoBlob(null); setVideoURL(null); setVoiceBlob(null);
    setVoiceSeconds(0); setRecording(false); setVoiceError("");
    setCameraMode(null); setCameraError(""); setVideoRecording(false); setVideoSeconds(0);
    setRecipients([]); setSubmitted(null);
    stopCameraStream();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const submit = () => {
    const id = "RN-" + Math.floor(10000 + Math.random() * 89999);
    const mediaAttachments = [
      ...(photoFile ? [{ type: "photo", name: "photo.jpg", size: photoFile.size, blob: photoFile, url: photoURL }] : []),
      ...(videoBlob ? [{ type: "video", name: "video.webm", size: videoBlob.size, blob: videoBlob, url: videoURL }] : []),
      ...(voiceBlob ? [{ type: "voice", name: "voice-note.webm", size: voiceBlob.size, blob: voiceBlob }] : []),
    ];
    const reportObj = {
      id,
      type,
      description,
      severity,
      locationLabel,
      location,
      recipients,
      time: "Just now",
      status: 0,
      authority: AUTHORITY_FOR[type?.id] || "Disaster Management Authority",
      isOffline: !isOnline,
      mediaAttachments,
    };

    if (!isOnline && onQueueReport) {
      onQueueReport(reportObj);
    }
    setSubmitted(reportObj);
  };

  if (submitted) {
    const reportMsg = generateReportMessage({
      id: submitted.id,
      type: submitted.type,
      severity: submitted.severity,
      description: submitted.description,
      location,
    });

    return (
      <div className="module-screen">
        <div className="confirm-hero" style={{ background: submitted.isOffline ? c.warnSoft : c.safeSoft }}>
          <CheckCircle2 size={40} color={submitted.isOffline ? c.warn : c.safe} />
          <h2 style={{ color: c.ink }}>{submitted.isOffline ? "Report Stored Offline" : "Report submitted"}</h2>
          <p style={{ color: c.inkSoft }}>Report ID</p>
          <span className="report-id" style={{ color: c.ink }}>{submitted.id}</span>
          {submitted.isOffline && (
            <p style={{ color: c.warn, fontSize: "0.75rem", fontWeight: 700, marginTop: 4 }}>
              📡 Queued locally. Will auto-dispatch when network connectivity is restored.
            </p>
          )}
        </div>
        <div className="status-track">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="status-track-row">
              <div className="status-track-dotwrap">
                <div className={"status-dot" + (i === 0 ? " active" : "")} style={{ background: i === 0 ? c.safe : c.border }} />
                {i < STATUS_STEPS.length - 1 && <div className="status-line" style={{ background: c.border }} />}
              </div>
              <span style={{ color: i === 0 ? c.ink : c.inkSoft, fontWeight: i === 0 ? 700 : 500 }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="summary-card" style={{ background: c.surface, borderColor: c.border }}>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Type</span><span style={{ color: c.ink }}>{submitted.type?.label}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Severity</span><span style={{ color: c.ink }}>{SEVERITIES.find(s => s.id === submitted.severity)?.label}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Location</span><span style={{ color: c.ink }}>{submitted.locationLabel}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Sent to</span><span style={{ color: c.ink, textAlign: "right" }}>{submitted.recipients.join(", ")}</span></div>
          {submitted.mediaAttachments?.length > 0 && (
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Evidence</span><span style={{ color: c.safe, fontWeight: 700 }}>{submitted.mediaAttachments.length} file{submitted.mediaAttachments.length > 1 ? "s" : ""} attached</span></div>
          )}
        </div>

        {/* Share via WhatsApp and SMS */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            className="secondary-btn flex1"
            style={{ borderColor: "#25D366", color: "#25D366" }}
            onClick={() => openWhatsApp(null, reportMsg)}
          >
            <Share2 size={16} />&nbsp;WhatsApp
          </button>
          <button
            className="secondary-btn flex1"
            style={{ borderColor: c.primary, color: c.primary }}
            onClick={() => openSms(null, reportMsg)}
          >
            <Send size={16} />&nbsp;Send SMS
          </button>
        </div>

        <button className="primary-btn" style={{ background: c.primary, color: "#fff" }} onClick={reset}>File another report</button>
      </div>
    );
  }

  return (
    <div className="module-screen">
      <div className="step-indicator">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="step-indicator-seg" style={{ background: s <= step ? c.primary : c.border }} />
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="section-heading" style={{ color: c.ink }}>What type of emergency are you reporting?</div>
          <div className="type-grid">
            {EMERGENCY_TYPES.map((et) => (
              <button
                key={et.id}
                className="type-card"
                style={{
                  background: type?.id === et.id ? c.primarySoft : c.surface,
                  borderColor: type?.id === et.id ? c.primary : c.border,
                }}
                onClick={() => setType(et)}
              >
                <et.icon size={24} color={type?.id === et.id ? c.primary : c.ink} />
                <span style={{ color: c.ink }}>{et.label}</span>
              </button>
            ))}
          </div>
          <button className="primary-btn" disabled={!type} style={{ background: type ? c.primary : c.border, color: "#fff" }} onClick={() => setStep(2)}>Continue</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="section-heading" style={{ color: c.ink }}>Emergency details</div>
          <textarea
            className="textarea"
            placeholder="Briefly describe what's happening…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ borderColor: c.border, color: c.ink, background: c.surface }}
          />
          <div className="detail-row" style={{ marginBottom: 12 }}>
            <MapPin size={16} color={c.inkSoft} />
            <span style={{ color: c.inkSoft }}>{locationLabel} {location?.source === "gps" ? "(from device GPS)" : location?.source === "manual" ? "(manually entered)" : ""}</span>
          </div>
          <div className="field-label" style={{ color: c.inkSoft }}>Severity</div>
          <div className="severity-row">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                className="severity-chip"
                onClick={() => setSeverity(s.id)}
                style={{
                  background: severity === s.id ? c[s.color] : c.surface,
                  color: severity === s.id ? "#fff" : c.ink,
                  borderColor: severity === s.id ? c[s.color] : c.border,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="field-label" style={{ color: c.inkSoft, marginTop: 14 }}>Evidence Attachments</div>
          {cameraError && (
            <div style={{ background: c.dangerSoft, border: `1px solid ${c.danger}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              <p style={{ color: c.danger, fontSize: "0.74rem", margin: 0, fontWeight: 600 }}>{cameraError}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", color: c.ink, cursor: "pointer", fontWeight: 600 }}
                  onClick={() => photoInputRef.current?.click()}
                >
                  📁 Select Photo File
                </button>
                <button
                  type="button"
                  style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", color: c.ink, cursor: "pointer", fontWeight: 600 }}
                  onClick={() => videoInputRef.current?.click()}
                >
                  📁 Select Video File
                </button>
              </div>
            </div>
          )}

          {/* Hidden file inputs for fallback / gallery selection */}
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoFileChange} />
          <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoFileChange} />

          <div className="attach-row">
            {/* PHOTO — opens live camera */}
            <button
              className="attach-btn"
              style={{ borderColor: photoFile ? c.primary : c.border, color: photoFile ? c.primary : c.ink, flexDirection: "column", gap: 4 }}
              onClick={() => openCamera("photo")}
            >
              {photoURL
                ? <img src={photoURL} alt="preview" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
                : <Camera size={20} />}
              <span style={{ fontSize: "0.68rem" }}>{photoFile ? "✓ Retake" : "Camera"}</span>
            </button>

            {/* VIDEO — opens live camera for recording */}
            <button
              className="attach-btn"
              style={{ borderColor: videoBlob ? c.primary : c.border, color: videoBlob ? c.primary : c.ink, flexDirection: "column", gap: 4 }}
              onClick={() => openCamera("video")}
            >
              <Video size={20} />
              <span style={{ fontSize: "0.68rem" }}>{videoBlob ? `✓ ${(videoBlob.size / 1048576).toFixed(1)} MB` : "Video"}</span>
            </button>

            {/* VOICE */}
            <button
              className="attach-btn"
              style={{
                borderColor: recording ? c.danger : voiceBlob ? c.primary : c.border,
                color: recording ? c.danger : voiceBlob ? c.primary : c.ink,
                flexDirection: "column", gap: 4,
              }}
              onClick={() => { recording ? stopVoiceRecording() : startVoiceRecording(); }}
            >
              <Mic size={20} />
              <span style={{ fontSize: "0.68rem" }}>
                {recording
                  ? `⏺ ${String(Math.floor(voiceSeconds / 60)).padStart(2, "0")}:${String(voiceSeconds % 60).padStart(2, "0")}`
                  : voiceBlob
                  ? `✓ ${voiceSeconds}s`
                  : "Voice"}
              </span>
            </button>
          </div>
          {voiceError && <p style={{ color: c.danger, fontSize: "0.72rem", marginTop: 4 }}>{voiceError}</p>}
          {voiceBlob && !recording && (
            <div style={{ marginTop: 6 }}>
              <audio controls src={URL.createObjectURL(voiceBlob)} style={{ width: "100%", height: 32, borderRadius: 8 }} />
            </div>
          )}
          {videoURL && !cameraMode && (
            <div style={{ marginTop: 6 }}>
              <video controls src={videoURL} style={{ width: "100%", borderRadius: 8, maxHeight: 110 }} />
            </div>
          )}
          <p className="fine-print" style={{ color: c.inkSoft }}>Tap Camera or Video to capture evidence in real-time.</p>
          <div className="two-btn-row">
            <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }} onClick={() => setStep(1)}>Back</button>
            <button className="primary-btn flex1" disabled={!description.trim()} style={{ background: description.trim() ? c.primary : c.border, color: "#fff" }} onClick={() => setStep(3)}>Continue</button>
          </div>
        </>
      )}

      {/* ===== IN-APP CAMERA MODAL OVERLAY ===== */}
      {cameraMode && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 999,
          background: "#000",
          display: "flex", flexDirection: "column",
          borderRadius: "inherit",
          overflow: "hidden",
        }}>
          <video
            ref={(el) => {
              cameraVideoRef.current = el;
              if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                el.srcObject = cameraStreamRef.current;
                el.onloadedmetadata = () => { el.play().catch(() => {}); };
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
            zIndex: 10,
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
              {cameraMode === "photo" ? "📷 Take Photo" : "🎥 Record Video"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={flipCamera}
                title="Switch Camera (Front/Back)"
                style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                onClick={closeCamera}
                title="Close Camera"
                style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
          </div>
          {videoRecording && (
            <div style={{ position: "absolute", top: 52, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 10 }}>
              <div style={{ background: "rgba(214,40,40,0.88)", borderRadius: 20, padding: "4px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>
                  REC {String(Math.floor(videoSeconds / 60)).padStart(2, "0")}:{String(videoSeconds % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          )}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            display: "flex", justifyContent: "center", alignItems: "center",
            paddingBottom: 28, paddingTop: 16,
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            zIndex: 10,
          }}>
            {cameraMode === "photo" ? (
              <button
                type="button"
                onClick={capturePhoto}
                style={{ width: 66, height: 66, borderRadius: "50%", background: "#fff", border: "5px solid rgba(255,255,255,0.4)", cursor: "pointer", boxShadow: "0 0 0 3px rgba(255,255,255,0.25)" }}
              />
            ) : (
              <button
                type="button"
                onClick={videoRecording ? stopVideoRecording : startVideoRecording}
                style={{
                  width: 66, height: 66, borderRadius: "50%",
                  background: videoRecording ? "#D62828" : "#fff",
                  border: "5px solid rgba(255,255,255,0.4)",
                  cursor: "pointer", boxShadow: "0 0 0 3px rgba(255,255,255,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {videoRecording
                  ? <Square size={22} color="#fff" fill="#fff" />
                  : <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#D62828" }} />}
              </button>
            )}
          </div>
        </div>
      )}


      {step === 3 && (
        <>
          <div className="section-heading" style={{ color: c.ink }}>Who should receive this report?</div>
          <p className="fine-print" style={{ color: c.inkSoft, marginTop: -6 }}>Suggested automatically based on "{type?.label}"</p>
          <div className="list-col">
            {(RECIPIENTS_BY_TYPE[type?.id] || []).concat(["Additional: District Control Room"]).map((r) => (
              <button key={r} className="recipient-row" style={{ background: c.surface, borderColor: recipients.includes(r) ? c.primary : c.border }} onClick={() => toggleRecipient(r)}>
                <span style={{ color: c.ink }}>{r}</span>
                <div className={"checkbox" + (recipients.includes(r) ? " checked" : "")} style={{ borderColor: recipients.includes(r) ? c.primary : c.border, background: recipients.includes(r) ? c.primary : "transparent" }}>
                  {recipients.includes(r) && <CheckCircle2 size={14} color="#fff" />}
                </div>
              </button>
            ))}
          </div>
          <div className="two-btn-row">
            <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }} onClick={() => setStep(2)}>Back</button>
            <button className="primary-btn flex1" disabled={recipients.length === 0} style={{ background: recipients.length ? c.primary : c.border, color: "#fff" }} onClick={() => setStep(4)}>Continue</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="section-heading" style={{ color: c.ink }}>Confirm & submit</div>
          <div className="summary-card" style={{ background: c.surface, borderColor: c.border }}>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Emergency type</span><span style={{ color: c.ink }}>{type?.label}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Description</span><span style={{ color: c.ink, textAlign: "right", maxWidth: 180 }}>{description}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Location</span><span style={{ color: c.ink }}>{locationLabel}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Severity</span><span style={{ color: c.ink }}>{SEVERITIES.find(s => s.id === severity)?.label}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Evidence</span><span style={{ color: c.ink }}>{[photoFile && "📷 Photo", videoFile && "🎥 Video", voiceBlob && "🎙️ Voice note"].filter(Boolean).join(", ") || "None"}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Recipients</span><span style={{ color: c.ink, textAlign: "right", maxWidth: 180 }}>{recipients.join(", ")}</span></div>
          </div>
          <div className="two-btn-row">
            <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }} onClick={() => setStep(3)}>Back</button>
            <button className="primary-btn flex1" style={{ background: c.danger, color: "#fff" }} onClick={submit}>Submit report</button>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================================
   SOS MODULE
   ========================================================================= */
function SosScreen({ c, location, contacts, isOnline = true, phone = "", onQueueSos }) {
  const [category, setCategory] = useState(null);
  const [state, setState] = useState("idle"); // idle | pressing | sent
  const [copiedLink, setCopiedLink] = useState(false);

  const categories = [
    { id: "medical", label: "Medical", icon: Stethoscope },
    { id: "fire", label: "Fire", icon: Flame },
    { id: "accident", label: "Accident", icon: Car },
    { id: "police", label: "Police", icon: ShieldCheck },
    { id: "flood", label: "Flood", icon: Waves },
    { id: "earthquake", label: "Earthquake", icon: Mountain },
    { id: "safety", label: "Personal safety", icon: UserX },
    { id: "other", label: "Other", icon: HelpCircle },
  ];

  const authorityFor = (id) => ({
    medical: "Hospital / Ambulance", fire: "Fire Department", accident: "Hospital / Police",
    police: "Police Department", flood: "Disaster Management Authority",
    earthquake: "Disaster Management Authority", safety: "Police Department", other: "Local Authority",
  }[id] || "Local Authority");

  const handleTriggerSos = () => {
    setState("sent");
    startEmergencySiren();
    const sosPayload = {
      type: "SOS",
      category,
      location,
      time: new Date().toISOString(),
      contacts,
      isOffline: !isOnline,
    };
    if (!isOnline && onQueueSos) {
      onQueueSos(sosPayload);
    }
  };

  if (state === "sent") {
    const sosMsg = generateSosMessage({ category, location, phone });
    const primaryContact = contacts.find((c) => c.primary) || contacts[0];
    const mapsLink = location?.lat != null ? `https://maps.google.com/?q=${location.lat},${location.lng}` : "";

    const copyCoords = () => {
      if (mapsLink) {
        navigator.clipboard?.writeText(mapsLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    };

    return (
      <div className="module-screen sos-sent">
        <div className="radar-wrap">
          <div className="radar-ring r1" style={{ borderColor: c.danger }} />
          <div className="radar-ring r2" style={{ borderColor: c.danger }} />
          <div className="radar-core" style={{ background: c.danger }}>
            <Siren size={30} color="#fff" />
          </div>
        </div>
        <h2 style={{ color: c.ink, textAlign: "center" }}>
          {!isOnline ? "SOS Alert Stored Locally" : "SOS alert sent"}
        </h2>
        <p style={{ color: c.inkSoft, textAlign: "center" }}>
          {!isOnline
            ? "Network offline: Alert queued locally. Use WhatsApp or SMS below to transmit directly via cellular radio."
            : `${authorityFor(category?.id)} has been notified with your live location.`}
        </p>

        {!isOnline && (
          <div style={{ background: c.warnSoft, border: `1.5px solid ${c.warn}`, borderRadius: 12, padding: "8px 12px", width: "100%", textAlign: "center" }}>
            <span style={{ color: c.warn, fontSize: "0.7812rem", fontWeight: 700 }}>
              📡 Transmitting via offline queue when signal is found
            </span>
          </div>
        )}

        <div className="summary-card" style={{ background: c.surface, borderColor: c.border, width: "100%" }}>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Category</span><span style={{ color: c.ink, fontWeight: 700 }}>{category?.label}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Location</span><span style={{ color: c.ink }}>{locationDisplayLabel(location)}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Target Contacts</span><span style={{ color: c.ink, textAlign: "right" }}>{contacts.length ? contacts.map(x => x.name).join(", ") : "None saved"}</span></div>
        </div>

        {/* Direct Dispatch Buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            className="primary-btn"
            style={{ background: "#25D366", color: "#fff", fontWeight: 700 }}
            onClick={() => openWhatsApp(primaryContact?.phone, sosMsg)}
          >
            <Share2 size={18} />
            <span>Dispatch via WhatsApp {primaryContact ? `(${primaryContact.name})` : ""}</span>
          </button>

          <button
            className="secondary-btn"
            style={{ borderColor: c.primary, color: c.primary, fontWeight: 700 }}
            onClick={() => openSms(primaryContact?.phone, sosMsg)}
          >
            <Send size={18} />
            <span>Dispatch via Direct SMS</span>
          </button>

          {contacts.length > 1 && (
            <button
              className="secondary-btn"
              style={{ borderColor: c.warn, color: c.warn, fontWeight: 700 }}
              onClick={() => blastWhatsAppToContacts(contacts, sosMsg)}
            >
              <Users size={18} />
              <span>Blast WhatsApp to All {contacts.length} Contacts</span>
            </button>
          )}

          {mapsLink && (
            <button
              className="text-btn"
              style={{ color: c.inkSoft, fontSize: "0.75rem", alignSelf: "center", marginTop: 4 }}
              onClick={copyCoords}
            >
              {copiedLink ? "✓ GPS Maps Link Copied!" : "📋 Copy Live GPS Link"}
            </button>
          )}
        </div>

        <button
          className="secondary-btn"
          style={{ borderColor: c.border, color: c.inkSoft, width: "100%", marginTop: 8 }}
          onClick={() => {
            stopEmergencySiren();
            setState("idle");
            setCategory(null);
          }}
        >
          Cancel alert
        </button>
      </div>
    );
  }

  return (
    <div className="module-screen">
      <div className="section-heading" style={{ color: c.ink }}>Select emergency type</div>
      <div className="sos-cat-grid">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="sos-cat-card"
            style={{ background: category?.id === cat.id ? c.dangerSoft : c.surface, borderColor: category?.id === cat.id ? c.danger : c.border }}
            onClick={() => setCategory(cat)}
          >
            <cat.icon size={22} color={category?.id === cat.id ? c.danger : c.ink} />
            <span style={{ color: c.ink }}>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="sos-button-wrap">
        <button
          className={"sos-big-btn" + (state === "pressing" ? " pressing" : "")}
          style={{ background: c.danger }}
          onMouseDown={() => setState("pressing")}
          onMouseUp={() => {
            if (state === "pressing") {
              handleTriggerSos();
            }
          }}
          onMouseLeave={() => state === "pressing" && setState("idle")}
          onTouchStart={() => setState("pressing")}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleTriggerSos();
          }}
          onClick={() => {
            if (state !== "sent") {
              handleTriggerSos();
            }
          }}
          disabled={!category}
        >
          <Siren size={38} color="#fff" />
          <span>SEND SOS</span>
        </button>
        <p className="fine-print" style={{ color: c.inkSoft, textAlign: "center" }}>
          {category ? "Tap to alert authorities and emergency contacts instantly" : "Select an emergency type above to enable SOS"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   SHELTER MODULE
   ========================================================================= */
function ShelterScreen({ c, location, facilities, facilitiesStatus, facilitiesFromCache, locating, onRefreshLocation }) {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const hasCoords = location?.lat != null && location?.lng != null;

  if (!hasCoords) {
    return (
      <LocationEmptyState
        c={c} locating={locating} onRefreshLocation={onRefreshLocation}
        body="Enable device location to see real emergency shelters mapped nearby on OpenStreetMap."
      />
    );
  }

  const shelters = facilities.filter((f) => f.type === "shelter");

  return (
    <div className="module-screen">
      <div className="chip-row">
        <div style={{ flex: 1 }} />
        <button className="map-refresh-btn" onClick={onRefreshLocation} disabled={locating} title="Use my current location" style={{ color: c.primary, borderColor: c.border }}>
          {locating ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />}
        </button>
        <div className="view-toggle" style={{ borderColor: c.border }}>
          <button className={view === "list" ? "vt-active" : ""} style={{ background: view === "list" ? c.primary : "transparent", color: view === "list" ? "#fff" : c.ink }} onClick={() => setView("list")}>List</button>
          <button className={view === "map" ? "vt-active" : ""} style={{ background: view === "map" ? c.primary : "transparent", color: view === "map" ? "#fff" : c.ink }} onClick={() => setView("map")}>Map</button>
        </div>
      </div>

      {facilitiesStatus === "loading" && <p className="fine-print" style={{ color: c.inkSoft, marginBottom: 12 }}>Loading nearby shelters from OpenStreetMap…</p>}
      {facilitiesFromCache && facilitiesStatus === "ready" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.warnSoft, borderRadius: 10, padding: "6px 10px", marginBottom: 10, fontSize: "0.75rem", color: c.warn, fontWeight: 600 }}>
          <WifiOff size={13} style={{ flexShrink: 0 }} />
          Showing cached shelter data (offline) — reconnect to refresh
        </div>
      )}
      {facilitiesStatus === "error" && (
        <p className="fine-print passkey-error" style={{ color: c.danger, marginBottom: 12 }}>
          <ShieldAlert size={13} className="inline-icon" />
          Couldn't load nearby shelters. Check your connection and try refreshing your location.
        </p>
      )}
      {facilitiesStatus === "ready" && shelters.length === 0 && (
        <p className="fine-print" style={{ color: c.inkSoft, marginBottom: 12 }}>
          No emergency shelters are mapped on OpenStreetMap within range of your location yet. Check the Authority tab for official relief camp reports.
        </p>
      )}

      {view === "map" ? (
        <div className="leaflet-wrap" style={{ borderColor: c.border, height: 200 }}>
          <MapContainer center={[location.lat, location.lng]} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={location.lat} lng={location.lng} />
            <Marker position={[location.lat, location.lng]} icon={youAreHereIcon(c.primary)}>
              <Popup>Your current location</Popup>
            </Marker>
            {shelters.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={coloredDotIcon(c.safe)} eventHandlers={{ click: () => setSelected(s) }}>
                <Popup>{s.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="list-col">
          {shelters.map((s) => (
            <button key={s.id} className="shelter-card" style={{ background: c.surface, borderLeftColor: c.safe }} onClick={() => setSelected(s)}>
              <div className="shelter-card-top">
                <span className="facility-name" style={{ color: c.ink }}>{s.name}</span>
              </div>
              <span className="facility-sub" style={{ color: c.inkSoft }}>{s.address || "Address unavailable"} · {s.distanceKm.toFixed(1)} km</span>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Shelter details">
        {selected && (
          <div className="facility-detail">
            <h3 style={{ color: c.ink }}>{selected.name}</h3>
            <div className="detail-row"><MapPin size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.address || "Address unavailable"} · {selected.distanceKm.toFixed(1)} km</span></div>
            <div className="detail-row"><Phone size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.phone || "Phone number not listed on OpenStreetMap"}</span></div>
            <div className="detail-actions">
              <a
                className="primary-btn flex1" style={{ background: c.primary, color: "#fff", textDecoration: "none" }}
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"
              >
                <Navigation2 size={16} />&nbsp;Directions
              </a>
              {selected.phone ? (
                <a className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink, textDecoration: "none" }} href={`tel:${selected.phone}`}>
                  <PhoneCall size={16} />&nbsp;Call
                </a>
              ) : (
                <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.inkSoft }} disabled>
                  <PhoneCall size={16} />&nbsp;No number
                </button>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* =========================================================================
   AUTHORITY MODULE & EMERGENCY BROADCAST
   ========================================================================= */
function AuthorityScreen({ c, reports, setReports, onBroadcastAlert }) {
  const [view, setView] = useState("citizen");
  const [selected, setSelected] = useState(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bCategory, setBCategory] = useState("Flood Advisory");

  const advanceStatus = (id) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus = Math.min(r.status + 1, STATUS_STEPS.length - 1);
          playAlertChime("status");
          sendBrowserNotification(`Report ${r.id} Status Updated`, {
            body: `Status changed to "${STATUS_STEPS[nextStatus]}" by ${r.authority}.`,
          });
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  const handleCreateBroadcast = () => {
    if (!bTitle.trim() || !bMessage.trim()) return;
    const newBroadcast = {
      id: Date.now(),
      title: bTitle.trim(),
      message: bMessage.trim(),
      category: bCategory,
      time: "Just now",
      authority: "Disaster Control Room",
    };
    if (onBroadcastAlert) onBroadcastAlert(newBroadcast);
    playAlertChime("broadcast");
    sendBrowserNotification(`🚨 URGENT: ${newBroadcast.title}`, {
      body: newBroadcast.message,
    });
    setBTitle("");
    setBMessage("");
    setBroadcastOpen(false);
  };

  return (
    <div className="module-screen">
      <div className="view-toggle wide" style={{ borderColor: c.border }}>
        <button className={view === "citizen" ? "vt-active" : ""} style={{ background: view === "citizen" ? c.primary : "transparent", color: view === "citizen" ? "#fff" : c.ink }} onClick={() => setView("citizen")}>My reports</button>
        <button className={view === "authority" ? "vt-active" : ""} style={{ background: view === "authority" ? c.primary : "transparent", color: view === "authority" ? "#fff" : c.ink }} onClick={() => setView("authority")}>Authority view</button>
      </div>

      {view === "authority" && (
        <button
          className="primary-btn"
          style={{ background: c.danger, color: "#fff", marginTop: 12, marginBottom: 4 }}
          onClick={() => setBroadcastOpen(true)}
        >
          <Radio size={16} />&nbsp;Issue Public Emergency Broadcast
        </button>
      )}

      {view === "citizen" ? (
        <div className="list-col" style={{ marginTop: 14 }}>
          {reports.map((r) => {
            const et = EMERGENCY_TYPES.find((e) => e.id === r.type) || EMERGENCY_TYPES[8];
            const sv = SEVERITIES.find((s) => s.id === r.severity);
            return (
              <button key={r.id} className="report-row" style={{ background: c.surface, borderLeftColor: c[sv.color] }} onClick={() => setSelected(r)}>
                <div className="facility-icon" style={{ background: c[sv.color] + "1A" }}><et.icon size={18} color={c[sv.color]} /></div>
                <div className="facility-info">
                  <span className="facility-name" style={{ color: c.ink }}>{et.label} · {r.id}</span>
                  <span className="facility-sub" style={{ color: c.inkSoft }}>{r.location} · {r.time}</span>
                  <span className="facility-sub" style={{ color: c.primary, fontWeight: 600 }}>{STATUS_STEPS[r.status]}</span>
                </div>
                <ChevronRight size={18} color={c.inkSoft} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="list-col" style={{ marginTop: 14 }}>
          {reports.map((r) => {
            const et = EMERGENCY_TYPES.find((e) => e.id === r.type) || EMERGENCY_TYPES[8];
            const sv = SEVERITIES.find((s) => s.id === r.severity);
            return (
              <div key={r.id} className="authority-card" style={{ background: c.surface, borderColor: c.border }}>
                <div className="authority-card-top">
                  <div className="facility-icon" style={{ background: c[sv.color] + "1A" }}><et.icon size={16} color={c[sv.color]} /></div>
                  <div className="facility-info">
                    <span className="facility-name" style={{ color: c.ink }}>{et.label} · {r.id}</span>
                    <span className="facility-sub" style={{ color: c.inkSoft }}>{r.location}</span>
                  </div>
                  <span className="status-pill" style={{ background: c[sv.color] + "1A", color: c[sv.color] }}>{sv.label}</span>
                </div>
                <p className="fine-print" style={{ color: c.inkSoft, margin: "8px 0" }}>{r.description}</p>
                <div className="authority-meta">
                  <span style={{ color: c.inkSoft }}><Clock size={13} style={{ verticalAlign: -2 }} /> {r.time}</span>
                  <span style={{ color: c.inkSoft }}><BadgeCheck size={13} style={{ verticalAlign: -2 }} /> {r.authority}</span>
                </div>
                <div className="authority-status-row">
                  <span style={{ color: c.primary, fontWeight: 700, fontSize: "0.8125rem" }}>{STATUS_STEPS[r.status]}</span>
                  <button
                    className="secondary-btn small"
                    disabled={r.status >= STATUS_STEPS.length - 1}
                    style={{ borderColor: c.primary, color: r.status >= STATUS_STEPS.length - 1 ? c.inkSoft : c.primary }}
                    onClick={() => advanceStatus(r.id)}
                  >
                    {r.status >= STATUS_STEPS.length - 1 ? "Resolved" : "Advance status"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Sheet */}
      <Sheet open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Broadcast Emergency Advisory">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: c.inkSoft, fontSize: "0.8125rem" }}>
            Issuing an advisory sends an immediate push notification and displays a high-priority ticker across citizen devices.
          </p>
          <div className="field-label" style={{ color: c.inkSoft }}>Advisory Category</div>
          <select
            value={bCategory}
            onChange={(e) => setBCategory(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.surface, color: c.ink, fontFamily: "Inter, sans-serif" }}
          >
            <option>Flood & Inundation Warning</option>
            <option>Evacuation Order</option>
            <option>Relief Camp & Food Supply</option>
            <option>Cyclone & Gale Advisory</option>
            <option>Road Closure & Safe Routes</option>
          </select>

          <input
            placeholder="Advisory Title (e.g. Flash Flood in Sector 4)"
            value={bTitle}
            onChange={(e) => setBTitle(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.ink }}
          />

          <textarea
            placeholder="Detailed directives for public safety…"
            rows={3}
            value={bMessage}
            onChange={(e) => setBMessage(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: `1.5px solid ${c.border}`, background: c.surface, color: c.ink, resize: "none" }}
          />

          <button
            className="primary-btn"
            disabled={!bTitle.trim() || !bMessage.trim()}
            style={{ background: c.danger, color: "#fff" }}
            onClick={handleCreateBroadcast}
          >
            <Radio size={16} />&nbsp;Transmit Public Alert
          </button>
        </div>
      </Sheet>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Report status">
        {selected && (
          <div className="facility-detail">
            <h3 style={{ color: c.ink }}>{selected.id}</h3>
            <div className="status-track">
              {STATUS_STEPS.map((s, i) => (
                <div key={s} className="status-track-row">
                  <div className="status-track-dotwrap">
                    <div className={"status-dot" + (i <= selected.status ? " active" : "")} style={{ background: i <= selected.status ? c.safe : c.border }} />
                    {i < STATUS_STEPS.length - 1 && <div className="status-line" style={{ background: c.border }} />}
                  </div>
                  <span style={{ color: i <= selected.status ? c.ink : c.inkSoft, fontWeight: i <= selected.status ? 700 : 500 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* =========================================================================
   CONTACTS + MENU
   ========================================================================= */
function ContactsSheet({ c, open, onClose, contacts, setContacts }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const add = () => {
    if (!name.trim() || !phone.trim()) return;
    setContacts((prev) => [...prev, { id: Date.now(), name, phone, primary: prev.length === 0 }]);
    setName(""); setPhone(""); setAdding(false);
  };
  const remove = (id) => setContacts((prev) => prev.filter((p) => p.id !== id));
  const makePrimary = (id) => setContacts((prev) => prev.map((p) => ({ ...p, primary: p.id === id })));

  return (
    <Sheet open={open} onClose={onClose} title="Emergency contacts" height="80vh">
      <div className="list-col">
        {contacts.map((ct) => (
          <div key={ct.id} className="contact-row" style={{ background: c.surface, borderColor: c.border }}>
            <div className="facility-info">
              <span className="facility-name" style={{ color: c.ink }}>{ct.name} {ct.primary && <Star size={13} color={c.warn} fill={c.warn} style={{ verticalAlign: -2 }} />}</span>
              <span className="facility-sub" style={{ color: c.inkSoft }}>{ct.phone}</span>
            </div>
            <div className="contact-actions">
              {!ct.primary && <button className="icon-btn" onClick={() => makePrimary(ct.id)} style={{ color: c.warn }}><Star size={16} /></button>}
              <button className="icon-btn" onClick={() => remove(ct.id)} style={{ color: c.danger }}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && !adding && <p style={{ color: c.inkSoft }}>No emergency contacts saved yet.</p>}
      </div>

      {adding ? (
        <div className="add-contact-form">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ borderColor: c.border, color: c.ink, background: c.surface }} />
          <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ borderColor: c.border, color: c.ink, background: c.surface }} />
          <div className="two-btn-row">
            <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }} onClick={() => setAdding(false)}>Cancel</button>
            <button className="primary-btn flex1" style={{ background: c.primary, color: "#fff" }} onClick={add}>Save contact</button>
          </div>
        </div>
      ) : (
        <button className="secondary-btn" style={{ borderColor: c.primary, color: c.primary, width: "100%", marginTop: 10 }} onClick={() => setAdding(true)}>
          <Plus size={16} />&nbsp;Add contact
        </button>
      )}
    </Sheet>
  );
}

function MenuSheet({ c, open, onClose, theme, setTheme, lang, setLang, sirenOn, toggleSiren, t, onOpenSurvival, notifPermission, onRequestNotif, onLogout }) {
  const [screen, setScreen] = useState("root");
  useEffect(() => { if (open) setScreen("root"); }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={screen === "root" ? "Menu" : screen === "about" ? t.about : screen === "theme" ? t.theme : t.language}>
      {screen === "root" && (
        <div className="menu-list">
          <button className="menu-row" onClick={() => { onClose(); onOpenSurvival(); }} style={{ borderColor: c.border }}>
            <BookOpen size={18} color={c.primary} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ color: c.ink, fontWeight: 600 }}>Disaster Survival Guides</span>
              <span style={{ color: c.inkSoft, fontSize: "0.6875rem" }}>100% available offline</span>
            </div>
            <ChevronRight size={16} color={c.inkSoft} style={{ marginLeft: "auto" }} />
          </button>
          <button className="menu-row" onClick={onRequestNotif} style={{ borderColor: c.border }}>
            <BellRing size={18} color={c.warn} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ color: c.ink, fontWeight: 600 }}>Push Notification Alerts</span>
              <span style={{ color: c.inkSoft, fontSize: "0.6875rem" }}>
                {notifPermission === "granted" ? "Active (Broadcasts enabled)" : "Tap to enable emergency alerts"}
              </span>
            </div>
            <span style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 700, color: notifPermission === "granted" ? c.safe : c.warn }}>
              {notifPermission === "granted" ? "Enabled" : "Allow"}
            </span>
          </button>
          <button className="menu-row" onClick={() => setScreen("theme")} style={{ borderColor: c.border }}>
            {theme === "light" ? <Sun size={18} color={c.ink} /> : <Moon size={18} color={c.ink} />}
            <span style={{ color: c.ink }}>{t.theme}</span>
            <ChevronRight size={16} color={c.inkSoft} style={{ marginLeft: "auto" }} />
          </button>
          <button className="menu-row" onClick={() => setScreen("lang")} style={{ borderColor: c.border }}>
            <Globe size={18} color={c.ink} />
            <span style={{ color: c.ink }}>{t.language}</span>
            <ChevronRight size={16} color={c.inkSoft} style={{ marginLeft: "auto" }} />
          </button>
          <button className="menu-row" onClick={toggleSiren} style={{ borderColor: c.border }}>
            {sirenOn ? <Volume2 size={18} color={c.danger} /> : <VolumeX size={18} color={c.ink} />}
            <span style={{ color: sirenOn ? c.danger : c.ink }}>{t.siren}</span>
            <div className={"toggle" + (sirenOn ? " on" : "")} style={{ marginLeft: "auto", background: sirenOn ? c.danger : c.border }}><div className="toggle-knob" /></div>
          </button>
          <button className="menu-row" onClick={() => setScreen("about")} style={{ borderColor: c.border }}>
            <Info size={18} color={c.ink} />
            <span style={{ color: c.ink }}>{t.about}</span>
            <ChevronRight size={16} color={c.inkSoft} style={{ marginLeft: "auto" }} />
          </button>
          <button className="menu-row" onClick={onLogout} style={{ borderColor: c.border, marginTop: 10 }}>
            <ShieldAlert size={18} color={c.danger} />
            <span style={{ color: c.danger, fontWeight: 600 }}>{t.signOut || "Sign Out"}</span>
          </button>
        </div>
      )}

      {screen === "theme" && (
        <div className="menu-list">
          <button className="menu-row" onClick={() => setTheme("light")} style={{ borderColor: c.border }}>
            <Sun size={18} color={c.ink} /><span style={{ color: c.ink }}>Light mode</span>
            {theme === "light" && <CheckCircle2 size={16} color={c.primary} style={{ marginLeft: "auto" }} />}
          </button>
          <button className="menu-row" onClick={() => setTheme("dark")} style={{ borderColor: c.border }}>
            <Moon size={18} color={c.ink} /><span style={{ color: c.ink }}>Dark mode</span>
            {theme === "dark" && <CheckCircle2 size={16} color={c.primary} style={{ marginLeft: "auto" }} />}
          </button>
          <button className="text-btn" style={{ color: c.primary, marginTop: 6 }} onClick={() => setScreen("root")}>Back</button>
        </div>
      )}

      {screen === "lang" && (
        <div className="menu-list">
          {[["en", "English"], ["te", "తెలుగు (Telugu)"], ["hi", "हिन्दी (Hindi)"]].map(([code, label]) => (
            <button key={code} className="menu-row" onClick={() => setLang(code)} style={{ borderColor: c.border }}>
              <span style={{ color: c.ink }}>{label}</span>
              {lang === code && <CheckCircle2 size={16} color={c.primary} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
          <button className="text-btn" style={{ color: c.primary, marginTop: 6 }} onClick={() => setScreen("root")}>Back</button>
        </div>
      )}

      {screen === "about" && (
        <div style={{ color: c.inkSoft, lineHeight: 1.6 }}>
          <p style={{ color: c.ink, fontWeight: 700, marginBottom: 6 }}>{t.appName}</p>
          <p>RakshaNet connects citizens to hospitals, fire stations, police and disaster management authorities during floods, fires, earthquakes, accidents and medical emergencies.</p>
          <p style={{ marginTop: 10 }}>Report incidents with photos, video or a voice note, send an instant SOS to authorities and saved contacts, and find the nearest open shelter — all from one place.</p>
          <p style={{ marginTop: 10, fontSize: "0.75rem" }}>Version 1.0.0 · Prototype build</p>
          <button className="text-btn" style={{ color: c.primary, marginTop: 6 }} onClick={() => setScreen("root")}>Back</button>
        </div>
      )}
    </Sheet>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */
export default function App() {
  const [stage, setStage] = useState("loading"); // loading | login | location | home
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState(null); // { lat, lng, accuracy, timestamp, label, source } | null
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [facilitiesStatus, setFacilitiesStatus] = useState("idle"); // idle | loading | ready | error
  const [activeTab, setActiveTab] = useState("maps");
  const [theme, setTheme] = useState("light");
  const [facilitiesCachedAt, setFacilitiesCachedAt] = useState(null);
  const [lang, setLang] = useState("en");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [survivalOpen, setSurvivalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState(() => getOfflineQueue());
  const [syncToast, setSyncToast] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState([
    {
      id: 1,
      title: "District Flood & Inundation Advisory",
      message: "Low-lying catchment areas are on alert. Keep emergency supplies and mobile powerbanks charged.",
      time: "10 mins ago",
      authority: "State Disaster Management",
    },
  ]);
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission());
  const [contacts, setContacts] = useState([
    { id: 1, name: "Anitha (Sister)", phone: "+91 90000 11111", primary: true },
    { id: 2, name: "Ravi (Neighbor)", phone: "+91 90000 22222", primary: false },
  ]);
  const [reports, setReports] = useState(SEED_REPORTS);
  const [facilitiesFromCache, setFacilitiesFromCache] = useState(false); // true when served from IndexedDB
  const [mapCacheStatus, setMapCacheStatus] = useState({ isCached: false, meta: null });
  const [cachingMap, setCachingMap] = useState(false);
  const [mapProgress, setMapProgress] = useState({ completed: 0, total: 0, phase: "" });
  const [cacheSheetOpen, setCacheSheetOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const siren = useAudioSiren();

  const c = theme === "light" ? LIGHT : DARK;
  const t = STRINGS[lang];

  const toggleSiren = () => {
    siren.toggle();
  };

  // ── Session Restoration (Real Supabase & Passkey Auth) ───────────────────
  useEffect(() => {
    let cancelled = false;

    async function checkAuthSession() {
      try {
        // 1. Check real Supabase authentication session via Supabase Auth API
        const { data: { session: sbSession }, error: sbError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sbSession?.user) {
          const userPhone = sbSession.user.phone || sbSession.user.user_metadata?.phone || "";
          console.log("[AUTH] Active Supabase auth session restored for:", userPhone || sbSession.user.id);
          setPhone(userPhone);
          setStage("home");
          return;
        }

        // 2. Check real WebAuthn server-verified session
        const webauthnSession = await verifyCurrentSession();
        if (cancelled) return;

        if (webauthnSession?.user?.phone) {
          console.log("[AUTH] Active WebAuthn session verified by server for:", webauthnSession.user.phone);
          setPhone(webauthnSession.user.phone);
          setStage("home");
          return;
        }

        // No active session: show authentication screen
        console.log("[AUTH] No active authentication session; showing login screen.");
        setStage("login");
      } catch (err) {
        if (cancelled) return;
        console.warn("[AUTH] Session restoration check error:", err);
        setStage("login");
      }
    }

    checkAuthSession();



    // Listen to Supabase onAuthStateChange without fighting the initial session check
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      console.log(`[AUTH] Supabase onAuthStateChange: ${event}`);

      if (event === "SIGNED_OUT") {
        console.log("[AUTH] Supabase SIGNED_OUT event; resetting application auth state.");
        clearSession();
        setPhone("");
        setStage("login");
      } else if (event === "SIGNED_IN" && session?.user) {
        console.log("[AUTH] Supabase SIGNED_IN event for:", session.user.phone || session.user.id);
        setPhone(session.user.phone || session.user.user_metadata?.phone || "");
        setStage("home");
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // On session start / login: hydrate location from IndexedDB cache.
  // CRITICAL: If the user previously set a manual location, RESPECT it!
  // Do NOT overwrite their manually chosen address with PC IP/Wi-Fi geolocation.
  useEffect(() => {
    if (!phone) return;

    let cancelled = false;

    async function initLocation() {
      let cached = null;
      try {
        cached = await getLastKnownLocation();
        if (cached && !cancelled) {
          setLocation(cached);
          setLocationError("");
        }
      } catch { /* ignore */ }

      // If user manually selected a location, keep it! Never overwrite with PC IP/GPS
      if (cached && cached.source === "manual") {
        return;
      }

      // For GPS locations or initial setup, acquire fresh device GPS
      if (cancelled) return;
      setLocating(true);
      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        const label = navigator.onLine ? await reverseGeocode(pos.lat, pos.lng) : null;
        if (cancelled) return;
        const freshLoc = {
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy,
          timestamp: pos.timestamp,
          label: label || null,
          source: "gps",
        };
        setLocation(freshLoc);
        setLocationError("");
        saveLastKnownLocation(freshLoc).catch(() => {});
      } catch (err) {
        if (!cancelled && !cached) {
          setLocationError(err?.message || "Couldn't get your location.");
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    }

    initLocation();
    return () => { cancelled = true; };
  }, [phone]);
  const handleLogout = async () => {
    console.log("[AUTH] Initiating sign out...");
    stopEmergencySiren();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AUTH] Supabase signOut error:", err);
    }
    try {
      await logout();
    } catch (err) {
      console.warn("[AUTH] Logout error:", err);
    }
    setPhone("");
    setStage("login");
    setMenuOpen(false);
    console.log("[AUTH] Sign-out complete; user returned to login screen.");
  };

  // ── Hydrate contacts & reports from IndexedDB on first mount ────────────
  useEffect(() => {
    getEmergencyContacts().then((saved) => {
      if (saved && saved.length > 0) setContacts(saved);
    }).catch(() => { });

    getIncidentReports().then((saved) => {
      if (saved && saved.length > 0) {
        // Merge: DB records take priority; append SEED_REPORTS that aren't already present
        setReports((prev) => {
          const existingIds = new Set(saved.map((r) => r.id));
          const seedOnly = prev.filter((r) => !existingIds.has(r.id));
          return [...saved, ...seedOnly];
        });
      }
    }).catch(() => { });

    // Initialise background auto-sync; captures cleanup fn
    const cleanupSync = initAutoSync((syncedItem) => {
      if (syncedItem?.id) {
        setReports((prev) => {
          const exists = prev.find((r) => r.id === syncedItem.id);
          return exists ? prev.map((r) => r.id === syncedItem.id ? syncedItem : r) : [syncedItem, ...prev];
        });
      }
    });

    // ── Hydrate offline map status on mount ─────────────────────────────
    getCachedMapStatus().then((status) => {
      if (status) setMapCacheStatus(status);
    }).catch(() => { });

    return () => { if (cleanupSync) cleanupSync(); };
  }, []);

  // ── Offline Map Cache Action Handlers ──────────────────────────────────
  const handleOpenCacheModal = useCallback(async () => {
    // If coordinates are missing, trigger real device GPS first
    if (location?.lat == null || location?.lng == null) {
      setLocating(true);
      try {
        const pos = await getCurrentPosition();
        let label = null;
        if (navigator.onLine) {
          try { label = await reverseGeocode(pos.lat, pos.lng); } catch { label = null; }
        }
        const loc = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, timestamp: pos.timestamp, label, source: "gps" };
        setLocation(loc);
        saveLastKnownLocation(loc).catch(() => { });
      } catch (err) {
        setLocationError(err?.message || "Location unavailable");
      } finally {
        setLocating(false);
      }
    }
    setCacheSheetOpen(true);
  }, [location?.lat, location?.lng]);

  const handleStartCache = useCallback(async (radiusKm = 3) => {
    if (location?.lat == null || location?.lng == null) {
      setLocationError("Real GPS coordinates required to cache map area.");
      return;
    }
    setCachingMap(true);
    setMapProgress({ completed: 0, total: 1, phase: "tiles" });
    try {
      const meta = await cacheEmergencyAreaTiles(
        location.lat,
        location.lng,
        radiusKm,
        (progress) => setMapProgress(progress)
      );
      setMapCacheStatus({ isCached: true, meta });
      // Reload facilities from cache so they're immediately available
      const { facilities: cachedFacs } = await getCachedFacilities();
      if (cachedFacs && cachedFacs.length > 0) {
        setFacilities(cachedFacs);
        setFacilitiesStatus("ready");
      }
      setTimeout(() => {
        setCachingMap(false);
        setCacheSheetOpen(false);
      }, 700);
    } catch (err) {
      console.error("Map caching error:", err);
      setCachingMap(false);
      alert(err?.message || "Failed to cache map tiles. Please check connection and try again.");
    }
  }, [location?.lat, location?.lng]);

  const handleClearMapCache = useCallback(async () => {
    try {
      const res = await clearOfflineMapCache();
      setMapCacheStatus(res);
    } catch (err) {
      console.warn("Failed to clear offline map cache:", err);
    }
  }, []);

  // ── Persist contacts to IndexedDB whenever they change ─────────────────
  useEffect(() => {
    if (contacts && contacts.length > 0) {
      saveEmergencyContacts(contacts).catch(() => { });
    }
  }, [contacts]);

  // Online / Offline synchronization listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncToast("Network restored! Syncing emergency queue…");
      syncOfflineQueue((item) => {
        if (item.type && item.id) {
          setReports((prev) => [item, ...prev]);
        }
      }).then((count) => {
        setOfflineQueue(getOfflineQueue());
        setTimeout(() => {
          setSyncToast(count > 0 ? `Successfully synced ${count} emergency dispatches!` : "");
        }, 3500);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch real-time weather and flood risk intelligence; fall back to cached value
  const refreshWeather = useCallback(async () => {
    if (location?.lat == null || location?.lng == null) return;
    setWeatherLoading(true);
    try {
      if (!navigator.onLine) {
        // Serve last-known weather from IndexedDB when offline
        const cached = await getAppState("last_weather").catch(() => null);
        if (cached?.data) { setWeatherData(cached.data); }
        return;
      }
      const data = await fetchLiveWeatherAndHazard(location.lat, location.lng);
      setWeatherData(data);
      // Persist for offline access
      saveAppState("last_weather", { data }).catch(() => { });
    } catch (err) {
      console.warn("Weather fetch failed:", err);
      // Try IndexedDB fallback on network error
      const cached = await getAppState("last_weather").catch(() => null);
      if (cached?.data) { setWeatherData(cached.data); }
    } finally {
      setWeatherLoading(false);
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

  const handleQueueReport = (report) => {
    const queued = queueOfflineItem(report);
    setOfflineQueue(getOfflineQueue());
    const reportWithTs = { ...report, timestamp: Date.now() };
    // Persist to IndexedDB for offline durability
    saveIncidentReport(reportWithTs).catch(() => { });
    setReports((prev) => [reportWithTs, ...prev]);
  };

  const handleQueueSos = (sos) => {
    queueOfflineItem(sos);
    setOfflineQueue(getOfflineQueue());
  };

  const handleBroadcastAlert = (broadcast) => {
    setBroadcasts((prev) => [broadcast, ...prev]);
  };

  const handleRequestNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  // Real device geolocation → real reverse geocoding. No fallback/mock
  // coordinates are ever substituted here — on failure we only set
  // locationError and leave `location` exactly as it was.
  const refreshLocation = useCallback(async () => {
    setLocating(true);
    setLocationError("");
    try {
      const pos = await getCurrentPosition();
      const label = await reverseGeocode(pos.lat, pos.lng);
      const loc = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, timestamp: pos.timestamp, label, source: "gps" };
      setLocation(loc);
      // Persist last-known location to IndexedDB
      saveLastKnownLocation(loc).catch(() => { });
    } catch (err) {
      setLocationError(err?.message || "Couldn't refresh your location.");
    } finally {
      setLocating(false);
    }
  }, []);

  // Manual location selection from the location picker
  const handleManualLocationSelect = useCallback(async (result) => {
    // result: { lat, lng, label, displayName } — all real coordinates from Nominatim
    const loc = {
      lat: result.lat,
      lng: result.lng,
      accuracy: null,
      timestamp: Date.now(),
      label: result.label || result.displayName || null,
      source: "manual",
    };
    setLocation(loc);
    // Persist so it survives a reload
    saveLastKnownLocation(loc).catch(() => { });
  }, []);

  // Real nearby-facility lookup (OpenStreetMap Overpass) whenever we have a
  // real coordinate. Falls back to IndexedDB cache when offline or on error.
  // No mock facility list is used anywhere in this app.
  useEffect(() => {
    if (location?.lat == null || location?.lng == null) {
      setFacilities([]);
      setFacilitiesStatus("idle");
      setFacilitiesFromCache(false);
      return;
    }
    let cancelled = false;
    setFacilitiesStatus("loading");
    setFacilitiesFromCache(false);

    if (!navigator.onLine) {
      // Immediately serve from IndexedDB when offline
      getCachedFacilities().then(({ facilities: cached }) => {
        if (!cancelled) {
          if (cached && cached.length > 0) {
            setFacilities(cached);
            setFacilitiesStatus("ready");
            setFacilitiesFromCache(true);
          } else {
            setFacilities([]);
            setFacilitiesStatus("error");
          }
        }
      }).catch(() => {
        if (!cancelled) { setFacilities([]); setFacilitiesStatus("error"); }
      });
      return () => { cancelled = true; };
    }

    fetchNearbyFacilities(location.lat, location.lng)
      .then((results) => {
        if (!cancelled) {
          setFacilities(results);
          setFacilitiesStatus("ready");
          setFacilitiesFromCache(false);
          // Update IndexedDB cache and store cached timestamp
          cacheFacilities(results, { lat: location.lat, lng: location.lng })
            .then(({ cachedAt }) => setFacilitiesCachedAt(cachedAt))
            .catch(() => { });
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Network failed — try IndexedDB fallback
          getCachedFacilities().then(({ facilities: cached }) => {
            if (!cancelled) {
              if (cached && cached.length > 0) {
                setFacilities(cached);
                setFacilitiesStatus("ready");
                setFacilitiesFromCache(true);
              } else {
                setFacilities([]);
                setFacilitiesStatus("error");
              }
            }
          }).catch(() => {
            if (!cancelled) { setFacilities([]); setFacilitiesStatus("error"); }
          });
        }
      });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng, isOnline]);

  return (
    <div className="phone-outer">
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── RESPONSIVE FOUNDATION ─────────────────────────────────────────────
           On real phones (≤ 499 px wide) the app fills the full viewport — no
           fake phone chrome.  On wider screens (tablets / desktops / previews)
           it renders as a centered phone mockup.
        ─────────────────────────────────────────────────────────────────────── */
        :root {
          font-size: 16px; /* fixed base — no phone-height-derived scaling */
          --phone-h: 100dvh; /* fallback below */
        }
        @supports not (height: 100dvh) {
          :root { --phone-h: 150vh; }
        }

        /* ── PHONE OUTER CONTAINER ────────────────────────────────────────── */
        .phone-outer {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 50% 0%, #1c2733, #05080c);
          font-family: 'Inter', sans-serif;
          overflow: hidden !important; /* Page must never scroll on desktop */
          overscroll-behavior: none !important;
          box-sizing: border-box;
        }

        /* ── REAL MOBILE (≤ 499px wide) ──────────────────────────────────── */
        @media (max-width: 499px) {
          .phone-outer {
            position: fixed;
            inset: 0;
            padding: 0;
            background: ${c.bg};
          }
          .phone-frame {
            width: 100% !important;
            height: 100% !important;
            height: 100dvh !important;
            max-width: 100% !important;
            max-height: 100% !important;
            aspect-ratio: unset !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: ${c.bg} !important;
          }
          .phone-screen {
            border-radius: 0 !important;
          }
          .notch, .home-indicator, .statusbar {
            display: none !important;
          }
        }

        /* ── DESKTOP / TABLET PHONE MOCKUP (≥ 500px) ─────────────────────── */
        @media (min-width: 500px) {
          .phone-outer {
            padding: 8px 14px;
          }
          .phone-frame {
            /* Flagship smartphone mockup fixed to desktop screen (width: 340px, height: up to 835px) */
            width: 340px;
            max-width: calc(100vw - 20px);
            height: min(835px, calc(100vh - 16px));
            height: min(835px, calc(100dvh - 16px));
            background: #000;
            border-radius: 44px;
            padding: 9px;
            box-shadow: 0 25px 70px rgba(0,0,0,0.85), 0 0 0 2px #2a2f36;
            position: relative;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
          }
          .phone-screen {
            border-radius: 35px;
            overflow: hidden;
            width: 100%;
            height: 100%;
            background: ${c.bg};
            position: relative;
            display: flex;
            flex-direction: column;
          }
          .notch {
            display: block;
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 78px;
            height: 14px;
            background: #000;
            border-radius: 12px;
            z-index: 50;
            pointer-events: none;
          }
          .home-indicator {
            display: block;
            position: absolute;
            bottom: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 92px;
            height: 4px;
            background: ${c.ink};
            opacity: 0.3;
            border-radius: 4px;
            z-index: 60;
            pointer-events: none;
          }
          .bottom-nav {
            padding-bottom: 16px;
          }
        }

        /* ── STATUS BAR ──────────────────────────────────────────────────── */
        .statusbar {
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          font-size: 0.8125rem;
          font-weight: 700;
          font-family: 'Manrope', sans-serif;
          z-index: 40;
        }
        .statusbar-icons { display: flex; gap: 4px; }
        .sb-dot { width: 4px; height: 4px; border-radius: 2px; background: currentColor; opacity: 0.9; }

        /* ── GENERIC SCREEN BASE ─────────────────────────────────────────── */
        .screen { flex: 1; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; min-width: 0; }

        h1, h2, h3 { font-family: 'Manrope', sans-serif; }
        p { font-size: 0.875rem; line-height: 1.5; }

        /* ── LOGIN / AUTH ────────────────────────────────────────────────── */
        .login-screen { justify-content: space-between; padding-bottom: 0; overflow-y: auto; overflow-x: hidden; }
        .login-top { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px 8px; text-align: center; min-height: 110px; }
        .brand-mark { width: 52px; height: 52px; border-radius: 16px; background: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .brand-name { color: #fff; font-size: 1.4375rem; font-weight: 800; letter-spacing: -0.02em; }
        .brand-tag { color: rgba(255,255,255,0.85); font-size: 0.8125rem; }
        .login-card {
          border-radius: 26px 26px 0 0;
          padding: 18px 18px 22px;
          display: flex; flex-direction: column; gap: 10px;
          width: 100%; max-width: 100%; overflow-x: hidden;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
        }
        .field-label { font-size: 0.8125rem; font-weight: 600; font-family: 'Manrope', sans-serif; }
        .phone-input-row { display: flex; align-items: center; border: 1.5px solid; border-radius: 12px; overflow: hidden; width: 100%; }
        .phone-cc { padding: 11px 12px; border-right: 1.5px solid; font-weight: 600; font-size: 0.875rem; flex-shrink: 0; }
        .phone-input-row input { flex: 1; border: none; outline: none; padding: 11px 12px; font-size: 0.9375rem; background: transparent; font-family: 'Inter', sans-serif; min-width: 0; }
        .primary-btn { border: none; border-radius: 12px; padding: 12px 14px; font-size: 0.875rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; }
        .primary-btn:disabled { cursor: not-allowed; }
        .secondary-btn { border: 1.5px solid; background: transparent; border-radius: 12px; padding: 11px 14px; font-size: 0.8125rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .secondary-btn.small { padding: 7px 10px; font-size: 0.75rem; }
        .text-btn { background: none; border: none; font-size: 0.8125rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; align-self: center; padding: 4px; }
        .fine-print { font-size: 0.75rem; line-height: 1.45; }
        .flex1 { flex: 1; min-width: 0; }
        .two-btn-row { display: flex; gap: 10px; margin-top: 6px; }

        .passkey-btn { gap: 8px; }
        .passkey-hint { display: flex; align-items: flex-start; gap: 4px; text-align: left; }
        .passkey-error { display: flex; align-items: flex-start; gap: 4px; text-align: left; font-weight: 600; }
        .inline-icon { flex-shrink: 0; margin-top: 0.1em; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── LOCATION SCREEN ─────────────────────────────────────────────── */
        .loc-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px 14px max(14px, env(safe-area-inset-bottom));
        }
        .loc-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 100%;
          gap: 10px;
        }
        .loc-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 2px;
        }
        .loc-pulse-wrap {
          position: relative;
          width: 78px;
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .loc-radar-halo {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1.5px dashed rgba(15, 61, 92, 0.35);
          animation: spin 16s linear infinite;
        }
        .loc-pulse {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(15,61,92,0.12);
        }
        .loc-pulse.pulsing { animation: locPulse 1.4s infinite; }
        @keyframes locPulse {
          0% { box-shadow: 0 0 0 0 rgba(15,61,92,0.32); }
          100% { box-shadow: 0 0 0 20px rgba(15,61,92,0); }
        }
        .loc-badge-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }
        .loc-title {
          font-size: 1.2188rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1.25;
          margin-bottom: 5px;
        }
        .loc-desc {
          font-size: 0.7813rem;
          line-height: 1.42;
          max-width: 290px;
        }
        .loc-features {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin: 4px 0;
        }
        .loc-feat-card {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 13px;
          border: 1px solid;
          text-align: left;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .loc-feat-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .loc-feat-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .loc-feat-head {
          font-size: 0.7813rem;
          font-weight: 700;
          font-family: 'Manrope', sans-serif;
          line-height: 1.2;
        }
        .loc-feat-sub {
          font-size: 0.6875rem;
          line-height: 1.35;
          margin-top: 1px;
        }
        .manual-loc-card {
          border-radius: 14px;
          border: 1px solid;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          margin: 8px 0;
          box-shadow: 0 4px 14px rgba(0,0,0,0.04);
        }
        .manual-loc-input {
          width: 100%;
          border: 1.5px solid;
          border-radius: 11px;
          padding: 10px 12px;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          outline: none;
        }
        .loc-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding-top: 2px;
          width: 100%;
        }
        .loc-allow-btn {
          width: 100%;
          height: 42px;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 13px;
          box-shadow: 0 4px 14px rgba(15,61,92,0.2);
        }
        .loc-privacy-note {
          font-size: 0.6563rem;
          text-align: center;
          line-height: 1.3;
          margin-top: 2px;
        }

        /* ── APP HEADER ──────────────────────────────────────────────────── */
        .app-header {
          flex-shrink: 0; display: flex; align-items: center; gap: 8px;
          padding: 10px 12px 8px;
          padding-top: max(8px, env(safe-area-inset-top));
          width: 100%; max-width: 100%; overflow: hidden;
        }
        .header-loc { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; background: none; border: none; padding: 0; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif; overflow: hidden; }
        .header-loc-text { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
        .header-loc-label { font-size: 0.6563rem; font-weight: 600; letter-spacing: 0.01em; }
        .header-loc-value { font-size: 0.8438rem; font-weight: 700; font-family: 'Manrope', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .header-mid { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.12); border: 1px solid; border-radius: 18px; padding: 7px 11px; font-size: 0.7812rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; flex-shrink: 0; }

        /* ── MODULE SCREENS (Maps/Report/SOS/Shelter/Authority) ───────────── */
        .module-screen {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px));
          width: 100%; max-width: 100%;
        }
        .section-heading { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 1.0625rem; margin-bottom: 12px; }

        /* ── CHIP ROW ─────────────────────────────────────────────────────── */
        .chip-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; align-items: center; width: 100%; -webkit-overflow-scrolling: touch; }
        .chip-row::-webkit-scrollbar { display: none; }
        .chip { flex-shrink: 0; border: 1.5px solid; border-radius: 20px; padding: 8px 14px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: 'Manrope', sans-serif; }

        /* ── LEAFLET MAP WRAPPER ─────────────────────────────────────────── */
        .leaflet-wrap {
          position: relative;
          width: 100%; max-width: 100%;
          border-radius: 18px;
          border: 1px solid;
          overflow: hidden;
          margin-bottom: 16px;
          isolation: isolate;
          /* prevent the map from creating horizontal scroll */
          flex-shrink: 0;
        }
        /* Override Leaflet's own sizing to ensure it never overflows */
        .leaflet-wrap .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background: ${c.surfaceAlt};
          font-family: 'Inter', sans-serif;
          z-index: 1;
        }
        /* Compact attribution on small screens */
        .leaflet-wrap .leaflet-control-attribution {
          font-size: 0.6rem;
          max-width: 60vw;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── MAP REFRESH BUTTON ───────────────────────────────────────────── */
        .map-refresh-btn {
          flex-shrink: 0;
          width: 36px; height: 36px;
          min-width: 36px; min-height: 36px; /* reliable tap target */
          border-radius: 10px;
          border: 1.5px solid;
          background: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .map-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── LOCATION EMPTY STATE ────────────────────────────────────────── */
        .loc-empty-state {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          gap: 10px;
          padding: 32px 18px;
          border: 1px solid;
          border-radius: 18px;
          margin-top: 12px;
          width: 100%; max-width: 100%;
        }
        .loc-empty-state .primary-btn {
          width: auto;
          padding-left: 24px; padding-right: 24px;
          margin-top: 6px;
        }

        /* ── LOCATION ERROR BANNER ───────────────────────────────────────── */
        .location-error-banner {
          flex-shrink: 0;
          display: flex; align-items: center;
          gap: 8px;
          padding: 10px 16px;
          font-size: 0.8125rem; font-weight: 600;
          font-family: 'Inter', sans-serif;
          width: 100%; max-width: 100%;
          word-break: break-word;
        }

        /* ── LISTS / CARDS ───────────────────────────────────────────────── */
        .list-col { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .facility-row, .shelter-card, .report-row, .recipient-row, .contact-row { display: flex; align-items: center; gap: 12px; border-radius: 14px; padding: 12px; border: none; border-left: 4px solid; cursor: pointer; text-align: left; width: 100%; max-width: 100%; overflow: hidden; }
        .recipient-row { border-left: none; border: 1.5px solid; justify-content: space-between; }
        .contact-row { border-left: none; border: 1px solid; justify-content: space-between; }
        .facility-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .facility-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; overflow: hidden; }
        .facility-name { font-size: 0.9375rem; font-weight: 700; font-family: 'Manrope', sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .facility-sub { font-size: 0.7812rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .checkbox { width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .shelter-card { flex-direction: column; align-items: flex-start; gap: 4px; }
        .shelter-card-top { display: flex; justify-content: space-between; width: 100%; align-items: center; }
        .status-pill { font-size: 0.7188rem; font-weight: 700; padding: 4px 10px; border-radius: 10px; font-family: 'Manrope', sans-serif; }
        .view-toggle { display: flex; border: 1.5px solid; border-radius: 12px; overflow: hidden; }
        .view-toggle button { border: none; padding: 7px 13px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; }
        .view-toggle.wide button { flex: 1; padding: 10px; }

        .facility-detail { display: flex; flex-direction: column; gap: 10px; }
        .detail-row { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
        .detail-actions { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }

        /* ── REPORT ──────────────────────────────────────────────────────── */
        .step-indicator { display: flex; gap: 6px; margin-bottom: 16px; }
        .step-indicator-seg { flex: 1; height: 4px; border-radius: 3px; }
        .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
        .type-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid; border-radius: 16px; padding: 14px 6px; cursor: pointer; text-align: center; }
        .type-card span { font-size: 0.75rem; font-weight: 600; line-height: 1.3; }
        .textarea { width: 100%; min-height: 90px; border-radius: 14px; border: 1.5px solid; padding: 12px; font-size: 0.875rem; font-family: 'Inter', sans-serif; resize: none; margin-bottom: 12px; }
        .severity-row { display: flex; gap: 8px; margin-top: 8px; margin-bottom: 4px; }
        .severity-chip { flex: 1; border: 1.5px solid; border-radius: 12px; padding: 11px 0; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; }
        .attach-row { display: flex; gap: 8px; margin-top: 8px; margin-bottom: 6px; }
        .attach-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; border: 1.5px solid; border-radius: 14px; padding: 13px 4px; background: none; cursor: pointer; font-size: 0.75rem; font-weight: 600; }
        .confirm-hero { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 26px 18px; border-radius: 18px; margin-bottom: 16px; text-align: center; }
        .report-id { font-size: 1.25rem; font-weight: 800; font-family: 'Manrope', sans-serif; letter-spacing: 0.02em; }
        .status-track { display: flex; flex-direction: column; margin-bottom: 16px; }
        .status-track-row { display: flex; align-items: flex-start; gap: 12px; padding: 2px 0; font-size: 0.8125rem; }
        .status-track-dotwrap { display: flex; flex-direction: column; align-items: center; }
        .status-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; }
        .status-line { width: 2px; flex: 1; min-height: 18px; }
        .summary-card { border: 1px solid; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; width: 100%; }
        .summary-line { display: flex; justify-content: space-between; font-size: 0.8438rem; gap: 10px; flex-wrap: wrap; }

        /* ── SOS ─────────────────────────────────────────────────────────── */
        .sos-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 12px; }
        .sos-cat-card { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 1.5px solid; border-radius: 10px; padding: 6px 2px; cursor: pointer; }
        .sos-cat-card span { font-size: 0.5938rem; font-weight: 700; text-align: center; line-height: 1.2; }
        .sos-button-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 6px; }
        .sos-big-btn {
          width: min(130px, 42vw); height: min(130px, 42vw);
          border-radius: 50%; border: none; color: #fff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 0.8438rem;
          letter-spacing: 0.03em; cursor: pointer;
          box-shadow: 0 0 0 8px rgba(214,40,40,0.12), 0 8px 24px rgba(214,40,40,0.35);
        }
        .sos-big-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
        .sos-big-btn.pressing { transform: scale(0.95); }
        .sos-sent { display: flex; flex-direction: column; align-items: center; gap: 14px; padding-top: 30px; }
        .radar-wrap { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .radar-ring { position: absolute; border-radius: 50%; border-width: 2px; border-style: solid; animation: radar 1.8s infinite; }
        .radar-ring.r1 { width: 100%; height: 100%; }
        .radar-ring.r2 { width: 100%; height: 100%; animation-delay: 0.9s; }
        @keyframes radar { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(1); opacity: 0; } }
        .radar-core { position: relative; width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 2; }

        /* ── AUTHORITY ───────────────────────────────────────────────────── */
        .authority-card { border: 1px solid; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .authority-card-top { display: flex; align-items: center; gap: 10px; }
        .authority-meta { display: flex; justify-content: space-between; font-size: 0.75rem; margin: 4px 0 8px; flex-wrap: wrap; gap: 4px; }
        .authority-status-row { display: flex; justify-content: space-between; align-items: center; }

        /* ── SETTINGS / MENU ─────────────────────────────────────────────── */
        .menu-list { display: flex; flex-direction: column; gap: 6px; }
        .menu-row { display: flex; align-items: center; gap: 12px; padding: 13px 4px; border: none; border-bottom: 1px solid; background: none; cursor: pointer; font-size: 0.875rem; font-family: 'Inter', sans-serif; width: 100%; }
        .toggle { width: 38px; height: 22px; border-radius: 12px; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .toggle.on .toggle-knob { left: 18px; }
        .add-contact-form { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .add-contact-form input { border: 1.5px solid; border-radius: 12px; padding: 12px; font-size: 0.875rem; font-family: 'Inter', sans-serif; width: 100%; }
        .contact-actions { display: flex; gap: 4px; }

        /* ── BOTTOM NAV ──────────────────────────────────────────────────── */
        .bottom-nav {
          flex-shrink: 0; display: flex; align-items: center;
          border-top: 1px solid;
          padding: 6px 4px max(8px, env(safe-area-inset-bottom));
          position: relative;
          width: 100%; max-width: 100%;
        }
        .nav-item, .nav-sos-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; padding: 4px 1px; min-width: 0; }
        .nav-label { font-size: 0.6563rem; font-weight: 700; font-family: 'Manrope', sans-serif; letter-spacing: 0.01em; white-space: nowrap; }
        .nav-sos-btn { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: -25px; box-shadow: 0 6px 16px rgba(214,40,40,0.45), 0 0 0 4px ${c.surface}; flex-shrink: 0; }
        .nav-sos-active { box-shadow: 0 6px 16px rgba(214,40,40,0.6), 0 0 0 4px ${c.surface}, 0 0 0 8px rgba(214,40,40,0.25); }

        /* ── SHEETS / MODALS ─────────────────────────────────────────────── */
        .sheet-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: flex-end; border-radius: inherit; overflow: hidden; }
        .sheet {
          width: 100%; max-width: 100%;
          background: ${c.surface};
          border-radius: 24px 24px 0 0;
          padding: 10px 18px max(26px, env(safe-area-inset-bottom));
          max-height: 88%;
          overflow-y: auto; overflow-x: hidden;
        }
        .sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: ${c.border}; margin: 4px auto 10px; }
        .sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .sheet-title { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 1.0625rem; color: ${c.ink}; }

        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <div className="phone-frame">
        <div className="phone-screen">
          <div className="notch" />
          <div className="home-indicator" />
          <StatusBar
            c={{ headerText: stage === "location" ? c.ink : "#FFFFFF" }}
            bg={stage === "location" ? c.bg : c.primary}
          />

          {stage === "loading" && (
            <div className="screen" style={{ background: c.primary, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 16 }}>
              <div className="brand-mark" style={{ width: 68, height: 68, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={40} color={c.primary} />
              </div>
              <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.5rem", margin: 0 }}>RakshaNet</h1>
              <Loader2 size={24} className="spin" style={{ opacity: 0.8 }} />
            </div>
          )}
          {stage === "login" && (
            <LoginScreen c={c} t={t} onAuthenticated={(p) => { setPhone(p); setStage("location"); }} />
          )}
          {stage === "location" && (
            <LocationScreen c={c} t={t} onDone={(loc) => { setLocation(loc); setStage("home"); }} />
          )}
          {stage === "home" && (
            <>
              <AppHeader
                c={c} t={t} location={location} locating={locating}
                isOnline={isOnline}
                onOpenContacts={() => setContactsOpen(true)}
                onOpenMenu={() => setMenuOpen(true)}
                onRefreshLocation={refreshLocation}
                onOpenLocationPicker={() => setLocationPickerOpen(true)}
              />

              {/* Offline Warning Banner */}
              {!isOnline && (
                <div style={{ background: c.warnSoft, borderBottom: `1px solid ${c.warn}`, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, color: c.warn, flexShrink: 0 }}>
                  <WifiOff size={15} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.7812rem", fontWeight: 700, flex: 1 }}>
                    Offline Mode: Emergencies queue locally ({offlineQueue.length} pending)
                  </span>
                  {offlineQueue.length > 0 && (
                    <button
                      className="secondary-btn small"
                      style={{ borderColor: c.warn, color: c.warn, padding: "2px 8px", fontSize: "0.6875rem" }}
                      onClick={() => {
                        if (navigator.onLine) {
                          setIsOnline(true);
                          syncOfflineQueue().then((cnt) => {
                            setOfflineQueue(getOfflineQueue());
                            setSyncToast(cnt > 0 ? `Synced ${cnt} emergency records!` : "");
                          });
                        }
                      }}
                    >
                      Sync
                    </button>
                  )}
                </div>
              )}

              {/* Sync Feedback Toast */}
              {syncToast && (
                <div style={{ background: c.safe, color: "#fff", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: "0.7812rem", fontWeight: 700, flexShrink: 0 }}>
                  <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                  <span>{syncToast}</span>
                </div>
              )}

              {/* Public Authority Emergency Broadcast Ticker */}
              {broadcasts.length > 0 && (
                <div style={{ background: c.critical || c.danger, color: "#fff", padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", flexShrink: 0 }}>
                  <Radio size={14} className="spin" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>
                    {broadcasts[0].title}: {broadcasts[0].message}
                  </div>
                  <button className="icon-btn" onClick={() => setBroadcasts((b) => b.slice(1))} style={{ color: "#fff", padding: 0 }} aria-label="Dismiss alert">
                    <X size={14} />
                  </button>
                </div>
              )}

              {locationError && (
                <div className="location-error-banner" style={{ background: c.dangerSoft, color: c.danger }}>
                  <ShieldAlert size={14} />
                  <span>{locationError}</span>
                  <button className="icon-btn" onClick={() => setLocationError("")} style={{ marginLeft: "auto", color: c.danger }} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </div>
              )}
              {activeTab === "maps" && (
                <MapsScreen
                  c={c}
                  location={location}
                  facilities={facilities}
                  facilitiesStatus={facilitiesStatus}
                  facilitiesFromCache={facilitiesFromCache}
                  locating={locating}
                  onRefreshLocation={refreshLocation}
                  weatherData={weatherData}
                  onOpenWeather={() => setWeatherOpen(true)}
                  facilitiesCachedAt={facilitiesCachedAt}
                  mapCacheStatus={mapCacheStatus}
                  cachingMap={cachingMap}
                  mapProgress={mapProgress}
                  onCacheAreaMap={handleOpenCacheModal}
                  onClearMapCache={handleClearMapCache}
                  isOnline={isOnline}
                />
              )}
              {activeTab === "report" && (
                <ReportScreen
                  c={c}
                  location={location}
                  isOnline={isOnline}
                  onQueueReport={handleQueueReport}
                />
              )}
              {activeTab === "sos" && (
                <SosScreen
                  c={c}
                  location={location}
                  contacts={contacts}
                  isOnline={isOnline}
                  phone={phone}
                  onQueueSos={handleQueueSos}
                />
              )}
              {activeTab === "shelter" && (
                <ShelterScreen c={c} location={location} facilities={facilities} facilitiesStatus={facilitiesStatus} facilitiesFromCache={facilitiesFromCache} locating={locating} onRefreshLocation={refreshLocation} />
              )}
              {activeTab === "authority" && (
                <AuthorityScreen
                  c={c}
                  reports={reports}
                  setReports={setReports}
                  onBroadcastAlert={handleBroadcastAlert}
                />
              )}
              <BottomNav c={c} t={t} active={activeTab} setActive={setActiveTab} />

              <ContactsSheet c={c} open={contactsOpen} onClose={() => setContactsOpen(false)} contacts={contacts} setContacts={setContacts} />
              <MenuSheet
                c={c} open={menuOpen} onClose={() => setMenuOpen(false)}
                theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}
                sirenOn={siren.active} toggleSiren={toggleSiren} t={t}
                onOpenSurvival={() => setSurvivalOpen(true)}
                notifPermission={notifPermission}
                onRequestNotif={handleRequestNotif}
                onLogout={handleLogout}
              />
              <WeatherHazardSheet
                c={c}
                open={weatherOpen}
                onClose={() => setWeatherOpen(false)}
                weatherData={weatherData}
                weatherLoading={weatherLoading}
                onRefreshWeather={refreshWeather}
              />
              <SurvivalGuidesSheet
                c={c}
                open={survivalOpen}
                onClose={() => setSurvivalOpen(false)}
              />
              <CacheAreaSheet
                c={c}
                open={cacheSheetOpen}
                onClose={() => setCacheSheetOpen(false)}
                location={location}
                locating={locating}
                onRefreshLocation={refreshLocation}
                mapCacheStatus={mapCacheStatus}
                cachingMap={cachingMap}
                mapProgress={mapProgress}
                onStartCache={handleStartCache}
                onClearCache={handleClearMapCache}
              />
              <LocationPickerSheet
                c={c}
                open={locationPickerOpen}
                onClose={() => setLocationPickerOpen(false)}
                onSelectLocation={handleManualLocationSelect}
                onUseGPS={refreshLocation}
                locating={locating}
                currentLocation={location}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
