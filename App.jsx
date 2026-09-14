import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin, Phone, Users, MoreVertical, Map as MapIcon, FileWarning, Siren,
  Building2, ShieldCheck, X, ChevronRight, ChevronLeft, Plus, Camera, Video,
  Mic, CheckCircle2, Navigation2, Sun, Moon, Globe, Info, Search,
  Star, Trash2, Pencil, Flame, Stethoscope, Car, Waves, Mountain,
  Building, UserX, CloudRain, HelpCircle, Square, Clock, ClipboardList,
  BadgeCheck, ChevronDown, Volume2, VolumeX, LocateFixed, PhoneCall,
  Fingerprint, KeyRound, Loader2, ShieldAlert
} from "lucide-react";
import {
  checkUserExists,
  registerPasskey,
  loginWithPasskey,
  isWebAuthnSupported,
  verifyCurrentSession,
  logout
} from "./lib/auth";

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
    tagline: "Emergency response, one tap away",
    phone: "Phone number",
    passkeyContinue: "Continue with Passkey", passkeyCreate: "Create Passkey",
    passkeyHint: "Use your device's fingerprint, face recognition, or device PIN.",
    passkeyCreateHint: "Register this device using fingerprint, face recognition, or device PIN.",
    newUserLink: "New user? Create Passkey",
    existingUserLink: "Already registered? Sign in with Passkey",
    passkeyChecking: "Checking your account…", passkeyCreating: "Creating your passkey…",
    passkeyVerifying: "Verifying your passkey…", passkeyCreated: "Passkey verified successfully",
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
    appName: "RakshaNet", tagline: "అత్యవసర సహాయం, ఒక్క నొక్కుతో",
    phone: "ఫోన్ నంబర్",
    passkeyContinue: "పాస్‌కీతో కొనసాగించండి", passkeyCreate: "పాస్‌కీ సృష్టించండి",
    passkeyHint: "మీ పరికరం యొక్క ఫింగర్‌ప్రింట్, ఫేస్ రికగ్నిషన్ లేదా PIN ఉపయోగించండి.",
    passkeyCreateHint: "ఫింగర్‌ప్రింట్, ఫేస్ లేదా PIN తో మీ పరికరాన్ని నమోదు చేయండి.",
    newUserLink: "కొత్త వినియోగదారులా? పాస్‌కీ సృష్టించండి",
    existingUserLink: "ఇప్పటికే ఖాతా ఉందా? పాస్‌కీతో లాగిన్ అవ్వండి",
    passkeyChecking: "మీ ఖాతాను తనిఖీ చేస్తోంది…", passkeyCreating: "పాస్‌కీని సృష్టిస్తోంది…",
    passkeyVerifying: "పాస్‌కీని ధృవీకరిస్తోంది…", passkeyCreated: "పాస్‌కీ విజయవంతంగా ధృవీకరించబడింది",
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
    appName: "RakshaNet", tagline: "आपातकालीन सहायता, एक टैप में",
    phone: "फ़ोन नंबर",
    passkeyContinue: "पासकी से जारी रखें", passkeyCreate: "पासकी बनाएं",
    passkeyHint: "अपने डिवाइस के फिंगरप्रिंट, फेस रिकग्निशन या PIN का उपयोग करें।",
    passkeyCreateHint: "फिंगरप्रिंट, फेस या PIN से अपना डिवाइस पंजीकृत करें।",
    newUserLink: "नए उपयोगकर्ता? पासकी बनाएं",
    existingUserLink: "पहले से खाता है? पासकी से लॉगिन करें",
    passkeyChecking: "आपका खाता जांचा जा रहा है…", passkeyCreating: "पासकी बनाई जा रही है…",
    passkeyVerifying: "पासकी सत्यापित की जा रही है…", passkeyCreated: "पासकी सफलतापूर्वक सत्यापित की गई",
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
   MOCK DATA
   ========================================================================= */
const FACILITIES = [
  { id: "f1", type: "hospital", name: "Sri Ram General Hospital", address: "Ring Road, Kavali", distance: "1.2 km", phone: "+91 98765 10001", x: 46, y: 38 },
  { id: "f2", type: "fire", name: "Kavali Fire Station", address: "Station Road, Kavali", distance: "2.0 km", phone: "+91 98765 10002", x: 68, y: 60 },
  { id: "f3", type: "police", name: "Town Police Station", address: "Main Bazaar, Kavali", distance: "0.9 km", phone: "+91 98765 10003", x: 30, y: 55 },
  { id: "f4", type: "ambulance", name: "108 Ambulance Point", address: "Bus Stand, Kavali", distance: "1.6 km", phone: "108", x: 55, y: 74 },
  { id: "f5", type: "shelter", name: "Govt. High School Shelter", address: "School Street, Kavali", distance: "2.8 km", phone: "+91 98765 10004", x: 20, y: 22 },
  { id: "f6", type: "govt", name: "Disaster Mgmt. Office", address: "Collectorate Road", distance: "3.4 km", phone: "+91 98765 10005", x: 78, y: 28 },
];

const FACILITY_META = {
  hospital: { label: "Hospital", icon: Stethoscope, color: "danger" },
  fire: { label: "Fire Station", icon: Flame, color: "warn" },
  police: { label: "Police Station", icon: ShieldCheck, color: "primary" },
  ambulance: { label: "Ambulance", icon: Car, color: "danger" },
  shelter: { label: "Shelter", icon: Building2, color: "safe" },
  govt: { label: "Govt. Office", icon: Building, color: "primary" },
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

const SHELTERS = [
  { id: "s1", name: "Govt. High School Relief Camp", type: "flood", address: "School Street, Kavali", distance: "2.8 km", status: "Open", capacity: "120 / 200", phone: "+91 98765 10004" },
  { id: "s2", name: "Community Hall Evacuation Center", type: "fire", address: "Temple Road, Kavali", distance: "1.9 km", status: "Open", capacity: "40 / 80", phone: "+91 98765 10006" },
  { id: "s3", name: "ZP Junior College Safe Zone", type: "earthquake", address: "College Road, Kavali", distance: "3.6 km", status: "Limited", capacity: "180 / 190", phone: "+91 98765 10007" },
  { id: "s4", name: "Panchayat Relief Camp", type: "flood", address: "Canal Bund Road", distance: "4.1 km", status: "Open", capacity: "60 / 150", phone: "+91 98765 10008" },
  { id: "s5", name: "Municipal Stadium Evacuation Center", type: "fire", address: "Stadium Road", distance: "2.2 km", status: "Full", capacity: "200 / 200", phone: "+91 98765 10009" },
];

const SEVERITIES = [
  { id: "low", label: "Low", color: "safe" },
  { id: "medium", label: "Medium", color: "warn" },
  { id: "high", label: "High", color: "danger" },
  { id: "critical", label: "Critical", color: "critical" },
];

const STATUS_STEPS = ["Report Submitted", "Report Received", "Assigned to Authority", "In Progress", "Resolved"];

const SEED_REPORTS = [
  { id: "RN-48213", type: "flood", severity: "high", location: "Kavali, Andhra Pradesh", time: "Today, 9:14 AM", status: 2, authority: "Disaster Management Authority", description: "Water entering ground-floor houses near canal bund." },
  { id: "RN-48187", type: "road", severity: "critical", location: "NH16, Kavali Bypass", time: "Yesterday, 6:40 PM", status: 4, authority: "Hospital / Police", description: "Two-vehicle collision, one person trapped." },
  { id: "RN-48122", type: "medical", severity: "medium", location: "Ramalingapuram, Kavali", time: "2 days ago", status: 3, authority: "Hospital / Ambulance", description: "Elderly person collapsed, needs assistance." },
];

/* =========================================================================
   SMALL HELPERS
   ========================================================================= */
function useAudioSiren() {
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const lfoRef = useRef(null);

  const start = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 700;
      lfo.type = "sine";
      lfo.frequency.value = 2.2;
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      lfo.start();
      ctxRef.current = ctx;
      oscRef.current = osc;
      lfoRef.current = lfo;
      gainRef.current = gain;
    } catch (e) { /* audio unavailable */ }
  }, []);

  const stop = useCallback(() => {
    try {
      oscRef.current && oscRef.current.stop();
      lfoRef.current && lfoRef.current.stop();
      ctxRef.current && ctxRef.current.close();
    } catch (e) { /* noop */ }
    ctxRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);
  return { start, stop };
}

function Sheet({ open, onClose, title, children, height = "auto" }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" style={{ maxHeight: height }} onClick={(e) => e.stopPropagation()}>
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

function StatusBar({ c }) {
  return (
    <div className="statusbar" style={{ color: c.headerText }}>
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
  const [errorMsg, setErrorMsg] = useState("");
  const supportedRef = useRef(isWebAuthnSupported());
  const supported = supportedRef.current;

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const busy = status !== "idle" && status !== "success";

  const handleContinue = async () => {
    if (!phoneValid || busy || status === "success") return;
    setErrorMsg("");

    if (!supported) {
      setErrorMsg(t.passkeyUnsupported);
      return;
    }

    try {
      let session;

      if (mode === "register") {
        setStatus("registering");
        session = await registerPasskey(phone);
      } else {
        setStatus("authenticating");
        session = await loginWithPasskey(phone);
      }

      setStatus("success");
      setTimeout(() => onAuthenticated(session?.user?.phone ?? phone), 650);
    } catch (err) {
      console.error("[AUTH-UI] Ceremony error:", err.code, err.message, err);
      setStatus("idle");
      if (err?.code === "no_passkey") {
        setErrorMsg("No passkey is registered for this number. Click 'New user? Create Passkey' below.");
      } else {
        setErrorMsg(err?.message || "Passkey authentication failed. Please try again.");
      }
    }
  };

  const buttonLabel = () => {
    if (status === "checking") return t.passkeyChecking;
    if (status === "registering") return t.passkeyCreating;
    if (status === "authenticating") return t.passkeyVerifying;
    if (status === "success") return t.passkeyCreated;
    return mode === "register" ? t.passkeyCreate : t.passkeyContinue;
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
        <label className="field-label" style={{ color: c.inkSoft }}>{t.phone}</label>
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
          style={{ color: c.primary, padding: "2px 0", fontSize: "0.8125rem", cursor: "pointer" }}
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
      </div>
    </div>
  );
}

function LocationScreen({ c, t, onDone }) {
  const [phase, setPhase] = useState("asking"); // asking | fetching | found | manual
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    if (phase === "fetching") {
      const timer = setTimeout(() => setPhase("found"), 1400);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "found") {
      const timer = setTimeout(() => onDone("Kavali, Andhra Pradesh"), 900);
      return () => clearTimeout(timer);
    }
  }, [phase, onDone]);

  return (
    <div className="screen" style={{ background: c.bg }}>
      <div className="loc-wrap">
        <div className="loc-pulse-wrap">
          <div className={"loc-pulse" + (phase === "fetching" ? " pulsing" : "")} style={{ background: c.primarySoft }}>
            {phase === "found" ? <CheckCircle2 size={34} color={c.safe} /> : <LocateFixed size={34} color={c.primary} />}
          </div>
        </div>
        {phase === "asking" && (
          <>
            <h2 style={{ color: c.ink }}>{t.allowLoc}</h2>
            <p style={{ color: c.inkSoft }}>RakshaNet uses your live location to route SOS alerts, find nearby shelters and show emergency facilities around you.</p>
            <button className="primary-btn" style={{ background: c.primary, color: "#fff" }} onClick={() => setPhase("fetching")}>Allow while using app</button>
            <button className="text-btn" style={{ color: c.inkSoft }} onClick={() => setPhase("manual")}>{t.manualLoc}</button>
          </>
        )}
        {phase === "fetching" && <h2 style={{ color: c.ink }}>{t.fetchingLoc}</h2>}
        {phase === "found" && <h2 style={{ color: c.ink }}>{t.locFound}</h2>}
        {phase === "manual" && (
          <>
            <h2 style={{ color: c.ink }}>{t.manualLoc}</h2>
            <input
              className="manual-loc-input"
              placeholder="Enter city / area / village"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              style={{ borderColor: c.border, color: c.ink, background: c.surface }}
            />
            <button
              className="primary-btn"
              disabled={!manualText.trim()}
              style={{ background: manualText.trim() ? c.primary : c.border, color: "#fff" }}
              onClick={() => onDone(manualText.trim())}
            >
              {t.continueApp}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   HEADER / BOTTOM NAV
   ========================================================================= */
function AppHeader({ c, t, location, onOpenContacts, onOpenMenu }) {
  return (
    <div className="app-header" style={{ background: c.primary }}>
      <div className="header-loc">
        <MapPin size={16} color={c.headerText} />
        <div className="header-loc-text">
          <span className="header-loc-label" style={{ color: "rgba(255,255,255,0.7)" }}>{t.currentLocation}</span>
          <span className="header-loc-value" style={{ color: c.headerText }}>{location}</span>
        </div>
      </div>
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
function MapsScreen({ c }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const filtered = filter === "all" ? FACILITIES : FACILITIES.filter((f) => f.type === filter);

  return (
    <div className="module-screen">
      <div className="chip-row">
        {["all", ...Object.keys(FACILITY_META)].map((k) => (
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
            {k === "all" ? "All" : FACILITY_META[k].label}
          </button>
        ))}
      </div>

      <div className="map-canvas" style={{ background: c.surfaceAlt, borderColor: c.border }}>
        <svg viewBox="0 0 100 100" className="map-grid-svg">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={"v" + i} x1={i * 12.5} y1="0" x2={i * 12.5} y2="100" stroke={c.border} strokeWidth="0.3" />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={"h" + i} x1="0" y1={i * 12.5} x2="100" y2={i * 12.5} stroke={c.border} strokeWidth="0.3" />
          ))}
        </svg>
        <div className="user-dot-wrap" style={{ left: "50%", top: "48%" }}>
          <div className="user-dot-ring" style={{ borderColor: c.primary }} />
          <div className="user-dot" style={{ background: c.primary }} />
        </div>
        {filtered.map((f) => {
          const meta = FACILITY_META[f.type];
          const Icon = meta.icon;
          const color = c[meta.color] || c.primary;
          return (
            <button
              key={f.id}
              className="map-marker"
              style={{ left: f.x + "%", top: f.y + "%", background: color }}
              onClick={() => setSelected(f)}
              aria-label={f.name}
            >
              <Icon size={13} color="#fff" />
            </button>
          );
        })}
        <div className="map-zoom-controls">
          <button className="map-zoom-btn" style={{ background: c.surface, color: c.ink }}>+</button>
          <button className="map-zoom-btn" style={{ background: c.surface, color: c.ink }}>−</button>
        </div>
      </div>

      <div className="section-heading" style={{ color: c.ink }}>Nearby emergency facilities</div>
      <div className="list-col">
        {filtered.map((f) => {
          const meta = FACILITY_META[f.type];
          const Icon = meta.icon;
          const color = c[meta.color] || c.primary;
          return (
            <button key={f.id} className="facility-row" style={{ background: c.surface, borderLeftColor: color }} onClick={() => setSelected(f)}>
              <div className="facility-icon" style={{ background: color + "1A" }}><Icon size={18} color={color} /></div>
              <div className="facility-info">
                <span className="facility-name" style={{ color: c.ink }}>{f.name}</span>
                <span className="facility-sub" style={{ color: c.inkSoft }}>{meta.label} · {f.distance}</span>
              </div>
              <ChevronRight size={18} color={c.inkSoft} />
            </button>
          );
        })}
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? FACILITY_META[selected.type].label : ""}>
        {selected && (
          <div className="facility-detail">
            <h3 style={{ color: c.ink }}>{selected.name}</h3>
            <div className="detail-row"><MapPin size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.address} · {selected.distance}</span></div>
            <div className="detail-row"><Phone size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.phone}</span></div>
            <div className="detail-actions">
              <button className="primary-btn flex1" style={{ background: c.primary, color: "#fff" }}><Navigation2 size={16} />&nbsp;Directions</button>
              <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }}><PhoneCall size={16} />&nbsp;Call</button>
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
function ReportScreen({ c, location }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [media, setMedia] = useState({ photo: false, video: false, voice: false });
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (type && step === 3) setRecipients(RECIPIENTS_BY_TYPE[type.id] || []);
  }, [type, step]);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const toggleRecipient = (r) => {
    setRecipients((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const reset = () => {
    setStep(1); setType(null); setDescription(""); setSeverity("medium");
    setMedia({ photo: false, video: false, voice: false }); setVoiceSeconds(0);
    setRecording(false); setRecipients([]); setSubmitted(null);
  };

  const submit = () => {
    const id = "RN-" + Math.floor(10000 + Math.random() * 89999);
    setSubmitted({ id, type, description, severity, location, recipients, time: "Just now" });
  };

  if (submitted) {
    return (
      <div className="module-screen">
        <div className="confirm-hero" style={{ background: c.safeSoft }}>
          <CheckCircle2 size={40} color={c.safe} />
          <h2 style={{ color: c.ink }}>Report submitted</h2>
          <p style={{ color: c.inkSoft }}>Report ID</p>
          <span className="report-id" style={{ color: c.ink }}>{submitted.id}</span>
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
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Type</span><span style={{ color: c.ink }}>{submitted.type.label}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Severity</span><span style={{ color: c.ink }}>{SEVERITIES.find(s => s.id === submitted.severity)?.label}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Location</span><span style={{ color: c.ink }}>{submitted.location}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Sent to</span><span style={{ color: c.ink, textAlign: "right" }}>{submitted.recipients.join(", ")}</span></div>
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
            <span style={{ color: c.inkSoft }}>{location} (auto-detected)</span>
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
          <div className="field-label" style={{ color: c.inkSoft, marginTop: 14 }}>Attachments</div>
          <div className="attach-row">
            <button className="attach-btn" style={{ borderColor: media.photo ? c.primary : c.border, color: media.photo ? c.primary : c.ink }} onClick={() => setMedia((m) => ({ ...m, photo: !m.photo }))}>
              <Camera size={20} /><span>Photo</span>
            </button>
            <button className="attach-btn" style={{ borderColor: media.video ? c.primary : c.border, color: media.video ? c.primary : c.ink }} onClick={() => setMedia((m) => ({ ...m, video: !m.video }))}>
              <Video size={20} /><span>Video</span>
            </button>
            <button
              className="attach-btn"
              style={{ borderColor: recording ? c.danger : (media.voice ? c.primary : c.border), color: recording ? c.danger : (media.voice ? c.primary : c.ink) }}
              onClick={() => {
                if (recording) { setRecording(false); setMedia((m) => ({ ...m, voice: true })); }
                else { setVoiceSeconds(0); setRecording(true); }
              }}
            >
              <Mic size={20} />
              <span>{recording ? `${String(Math.floor(voiceSeconds/60)).padStart(2,"0")}:${String(voiceSeconds%60).padStart(2,"0")}` : media.voice ? "Recorded" : "Voice note"}</span>
            </button>
          </div>
          <p className="fine-print" style={{ color: c.inkSoft }}>Recording a voice message helps when typing is difficult during a stressful situation.</p>
          <div className="two-btn-row">
            <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }} onClick={() => setStep(1)}>Back</button>
            <button className="primary-btn flex1" disabled={!description.trim()} style={{ background: description.trim() ? c.primary : c.border, color: "#fff" }} onClick={() => setStep(3)}>Continue</button>
          </div>
        </>
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
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Location</span><span style={{ color: c.ink }}>{location}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Severity</span><span style={{ color: c.ink }}>{SEVERITIES.find(s => s.id === severity)?.label}</span></div>
            <div className="summary-line"><span style={{ color: c.inkSoft }}>Media</span><span style={{ color: c.ink }}>{[media.photo && "Photo", media.video && "Video", media.voice && "Voice note"].filter(Boolean).join(", ") || "None"}</span></div>
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
function SosScreen({ c, location, contacts }) {
  const [category, setCategory] = useState(null);
  const [state, setState] = useState("idle"); // idle | pressing | sent

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

  if (state === "sent") {
    return (
      <div className="module-screen sos-sent">
        <div className="radar-wrap">
          <div className="radar-ring r1" style={{ borderColor: c.danger }} />
          <div className="radar-ring r2" style={{ borderColor: c.danger }} />
          <div className="radar-core" style={{ background: c.danger }}>
            <Siren size={30} color="#fff" />
          </div>
        </div>
        <h2 style={{ color: c.ink, textAlign: "center" }}>SOS alert sent</h2>
        <p style={{ color: c.inkSoft, textAlign: "center" }}>{authorityFor(category?.id)} has been notified with your live location.</p>
        <div className="summary-card" style={{ background: c.surface, borderColor: c.border, width: "100%" }}>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Category</span><span style={{ color: c.ink }}>{category?.label}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Location</span><span style={{ color: c.ink }}>{location}</span></div>
          <div className="summary-line"><span style={{ color: c.inkSoft }}>Notified contacts</span><span style={{ color: c.ink, textAlign: "right" }}>{contacts.length ? contacts.map(x=>x.name).join(", ") : "None saved"}</span></div>
        </div>
        <button className="secondary-btn" style={{ borderColor: c.border, color: c.ink, width: "100%" }} onClick={() => { setState("idle"); setCategory(null); }}>Cancel alert</button>
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
          onMouseUp={() => setState("idle")}
          onMouseLeave={() => state === "pressing" && setState("idle")}
          onTouchStart={() => setState("pressing")}
          onTouchEnd={() => setState("sent")}
          onClick={() => { if (state !== "pressing") setState("sent"); }}
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
function ShelterScreen({ c }) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const filtered = filter === "all" ? SHELTERS : SHELTERS.filter((s) => s.type === filter);

  const statusColor = (status) => status === "Open" ? c.safe : status === "Limited" ? c.warn : c.danger;

  return (
    <div className="module-screen">
      <div className="chip-row">
        {[
          { id: "all", label: "All" }, { id: "flood", label: "Flood" }, { id: "fire", label: "Fire" }, { id: "earthquake", label: "Earthquake" },
        ].map((f) => (
          <button key={f.id} className="chip" onClick={() => setFilter(f.id)} style={{ background: filter === f.id ? c.primary : c.surface, color: filter === f.id ? "#fff" : c.ink, borderColor: filter === f.id ? c.primary : c.border }}>
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="view-toggle" style={{ borderColor: c.border }}>
          <button className={view === "list" ? "vt-active" : ""} style={{ background: view === "list" ? c.primary : "transparent", color: view === "list" ? "#fff" : c.ink }} onClick={() => setView("list")}>List</button>
          <button className={view === "map" ? "vt-active" : ""} style={{ background: view === "map" ? c.primary : "transparent", color: view === "map" ? "#fff" : c.ink }} onClick={() => setView("map")}>Map</button>
        </div>
      </div>

      {view === "map" ? (
        <div className="map-canvas" style={{ background: c.surfaceAlt, borderColor: c.border, height: 200 }}>
          <svg viewBox="0 0 100 100" className="map-grid-svg">
            {Array.from({ length: 9 }).map((_, i) => (<line key={"v"+i} x1={i*12.5} y1="0" x2={i*12.5} y2="100" stroke={c.border} strokeWidth="0.3" />))}
            {Array.from({ length: 9 }).map((_, i) => (<line key={"h"+i} x1="0" y1={i*12.5} x2="100" y2={i*12.5} stroke={c.border} strokeWidth="0.3" />))}
          </svg>
          <div className="user-dot-wrap" style={{ left: "50%", top: "50%" }}>
            <div className="user-dot-ring" style={{ borderColor: c.primary }} />
            <div className="user-dot" style={{ background: c.primary }} />
          </div>
          {filtered.map((s, i) => (
            <button key={s.id} className="map-marker" style={{ left: (20 + i * 15) + "%", top: (25 + (i % 3) * 20) + "%", background: statusColor(s.status) }} onClick={() => setSelected(s)}>
              <Building2 size={13} color="#fff" />
            </button>
          ))}
        </div>
      ) : (
        <div className="list-col">
          {filtered.map((s) => (
            <button key={s.id} className="shelter-card" style={{ background: c.surface, borderLeftColor: statusColor(s.status) }} onClick={() => setSelected(s)}>
              <div className="shelter-card-top">
                <span className="facility-name" style={{ color: c.ink }}>{s.name}</span>
                <span className="status-pill" style={{ background: statusColor(s.status) + "1A", color: statusColor(s.status) }}>{s.status}</span>
              </div>
              <span className="facility-sub" style={{ color: c.inkSoft }}>{s.address} · {s.distance}</span>
              <span className="facility-sub" style={{ color: c.inkSoft }}>Capacity {s.capacity}</span>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Shelter details">
        {selected && (
          <div className="facility-detail">
            <h3 style={{ color: c.ink }}>{selected.name}</h3>
            <span className="status-pill" style={{ background: statusColor(selected.status) + "1A", color: statusColor(selected.status), marginBottom: 10 }}>{selected.status}</span>
            <div className="detail-row"><MapPin size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.address} · {selected.distance}</span></div>
            <div className="detail-row"><Users size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>Capacity {selected.capacity}</span></div>
            <div className="detail-row"><Phone size={16} color={c.inkSoft} /><span style={{ color: c.inkSoft }}>{selected.phone}</span></div>
            <div className="detail-actions">
              <button className="primary-btn flex1" style={{ background: c.primary, color: "#fff" }}><Navigation2 size={16} />&nbsp;Directions</button>
              <button className="secondary-btn flex1" style={{ borderColor: c.border, color: c.ink }}><PhoneCall size={16} />&nbsp;Call</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* =========================================================================
   AUTHORITY MODULE
   ========================================================================= */
function AuthorityScreen({ c, reports, setReports }) {
  const [view, setView] = useState("citizen");
  const [selected, setSelected] = useState(null);

  const advanceStatus = (id) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: Math.min(r.status + 1, STATUS_STEPS.length - 1) } : r)));
  };

  return (
    <div className="module-screen">
      <div className="view-toggle wide" style={{ borderColor: c.border }}>
        <button className={view === "citizen" ? "vt-active" : ""} style={{ background: view === "citizen" ? c.primary : "transparent", color: view === "citizen" ? "#fff" : c.ink }} onClick={() => setView("citizen")}>My reports</button>
        <button className={view === "authority" ? "vt-active" : ""} style={{ background: view === "authority" ? c.primary : "transparent", color: view === "authority" ? "#fff" : c.ink }} onClick={() => setView("authority")}>Authority view</button>
      </div>

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

function MenuSheet({ c, open, onClose, theme, setTheme, lang, setLang, sirenOn, toggleSiren, t, onLogout }) {
  const [screen, setScreen] = useState("root");
  useEffect(() => { if (open) setScreen("root"); }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={screen === "root" ? "Menu" : screen === "about" ? t.about : screen === "theme" ? t.theme : t.language}>
      {screen === "root" && (
        <div className="menu-list">
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
            <span style={{ color: c.danger, fontWeight: 600 }}>Sign Out</span>
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
  const [location, setLocation] = useState("Kavali, Andhra Pradesh");
  const [activeTab, setActiveTab] = useState("maps");
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("en");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sirenOn, setSirenOn] = useState(false);
  const [contacts, setContacts] = useState([
    { id: 1, name: "Anitha (Sister)", phone: "+91 90000 11111", primary: true },
    { id: 2, name: "Ravi (Neighbor)", phone: "+91 90000 22222", primary: false },
  ]);
  const [reports, setReports] = useState(SEED_REPORTS);
  const siren = useAudioSiren();

  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await verifyCurrentSession();
        const userPhone = session?.user?.phone || session?.phone;
        if (userPhone) {
          console.log("[AUTH] Restored active authenticated session for:", userPhone);
          setPhone(userPhone);
          setStage("home");
        } else {
          setStage("login");
        }
      } catch (err) {
        console.warn("[AUTH] Session check error:", err);
        setStage("login");
      }
    }
    restoreSession();
  }, []);

  const handleLogout = async () => {
    await logout();
    setPhone("");
    setStage("login");
    setMenuOpen(false);
  };

  const c = theme === "light" ? LIGHT : DARK;
  const t = STRINGS[lang];

  const toggleSiren = () => {
    setSirenOn((on) => {
      if (!on) siren.start(); else siren.stop();
      return !on;
    });
  };

  return (
    <div className="phone-outer">
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        /* Reference device: 6.7" smartphone, design resolution 1080 x 2340 px (9:19.5). */
        :root {
          --phone-h: min(97vh, 1060px);
          font-size: calc(var(--phone-h) / 53);
        }
        .phone-outer {
          width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 50% 0%, #1c2733, #05080c);
          padding: 10px; font-family: 'Inter', sans-serif; overflow: hidden;
        }
        .phone-frame {
          /* Height unchanged; width widened ~10% over the true 1080:2340 ratio for a more comfortable flagship-style body. */
          height: var(--phone-h); aspect-ratio: 1188 / 2340; width: auto; max-width: 96vw;
          background: #000; border-radius: calc(var(--phone-h) * 0.05);
          padding: calc(var(--phone-h) * 0.013);
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 2px #2a2f36;
          position: relative; flex-shrink: 0;
        }
        .phone-screen {
          width: 100%; height: 100%; background: ${c.bg}; border-radius: calc(var(--phone-h) * 0.04); overflow: hidden;
          position: relative; display: flex; flex-direction: column;
        }
        .notch {
          position: absolute; top: calc(var(--phone-h) * 0.014); left: 50%; transform: translateX(-50%);
          width: calc(var(--phone-h) * 0.09); height: calc(var(--phone-h) * 0.016);
          background: #000; border-radius: calc(var(--phone-h) * 0.014); z-index: 50;
        }
        .home-indicator {
          position: absolute; bottom: calc(var(--phone-h) * 0.008); left: 50%; transform: translateX(-50%);
          width: calc(var(--phone-h) * 0.16); height: calc(var(--phone-h) * 0.0045); min-height: 3px;
          background: ${c.ink}; opacity: 0.35; border-radius: 4px; z-index: 60; pointer-events: none;
        }
        .statusbar {
          height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
          padding: 0 26px; font-size: 0.8125rem; font-weight: 700; font-family: 'Manrope', sans-serif;
        }
        .statusbar-icons { display: flex; gap: 4px; }
        .sb-dot { width: 4px; height: 4px; border-radius: 2px; background: currentColor; opacity: 0.9; }

        .screen { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }

        h1, h2, h3 { font-family: 'Manrope', sans-serif; margin: 0; }
        p { margin: 0; font-size: 0.875rem; line-height: 1.5; }

        .login-screen { justify-content: space-between; padding-bottom: 0; }
        .login-top { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 0 30px; text-align: center; }
        .brand-mark { width: 64px; height: 64px; border-radius: 20px; background: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
        .brand-name { color: #fff; font-size: 1.625rem; font-weight: 800; letter-spacing: -0.02em; }
        .brand-tag { color: rgba(255,255,255,0.85); font-size: 0.875rem; }
        .login-card { border-radius: 28px 28px 0 0; padding: 28px 22px 34px; display: flex; flex-direction: column; gap: 12px; }
        .field-label { font-size: 0.8438rem; font-weight: 600; font-family: 'Manrope', sans-serif; }
        .phone-input-row { display: flex; align-items: center; border: 1.5px solid; border-radius: 14px; overflow: hidden; }
        .phone-cc { padding: 14px 12px; border-right: 1.5px solid; font-weight: 600; font-size: 0.9375rem; }
        .phone-input-row input { flex: 1; border: none; outline: none; padding: 14px 12px; font-size: 1rem; background: transparent; font-family: 'Inter', sans-serif; }
        .primary-btn { border: none; border-radius: 14px; padding: 15px; font-size: 0.9375rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .primary-btn:disabled { cursor: not-allowed; }
        .secondary-btn { border: 1.5px solid; background: transparent; border-radius: 14px; padding: 14px; font-size: 0.875rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .secondary-btn.small { padding: 8px 12px; font-size: 0.7812rem; }
        .text-btn { background: none; border: none; font-size: 0.8438rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; align-self: center; padding: 6px; }
        .fine-print { font-size: 0.7812rem; line-height: 1.5; }
        .flex1 { flex: 1; }
        .two-btn-row { display: flex; gap: 10px; margin-top: 6px; }

        .passkey-btn { gap: 8px; }
        .passkey-hint { display: flex; align-items: flex-start; gap: 4px; text-align: left; }
        .passkey-error { display: flex; align-items: flex-start; gap: 4px; text-align: left; font-weight: 600; }
        .inline-icon { flex-shrink: 0; margin-top: 0.1em; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .loc-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 10px; padding: 30px; }
        .loc-pulse-wrap { margin-bottom: 8px; }
        .loc-pulse { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .loc-pulse.pulsing { animation: locPulse 1.2s infinite; }
        @keyframes locPulse { 0% { box-shadow: 0 0 0 0 rgba(15,61,92,0.25);} 100% { box-shadow: 0 0 0 22px rgba(15,61,92,0);} }
        .loc-wrap .primary-btn { width: 100%; margin-top: 14px; }
        .manual-loc-input { width: 100%; border: 1.5px solid; border-radius: 12px; padding: 13px; font-size: 0.9062rem; margin-top: 10px; font-family: 'Inter', sans-serif; }

        .app-header { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 14px 12px 12px; padding-top: max(14px, env(safe-area-inset-top)); }
        .header-loc { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
        .header-loc-text { display: flex; flex-direction: column; min-width: 0; }
        .header-loc-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.01em; }
        .header-loc-value { font-size: 0.875rem; font-weight: 700; font-family: 'Manrope', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
        .header-mid { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.12); border: 1px solid; border-radius: 20px; padding: 8px 13px; font-size: 0.8125rem; font-weight: 700; font-family: 'Manrope', sans-serif; cursor: pointer; }
        .icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; }

        .module-screen { flex: 1; overflow-y: auto; padding: 14px 16px 20px; }
        .section-heading { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 1.0625rem; margin-bottom: 12px; }

        .chip-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; align-items: center; }
        .chip { flex-shrink: 0; border: 1.5px solid; border-radius: 20px; padding: 8px 14px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: 'Manrope', sans-serif; }

        .map-canvas { position: relative; width: 100%; height: 220px; border-radius: 18px; border: 1px solid; overflow: hidden; margin-bottom: 16px; }
        .map-grid-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .user-dot-wrap { position: absolute; transform: translate(-50%, -50%); }
        .user-dot { width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
        .user-dot-ring { position: absolute; top: -13px; left: -13px; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; opacity: 0.35; animation: ring 2s infinite; }
        @keyframes ring { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(1.4); opacity: 0; } }
        .map-marker { position: absolute; transform: translate(-50%, -100%); width: 26px; height: 26px; border-radius: 50% 50% 50% 0; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.25); transform-origin: center; }
        .map-marker svg { transform: rotate(45deg); }
        .map-zoom-controls { position: absolute; right: 10px; bottom: 10px; display: flex; flex-direction: column; gap: 6px; }
        .map-zoom-btn { width: 30px; height: 30px; border-radius: 8px; border: none; font-size: 1.0625rem; font-weight: 700; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

        .list-col { display: flex; flex-direction: column; gap: 10px; }
        .facility-row, .shelter-card, .report-row, .recipient-row, .contact-row { display: flex; align-items: center; gap: 12px; border-radius: 14px; padding: 12px; border: none; border-left: 4px solid; cursor: pointer; text-align: left; width: 100%; }
        .recipient-row { border-left: none; border: 1.5px solid; justify-content: space-between; }
        .contact-row { border-left: none; border: 1px solid; justify-content: space-between; }
        .facility-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .facility-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .facility-name { font-size: 0.9375rem; font-weight: 700; font-family: 'Manrope', sans-serif; }
        .facility-sub { font-size: 0.7812rem; }
        .checkbox { width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .shelter-card { flex-direction: column; align-items: flex-start; gap: 4px; }
        .shelter-card-top { display: flex; justify-content: space-between; width: 100%; align-items: center; }
        .status-pill { font-size: 0.7188rem; font-weight: 700; padding: 4px 10px; border-radius: 10px; font-family: 'Manrope', sans-serif; }
        .view-toggle { display: flex; border: 1.5px solid; border-radius: 12px; overflow: hidden; }
        .view-toggle button { border: none; padding: 7px 13px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; }
        .view-toggle.wide button { flex: 1; padding: 10px; }

        .facility-detail { display: flex; flex-direction: column; gap: 10px; }
        .detail-row { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
        .detail-actions { display: flex; gap: 10px; margin-top: 8px; }

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

        .confirm-hero { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 26px; border-radius: 18px; margin-bottom: 16px; text-align: center; }
        .report-id { font-size: 1.25rem; font-weight: 800; font-family: 'Manrope', sans-serif; letter-spacing: 0.02em; }
        .status-track { display: flex; flex-direction: column; margin-bottom: 16px; }
        .status-track-row { display: flex; align-items: flex-start; gap: 12px; padding: 2px 0; font-size: 0.8125rem; }
        .status-track-dotwrap { display: flex; flex-direction: column; align-items: center; }
        .status-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; }
        .status-line { width: 2px; flex: 1; min-height: 18px; }
        .summary-card { border: 1px solid; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .summary-line { display: flex; justify-content: space-between; font-size: 0.8438rem; gap: 10px; }

        .sos-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 22px; }
        .sos-cat-card { display: flex; flex-direction: column; align-items: center; gap: 6px; border: 1.5px solid; border-radius: 14px; padding: 10px 2px; cursor: pointer; }
        .sos-cat-card span { font-size: 0.6875rem; font-weight: 700; text-align: center; line-height: 1.25; }
        .sos-button-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 10px; }
        .sos-big-btn { width: 190px; height: 190px; border-radius: 50%; border: none; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 1rem; letter-spacing: 0.04em; cursor: pointer; box-shadow: 0 0 0 10px rgba(214,40,40,0.12), 0 10px 30px rgba(214,40,40,0.35); }
        .sos-big-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
        .sos-big-btn.pressing { transform: scale(0.95); }
        .sos-sent { display: flex; flex-direction: column; align-items: center; gap: 14px; padding-top: 30px; }
        .radar-wrap { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .radar-ring { position: absolute; border-radius: 50%; border-width: 2px; border-style: solid; animation: radar 1.8s infinite; }
        .radar-ring.r1 { width: 100%; height: 100%; }
        .radar-ring.r2 { width: 100%; height: 100%; animation-delay: 0.9s; }
        @keyframes radar { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(1); opacity: 0; } }
        .radar-core { position: relative; width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 2; }

        .authority-card { border: 1px solid; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .authority-card-top { display: flex; align-items: center; gap: 10px; }
        .authority-meta { display: flex; justify-content: space-between; font-size: 0.75rem; margin: 4px 0 8px; }
        .authority-status-row { display: flex; justify-content: space-between; align-items: center; }

        .menu-list { display: flex; flex-direction: column; gap: 6px; }
        .menu-row { display: flex; align-items: center; gap: 12px; padding: 13px 4px; border: none; border-bottom: 1px solid; background: none; cursor: pointer; font-size: 0.875rem; font-family: 'Inter', sans-serif; }
        .toggle { width: 38px; height: 22px; border-radius: 12px; position: relative; transition: background 0.2s; }
        .toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .toggle.on .toggle-knob { left: 18px; }

        .add-contact-form { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .add-contact-form input { border: 1.5px solid; border-radius: 12px; padding: 12px; font-size: 0.875rem; font-family: 'Inter', sans-serif; }
        .contact-actions { display: flex; gap: 4px; }

        .bottom-nav { flex-shrink: 0; display: flex; align-items: center; border-top: 1px solid; padding: 8px 4px calc(8px + var(--phone-h) * 0.022); position: relative; }
        .nav-item, .nav-sos-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; padding: 6px 0; }
        .nav-label { font-size: 0.7188rem; font-weight: 700; font-family: 'Manrope', sans-serif; letter-spacing: 0.01em; white-space: nowrap; }
        .nav-sos-btn { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: -28px; box-shadow: 0 6px 16px rgba(214,40,40,0.45), 0 0 0 5px ${c.surface}; }
        .nav-sos-active { box-shadow: 0 6px 16px rgba(214,40,40,0.6), 0 0 0 5px ${c.surface}, 0 0 0 9px rgba(214,40,40,0.25); }

        .sheet-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: flex-end; border-radius: 34px; }
        .sheet { width: 100%; background: ${c.surface}; border-radius: 24px 24px 0 0; padding: 10px 18px 26px; max-height: 75vh; overflow-y: auto; }
        .sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: ${c.border}; margin: 4px auto 10px; }
        .sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .sheet-title { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 1.0625rem; color: ${c.ink}; }

        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <div className="phone-frame">
        <div className="phone-screen">
          <div className="notch" />
          <div className="home-indicator" />
          <StatusBar c={theme === "light" ? { headerText: c.ink } : { headerText: c.ink }} />

          {stage === "loading" && (
            <div className="screen" style={{ background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Loader2 size={36} className="spin" style={{ color: c.primary }} />
              <span style={{ fontSize: "0.875rem", color: c.inkSoft, fontWeight: 500 }}>Checking secure session...</span>
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
                c={c} t={t} location={location}
                onOpenContacts={() => setContactsOpen(true)}
                onOpenMenu={() => setMenuOpen(true)}
              />
              {activeTab === "maps" && <MapsScreen c={c} />}
              {activeTab === "report" && <ReportScreen c={c} location={location} />}
              {activeTab === "sos" && <SosScreen c={c} location={location} contacts={contacts} />}
              {activeTab === "shelter" && <ShelterScreen c={c} />}
              {activeTab === "authority" && <AuthorityScreen c={c} reports={reports} setReports={setReports} />}
              <BottomNav c={c} t={t} active={activeTab} setActive={setActiveTab} />

              <ContactsSheet c={c} open={contactsOpen} onClose={() => setContactsOpen(false)} contacts={contacts} setContacts={setContacts} />
              <MenuSheet
                c={c} open={menuOpen} onClose={() => setMenuOpen(false)}
                theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}
                sirenOn={sirenOn} toggleSiren={toggleSiren} t={t}
                onLogout={handleLogout}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
