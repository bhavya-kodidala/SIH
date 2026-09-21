# RakshaNet

### Smart, resilient emergency response for communities

RakshaNet is a mobile-first disaster management and emergency response Progressive Web App built for the **Smart India Hackathon (SIH) internal hackathon**. It brings emergency reporting, SOS communication, live location, nearby facilities, shelters, weather and hazard information, survival guidance, and offline continuity into one focused interface.

The goal is simple: reduce the time between an incident being noticed and the right information reaching the people who can act on it, even when connectivity is unreliable.

## Why RakshaNet?

During floods, fires, road accidents, medical emergencies, and other disasters, people often have to switch between maps, phone calls, messaging apps, weather services, and government contacts. This costs time and makes it difficult to communicate accurate location and incident details.

RakshaNet provides a single emergency workspace that helps a user:

- Identify their real-time location and nearby emergency facilities.
- Send structured SOS and incident reports with location context.
- Find hospitals, police stations, fire stations, and emergency shelters.
- Continue preparing reports when the network is unavailable and sync them later.
- Access weather, hazard, and survival information in one place.
- Authenticate securely with device passkeys instead of SMS OTPs.

## Core Features

### Emergency response

- One-tap SOS workflow for urgent situations.
- Structured incident reporting for medical emergencies, fires, road accidents, floods, earthquakes, building collapses, missing persons, and other incidents.
- Severity classification from low to critical.
- Report status timeline for authority-side progress.
- Emergency contacts and quick communication through phone, SMS, and WhatsApp flows.
- Emergency siren and browser notification support.

### Live location and maps

- Uses the browser Geolocation API for the device's actual position.
- Leaflet map with OpenStreetMap tiles.
- Live reverse geocoding through OpenStreetMap Nominatim.
- Nearby hospitals, police stations, fire stations, and shelters from OpenStreetMap Overpass data.
- Distance-based facility sorting using Haversine distance.
- Location refresh from the header, Maps screen, and Shelter screen.
- No hardcoded fallback location is used when device location is unavailable.

### Offline-first resilience

- Service worker registration for PWA behavior.
- IndexedDB storage for emergency drafts, queued reports, contacts, cached facilities, and last-known app state.
- Offline emergency queue with automatic synchronization when connectivity returns.
- Offline map tile caching support for selected areas.
- Online/offline status indicators and sync events.

### Safety and accessibility

- Passkey authentication using WebAuthn and device biometrics, PIN, or security keys.
- English, Telugu, and Hindi interface strings.
- Light and dark themes.
- Weather and hazard cards with clear severity signals.
- Survival guides for common disaster scenarios.
- Responsive mobile-first layout designed for rapid use under pressure.

## Security Model

RakshaNet uses passkeys rather than SMS OTP authentication:

1. A user enters a valid phone number.
2. The browser creates or uses a device passkey through the native WebAuthn prompt.
3. Supabase Edge Functions verify the registration or authentication response.
4. Only the WebAuthn public key, credential ID, and counter are stored server-side.
5. The private key remains on the user's device and is never sent to the application.

The browser contains only the public Supabase anon key. The Supabase `service_role` key is used only inside Edge Functions and is never exposed to the client. RLS is enabled on the authentication tables with no direct browser policies; reads and writes are handled by the protected functions.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, JavaScript, JSX |
| UI and icons | CSS, Lucide React |
| Maps | Leaflet, React Leaflet, OpenStreetMap |
| Location services | Browser Geolocation API, Nominatim, Overpass API |
| Authentication | WebAuthn / Passkeys, SimpleWebAuthn |
| Backend | Supabase Edge Functions on Deno |
| Database | Supabase PostgreSQL |
| Offline storage | IndexedDB, Service Worker, PWA APIs |
| Communication | `tel:`, `sms:`, WhatsApp deep links, browser notifications |
| Build and deployment | Vite production build, static hosting compatible |

## System Architecture

```text
User device
    |
    +-- React PWA (UI, SOS, Reports, Maps, Shelter, Authority)
    |       |
    |       +-- Geolocation -> Nominatim reverse geocoding
    |       +-- Coordinates -> Overpass nearby facilities
    |       +-- IndexedDB + Service Worker -> offline queue and cache
    |       +-- Browser WebAuthn API
    |
    +-- Supabase Edge Functions
            |
            +-- WebAuthn challenge and verification
            +-- Supabase PostgreSQL credential storage
```

## Project Structure

```text
rakshanet-app/
├── index.html                 # Application entry HTML
├── package.json               # Scripts and dependencies
├── vite.config.js             # Vite configuration
├── public/
│   ├── manifest.json          # PWA metadata
│   └── sw.js                  # Service worker
├── src/
│   ├── App.jsx                # Main application and emergency workflows
│   ├── index.css              # Global layout and visual styles
│   ├── main.jsx               # React and Leaflet bootstrap
│   └── lib/
│       ├── auth.js            # Passkey registration and login
│       ├── emergencyAudio.js  # Emergency siren controls
│       ├── facilities.js      # Overpass facility search and distance sorting
│       ├── geocoding.js       # Nominatim reverse geocoding and search
│       ├── geolocation.js     # Browser location wrapper
│       ├── mapIcons.js        # Leaflet marker icons
│       ├── mapTiles.js        # Offline map tile cache support
│       ├── messaging.js       # SOS/report message and contact actions
│       ├── notifications.js   # Browser notification helpers
│       ├── offlineDb.js       # IndexedDB persistence
│       ├── pwa.js             # Service worker and offline queue bridge
│       ├── supabaseClient.js  # Public Supabase client
│       ├── survivalGuides.js  # Emergency preparedness content
│       ├── syncManager.js     # Pending item synchronization
│       └── weather.js         # Live weather and hazard data
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 0001_webauthn_auth.sql
│   └── functions/
│       ├── _shared/           # CORS, config, and admin client helpers
│       ├── webauthn-check-user/
│       ├── webauthn-register-options/
│       ├── webauthn-register-verify/
│       ├── webauthn-auth-options/
│       ├── webauthn-auth-verify/
│       ├── webauthn-verify-session/
│       └── webauthn-logout/
└── test_webauthn_e2e.mjs      # WebAuthn end-to-end test utility
```

## Local Setup

### Prerequisites

- Node.js 18 or later.
- A modern Chrome or Edge browser for passkey testing.
- A Supabase project for the complete authentication flow.

### Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a normal browser tab. WebAuthn works on `localhost` as a secure context. It may not work inside an embedded preview or sandboxed iframe.

### Environment variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set the public frontend values:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Never put a Supabase service role key, database password, or private WebAuthn key in a `VITE_` variable.

## Supabase Setup

From the project root, link the Supabase project and apply the migration:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Deploy the WebAuthn functions:

```bash
supabase functions deploy webauthn-check-user
supabase functions deploy webauthn-register-options
supabase functions deploy webauthn-register-verify
supabase functions deploy webauthn-auth-options
supabase functions deploy webauthn-auth-verify
supabase functions deploy webauthn-verify-session
supabase functions deploy webauthn-logout
```

For production, configure the relying-party domain and origin:

```bash
supabase secrets set WEBAUTHN_RP_ID=your-domain.com
supabase secrets set WEBAUTHN_ORIGIN=https://your-domain.com
```

The Supabase platform provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not expose either value in the frontend.

## Build and Test

```bash
npm run build
```

Manual passkey smoke test:

1. Start the dev server and open `http://localhost:5173` in Chrome or Edge.
2. Enter a valid Indian mobile number.
3. Select **Create Passkey** and complete the browser's native device verification.
4. Refresh, enter the same number, and select **Continue with Passkey**.
5. Allow location access and verify that the Maps screen uses the device location.
6. Disable the network, create a report, then restore the network and verify queue synchronization.

The app handles invalid phone numbers, cancelled passkey prompts, unsupported browsers, duplicate credentials, location denial, unavailable services, and network failures with user-facing status messages.

## Prototype Scope and Future Work

RakshaNet is an SIH internal hackathon prototype. The following areas are intentionally prepared for future integration:

- Connect SOS and reports to an operational disaster-management backend and authority dashboards.
- Persist report ownership and status using authenticated Supabase sessions.
- Add verified emergency contact and authority routing by region.
- Add push notifications and two-way incident status updates.
- Replace public OSM community endpoints with production-grade or self-hosted geospatial services at scale.
- Add automated accessibility, security, and cross-device end-to-end test coverage.

At present, the frontend demonstrates the complete user experience and offline workflows. Public map, geocoding, and Overpass services are suitable for demonstration and evaluation, but have fair-use limits for production traffic.

## Team and Hackathon Context

**Project:** RakshaNet

**Event:** Smart India Hackathon, internal hackathon prototype

**Focus area:** Disaster management, emergency response, resilient digital public infrastructure

**Primary outcome:** Give citizens a fast, location-aware, secure, and connectivity-resilient emergency response interface.

## License

This repository is an internal hackathon prototype. Add the license and contribution policy required by your institution before public production use.
