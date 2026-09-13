# RakshaNet — Disaster Management & Emergency Response App

A mobile-first prototype for a disaster management / emergency response application,
rendered inside a realistic 6.7" phone frame (1080×2340, 9:19.5 aspect ratio, widened
~10% for a comfortable flagship-style body).

## What's inside

- **Login → OTP → auto location fetch (with manual fallback) → Home**
- **Header**: live location, Contacts (add/edit/delete/mark primary), three-dot menu
  (Theme light/dark, Language EN/Telugu/Hindi, Emergency Siren with real audio,
  About)
- **Bottom navigation**: Maps · Report · SOS · Shelter · Authority
- **Maps**: mock GPS map, category filters, facility detail sheet with directions/call
- **Report**: 4-step wizard — emergency type → description/severity/photo/video/voice
  note → auto-suggested recipients → confirm & submit with a Report ID and status
  timeline
- **SOS**: category grid + large press-to-send button, radar-pulse "alert sent" state
- **Shelter**: filterable list/map view, availability, capacity, directions/call
- **Authority**: Citizen view (my reports + status tracker) and Authority view
  (incoming reports with an "advance status" control)

This is a front-end prototype with mock data only — there's no real OTP/SMS, GPS,
maps SDK, or backend wired up yet.

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`) in your browser.
The app renders as a phone-frame preview centered on the page — resize your browser
window taller/shorter to see the frame scale, it stays locked to its aspect ratio.

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
rakshanet-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx      # React entry point
    └── App.jsx       # The entire application (single-file component)
```

## Next steps toward a real deployment

- Wire the OTP flow to a real SMS provider (e.g. Twilio Verify, Firebase Phone Auth)
- Replace the mock map canvas with a real maps SDK (Google Maps / Mapbox) and live
  facility data
- Connect the Report and SOS flows to a backend (Node/Express or FastAPI) with a
  database (MongoDB/Firebase) so reports and alerts actually route to authorities
- Add push notifications for SOS alerts and status updates
- Store emergency contacts and reports server-side instead of in local component state
