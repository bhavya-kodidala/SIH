# 🚨 RakshaNet

### Smart, Resilient Emergency Response for Communities

**Not every disaster can be predicted. Every emergency needs a response.**

RakshaNet is a **citizen-to-response emergency coordination platform** designed to support people before, during, and after disasters and sudden emergencies.

The platform brings together emergency reporting, SOS communication, location awareness, nearby emergency facilities, weather and hazard information, evidence collection, emergency communication, and offline support in one mobile-first application.

RakshaNet is designed around an important reality of disaster management:

**A disaster is not limited to cyclones, floods, or other weather-related events. Emergencies can also occur suddenly through fires, accidents, structural failures, geological events, industrial incidents, gas leaks, transportation accidents, and other localized or unexpected causes.**

RakshaNet therefore focuses not only on receiving advance warnings, but also on **what happens when an emergency actually occurs**.

---

# 🌍 Understanding Disasters

Disasters are often associated with events such as:

- 🌪️ Cyclones
- 🌧️ Floods
- 🌊 Flash floods
- ⛰️ Landslides
- 🌎 Earthquakes
- 🌩️ Severe weather
- 🌪️ Storms

These are important disaster scenarios, and many of them can be monitored using weather, geological, environmental, satellite, sensor, or other warning systems.

However:

**Disaster management is much broader than weather forecasting.**

An emergency can also result from:

- 🔥 Building or forest fires
- 🛢️ LPG or gas leaks and accidents
- 🧪 Chemical or industrial accidents
- 🏗️ Building collapse
- 🌉 Bridge or infrastructure failure
- 🚗 Major road accidents
- 🚆 Transport accidents
- 🪨 Sudden rockfall
- ⚡ Electrical-related emergencies
- 🌋 Geological events
- 🏭 Industrial incidents
- 👤 Missing-person emergencies
- ⚠️ Other sudden or localized emergencies

These events do not all have the same warning mechanisms.
Some may occur through circumstances that cannot be reliably identified through conventional weather forecasting.

Therefore:

**The absence of a prior warning does not mean that an emergency-response system is unnecessary.**

---

# ⚠️ The Prediction Gap

Weather and disaster-monitoring systems are extremely important for hazards that can be monitored and forecast.

For example, weather and environmental information can help identify conditions associated with:

- Heavy rainfall
- Cyclones
- Strong winds
- Severe weather
- Flood-related conditions
- Other environmental hazards

When sufficient information and lead time are available, authorities can issue warnings and preparedness instructions.

However, consider a different situation.

### Example 1 — LPG Accident

A gas leak or LPG-related accident can occur inside a building.

A weather forecast cannot necessarily predict that individual incident.

### Example 2 — Road Accident

A road accident can occur suddenly because of many local circumstances.

It is not necessarily a weather-prediction problem.

### Example 3 — Building Collapse

A structural failure may occur without a conventional weather warning.

### Example 4 — Rockfall

A rockfall may happen suddenly and affect a road, vehicle, building, or nearby people.

### Example 5 — Fire

A local building or electrical fire can develop independently of a cyclone or flood warning.

These examples demonstrate an important distinction:

> **Not every emergency originates from a predictable weather event.**

Therefore, an emergency-response platform should not be designed only around events that can be forecast in advance.

---

# 🧠 Prediction and Response Are Different Problems

Disaster management involves more than predicting an event.

There are two different questions:

### 1. Can the event be predicted?

Depending on the event, the answer may be:

- Yes
- Partially
- With limited lead time
- Or not reliably in advance

### 2. If the event occurs, can people communicate and receive assistance?

This is where RakshaNet focuses.

RakshaNet does **not** claim that it can predict every disaster.

Instead, it is designed to provide a common emergency-response workflow that can operate when an incident is reported, including situations where there was no prior warning.

**We may not always know exactly when an emergency will occur, but we can prepare the response system for when it does occur.**

---

# 📌 Why RakshaNet?

During floods, fires, road accidents, medical emergencies, building collapses, landslides, earthquakes, and other emergencies, people may need to switch between maps, phone calls, messaging applications, weather services, and emergency contacts.

This can consume valuable time and make it difficult to communicate accurate location and incident information.

RakshaNet provides a single emergency workspace that helps citizens:

- Identify their real-time location and nearby emergency facilities.
- Send structured SOS and incident reports with location context.
- Find hospitals, police stations, fire stations, and emergency shelters.
- Continue preparing reports when the network is unavailable and synchronize them later.
- Access weather, hazard, and survival information in one place.
- Authenticate securely using device passkeys instead of SMS OTPs.

---

# 🎯 Problem Statement

Disasters are not limited to predictable weather events such as floods and cyclones.

A person can suddenly face:

- 🌊 Floods
- 🌪️ Cyclones
- 🔥 Fire accidents
- ⛽ LPG or gas-related incidents
- 🌎 Earthquakes
- 🪨 Landslides
- 🪨 Rockfalls
- 🏠 Building collapses
- 🚗 Road accidents
- 🏭 Industrial accidents
- 👤 Missing-person emergencies
- ⚠️ Other sudden or cascading emergencies

Some hazards can provide warning signals through weather monitoring, sensors, satellite observations, geological monitoring, or official alerts.

However, some emergencies may develop rapidly and may not provide enough warning time for conventional forecasting.

Therefore, disaster management is not only about predicting an event.

It is also about:

**Reporting → Locating → Communicating → Assisting → Responding**

---

# 💡 Proposed Solution

RakshaNet acts as a **citizen-to-response emergency coordination platform**.

It connects:

```text
Incident
   ↓
Location
   ↓
Evidence
   ↓
Assistance
   ↓
Communication
   ↓
Response
   ↓
Status
```

RakshaNet does not replace existing government disaster-management applications. Instead, it can support them by connecting citizen-reported incidents, location, evidence, and emergency communication with the existing response ecosystem. rather than replace them.
RakshaNet does not just show “location.” It converts the user's location into geographic coordinates (latitude and longitude), and those coordinates are used to determine the user's position on the map and find relevant nearby emergency facilities.

### Core Idea

**One emergency. One connected response workflow.**

---

# 🚨 Core Features

## 🆘 Emergency Response

- One-tap SOS workflow for urgent situations.
- Structured incident reporting.
- Support for medical emergencies, fires, road accidents, floods, earthquakes, building collapses, missing persons, and other incidents.
- Severity classification from low to critical.
- Report status timeline.
- Emergency contacts.
- Quick communication through phone, SMS, and WhatsApp flows.
- Emergency siren.
- Browser notification support.

---

## 📍 Live Location & Maps

RakshaNet uses the device's actual location whenever location permission is available.

Features include:

- Browser Geolocation API.
- Leaflet maps.
- OpenStreetMap map tiles.
- OpenStreetMap Nominatim reverse geocoding.
- Manual location support.
- Nearby emergency facilities.
- Haversine-based distance calculation.
- Location refresh from Maps and Shelter screens.
- No fabricated or hardcoded emergency location is used as a fallback.

Nearby facilities can include:

- 🏥 Hospitals
- 👮 Police stations
- 🚒 Fire stations
- 🏕️ Emergency shelters

---

# 📷 Emergency Evidence

Emergency reports can support additional information through:

- 📸 Photos
- 🎥 Videos
- 🎙️ Voice recordings

Evidence can provide additional context about the reported incident.

---

# 🌦️ Weather & Hazard Information

RakshaNet uses weather information from **Open-Meteo**.

Weather information can include:

- Temperature
- Relative humidity
- Apparent temperature
- Precipitation
- Rain
- Weather condition
- Wind speed
- Wind gusts
- Precipitation probability

The prototype uses **rule-based weather interpretation** based on weather values and WMO weather codes.

### Important

RakshaNet does **not** currently claim to be an AI system that predicts every disaster.

The current prototype focuses on:

**Emergency reporting, location awareness, assistance, communication, and response coordination.**

Future predictive capabilities can be developed using validated historical disaster datasets.

---

# 📡 Offline-First Resilience

Emergencies may occur when internet connectivity is weak or unavailable.

RakshaNet therefore includes offline capabilities such as:

- Service Worker.
- IndexedDB storage.
- Emergency drafts.
- Queued reports.
- Cached emergency contacts.
- Cached facilities.
- Last-known application state.
- Offline map tile caching.
- Automatic synchronization when connectivity returns.
- Online/offline status indicators.

### Offline Workflow

```text
Emergency occurs
       ↓
Network unavailable
       ↓
Report stored locally
       ↓
Report placed in queue
       ↓
Connectivity restored
       ↓
Data synchronized
       ↓
Response workflow continues
```

---

# 🔐 Security & Authentication

RakshaNet uses **WebAuthn / Passkeys** instead of SMS OTP authentication.

### Authentication Flow

```text
User enters phone number
          ↓
Browser creates / accesses passkey
          ↓
Native WebAuthn verification
          ↓
Supabase Edge Function
          ↓
WebAuthn verification
          ↓
Authenticated session
```

The authentication model works as follows:

1. The user enters a valid phone number.
2. The browser creates or uses a device passkey.
3. Supabase Edge Functions verify the WebAuthn response.
4. The public key, credential ID, and counter are stored server-side.
5. The private key remains on the user's device.

The frontend only contains the public Supabase anon key.

The Supabase `service_role` key is used only inside Edge Functions and is never exposed to the client.

RLS is enabled on the authentication tables.

---

# 🌐 Accessibility & User Experience

RakshaNet includes:

- 🇮🇳 English
- తెలుగు Telugu
- हिन्दी Hindi
- Light theme
- Dark theme
- Responsive mobile-first layout
- Clear emergency severity indicators
- Survival guides
- Simple emergency workflows
- Browser notifications
- Emergency siren

The interface is designed for quick interaction during stressful situations.

---

# 🏗️ System Architecture

```text
                         INFORMATION SOURCES
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
      Government Alerts     Weather Data       Geospatial Data
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    RakshaNet    │
                         │ Emergency Layer │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
           Location            Incident           Evidence
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                                  ▼
                         Emergency Assistance
                                  │
                                  ▼
                       Authority / Control Room
                                  │
                                  ▼
                           Response Team
                                  │
                                  ▼
                           Status Update
                                  │
                                  ▼
                               Citizen
```

---

# 🔄 Emergency Response Workflow

```text
Citizen experiences emergency
            ↓
       SOS / Report
            ↓
    Location captured
            ↓
   Incident categorized
            ↓
 Photo / Video / Voice evidence
            ↓
 Nearby assistance identified
            ↓
 Emergency information shared
            ↓
 Authority / Response integration
            ↓
     Response initiated
            ↓
      Status updated
```

---

# 🌍 Multi-Disaster Support

RakshaNet is designed to support different categories of emergencies.

| Emergency | Example Response |
|---|---|
| 🌊 Flood | Location, SOS, shelter and nearby assistance |
| 🌪️ Cyclone | Hazard information, SOS and emergency assistance |
| 🔥 Fire | SOS, fire station location and incident reporting |
| 🌎 Earthquake | SOS, location and emergency facilities |
| 🪨 Landslide | Location, incident report and assistance |
| 🪨 Rockfall | Location, incident reporting and emergency assistance |
| 🏠 Building Collapse | SOS, evidence and emergency services |
| 🚗 Road Accident | Location, medical assistance and reporting |
| ⛽ LPG / Gas Incident | Emergency communication and reporting |
| 🏭 Industrial Accident | Incident reporting and emergency assistance |
| 👤 Missing Person | Structured reporting and location information |
| ⚠️ Other Emergency | General emergency reporting workflow |

---

# 📍 Location & Geospatial Services

RakshaNet uses geographic services to support emergency location awareness.

### Technologies

- Browser Geolocation API
- Leaflet
- React Leaflet
- OpenStreetMap
- Nominatim
- Overpass API
- Haversine distance calculation

### Location Workflow

```text
Device GPS / Manual Location
          ↓
      Coordinates
          ↓
    Reverse Geocoding
          ↓
   Nearby Facilities
          ↓
   Distance Calculation
          ↓
 Location-Based Assistance
```

---

# 🧭 Nearby Emergency Facilities

RakshaNet can search for nearby emergency facilities using OpenStreetMap/Overpass geographic data.

Supported categories include:

- Hospitals
- Police stations
- Fire stations
- Emergency shelters

Facilities can be sorted according to distance from the user's location using Haversine distance calculation.

---

# 📊 Data & Information Sources

RakshaNet uses multiple categories of information.

| Source | Purpose |
|---|---|
| **NDMA / SACHET** | Government disaster alerts and official disaster information |
| **Open Government Data Platform India** | Government and open datasets |
| **OpenStreetMap** | Geographic and map data |
| **Nominatim** | Location search and reverse geocoding |
| **Overpass API** | Nearby hospitals, police, fire stations and shelters |
| **Open-Meteo** | Weather and environmental data |
| **WMO Weather Codes** | Weather-condition interpretation |
| **Device GPS** | Citizen location |
| **Citizen Reports** | User-generated incident information |

### Data Transparency

RakshaNet does not claim fabricated datasets or fabricated statistics.

The current prototype uses:

- Live API data
- Geographic data
- Device-generated location
- User-generated incident reports
- Rule-based weather interpretation
- Public/reference information

---

# 🏛️ Relationship With Government Disaster Systems

RakshaNet is **not intended to replace government disaster-management systems**.

Government platforms such as **NDMA/SACHET** provide important official disaster alerts and information.

RakshaNet focuses on the citizen emergency-response layer.

```text
Official Warning
      ↓
Citizen Affected
      ↓
SOS / Incident Report
      ↓
Location + Evidence
      ↓
Assistance
      ↓
Response Coordination
      ↓
Status Updates
```

The long-term objective is to support authorized integration with disaster-management authorities and emergency-response infrastructure.

---

# 🔎 Research & Existing Solutions

RakshaNet was developed by studying existing disaster-management systems, emergency workflows, geographic services, weather services, and related projects.

## SafeHaven

Crowdsourced disaster-management and emergency coordination platform.

GitHub:

https://github.com/archangel2006/SafeHaven

## Sahaya

Disaster-management assistant supporting alerts, assistance, and SOS workflows.

GitHub:

https://github.com/sr2echa/sahaya

## SACHET

Official Indian disaster-alert platform providing disaster-related alerts and information.

Website:

https://sachet.ndma.gov.in/

## Global Disaster Monitoring

A disaster-monitoring project demonstrating disaster information and monitoring workflows.

YouTube:

https://www.youtube.com/watch?v=4y0w9iAls5I

## Background Research

Disaster types and effects were also studied through educational disaster-management resources.

YouTube:

https://www.youtube.com/watch?v=9WIwlljva_s

---

# 🧠 Disaster Prediction vs Disaster Response

Not every disaster can be predicted in the same way.

Some hazards may provide warning signals through:

- Weather monitoring
- River monitoring
- Geological monitoring
- Sensors
- Satellite observations
- Government alerts

However, some emergencies can develop rapidly or without enough warning for conventional forecasting to provide sufficient response time.

Therefore, RakshaNet focuses on both information and response.

### Before / During an Emergency

- Receive relevant information
- Provide location awareness
- Support SOS
- Report incidents
- Share evidence
- Find nearby assistance

### During / After an Emergency

- Communicate incident information
- Support emergency coordination
- Maintain offline reports
- Provide response-status workflow
- Connect citizens with assistance

> **Not every disaster can be predicted. Every emergency needs a response.**

---

# 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, JavaScript, JSX |
| UI & Icons | CSS, Lucide React |
| Maps | Leaflet, React Leaflet, OpenStreetMap |
| Location | Browser Geolocation API, Nominatim, Overpass API |
| Authentication | WebAuthn / Passkeys, SimpleWebAuthn |
| Backend | Supabase Edge Functions on Deno |
| Database | Supabase PostgreSQL |
| Offline Storage | IndexedDB, Service Worker, PWA APIs |
| Communication | `tel:`, `sms:`, WhatsApp deep links, browser notifications |
| Build & Deployment | Vite production build, static hosting compatible |

---

# 🗂️ Project Structure

```text
rakshanet-app/
│
├── index.html
├── package.json
├── vite.config.js
│
├── public/
│   ├── manifest.json
│   └── sw.js
│
├── src/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   │
│   └── lib/
│       ├── auth.js
│       ├── emergencyAudio.js
│       ├── facilities.js
│       ├── geocoding.js
│       ├── geolocation.js
│       ├── mapIcons.js
│       ├── mapTiles.js
│       ├── messaging.js
│       ├── notifications.js
│       ├── offlineDb.js
│       ├── pwa.js
│       ├── supabaseClient.js
│       ├── survivalGuides.js
│       ├── syncManager.js
│       └── weather.js
│
├── supabase/
│   ├── config.toml
│   │
│   ├── migrations/
│   │   └── 0001_webauthn_auth.sql
│   │
│   └── functions/
│       ├── _shared/
│       ├── webauthn-check-user/
│       ├── webauthn-register-options/
│       ├── webauthn-register-verify/
│       ├── webauthn-auth-options/
│       ├── webauthn-auth-verify/
│       ├── webauthn-verify-session/
│       └── webauthn-logout/
│
└── test_webauthn_e2e.mjs
```

---

# ⚙️ Local Setup

## Prerequisites

- Node.js 18 or later
- Modern Chrome or Edge browser for passkey testing
- Supabase project for the complete authentication flow

---

## 1. Clone the Repository

```bash
git clone https://github.com/bhavya-kodidala/SIH.git
```

---

## 2. Open the Project

```bash
cd SIH
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

WebAuthn works on `localhost` as a secure context.

---

# 🔑 Environment Variables

Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

Set the public frontend values:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

### Security Note

Never put:

- Supabase service role key
- Database password
- Private WebAuthn key
- Other secret credentials

inside a `VITE_` environment variable.

---

# ☁️ Supabase Setup

From the project root:

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

The Supabase platform provides the required backend service credentials to Edge Functions.

These credentials should never be exposed in the frontend.

---

# 🧪 Build & Test

Build the application:

```bash
npm run build
```

### Manual Passkey Test

1. Start the development server.
2. Open `http://localhost:5173` in Chrome or Edge.
3. Enter a valid Indian mobile number.
4. Select **Create Passkey**.
5. Complete the browser's native device verification.
6. Refresh the application.
7. Enter the same number.
8. Select **Continue with Passkey**.
9. Allow location access.
10. Verify that the Maps screen uses the device location.
11. Disable the network.
12. Create an emergency report.
13. Restore the network.
14. Verify that the queued report synchronizes.

---

# 🛡️ Error Handling

The application handles situations such as:

- Invalid phone numbers
- Cancelled passkey prompts
- Unsupported browsers
- Duplicate credentials
- Location permission denial
- Location unavailable
- Network failures
- External service failures
- Offline mode

User-facing status messages are provided for these situations.

---

# 🧪 Current Prototype Scope

The current SIH prototype demonstrates:

- Mobile-first emergency interface
- One-tap SOS
- Incident reporting
- Multiple emergency categories
- Severity levels
- Device GPS location
- Manual location support
- Interactive maps
- Nearby emergency facilities
- Weather information
- Emergency communication
- Photo/video/voice reporting
- Offline storage
- Offline report queue
- Offline map support
- Browser notifications
- Emergency siren
- WebAuthn/passkey authentication
- Multilingual interface

---

# 📈 Feasibility

## Technical Feasibility

RakshaNet uses established technologies including:

- React
- Progressive Web App architecture
- Browser Geolocation
- Leaflet
- OpenStreetMap
- Supabase
- WebAuthn
- IndexedDB
- Service Workers

These technologies are available for modern smartphones and browsers.

## Operational Feasibility

The workflow is designed around simple emergency actions:

```text
SOS
 ↓
Location
 ↓
Incident
 ↓
Evidence
 ↓
Assistance
 ↓
Communication
```

## Data Feasibility

The prototype can work with:

- Live weather information
- Geographic data
- Device location
- Citizen-generated reports
- Official/reference information

## Economic Feasibility

The prototype uses open-source technologies and publicly available services wherever appropriate, reducing initial development infrastructure requirements.

---

# 📊 Viability

## Deployment

RakshaNet currently operates as a mobile-first PWA and can be adapted for production mobile deployment.

## Integration

Future versions can integrate with:

- Authorized disaster-management systems
- Emergency control rooms
- Fire services
- Police services
- Medical emergency services
- Regional response teams

## Scalability

The architecture can evolve from:

```text
Local
  ↓
District
  ↓
State
  ↓
Multi-Region
```

## Sustainability

As usage increases, public/demo services can be replaced or supplemented with dedicated production-grade infrastructure.

---

# ⚠️ Technical Challenges & Mitigation

| Challenge | Approach |
|---|---|
| Network failure | Offline storage and queued reports |
| GPS limitations | GPS + manual location option |
| Public API limitations | Caching and future production-grade infrastructure |
| False or unverified reports | Evidence-based reporting and future authority verification |
| Large-scale deployment | Modular architecture and production infrastructure |
| Authentication security | WebAuthn / Passkeys |
| Emergency communication | Structured reporting and emergency contact flows |

---

# 📊 Impact & Benefits

## 👤 Citizen Benefits

- One-tap SOS
- Easy emergency reporting
- Location-aware assistance
- Multilingual access
- Offline emergency support
- Evidence-based reporting

## 🚑 Emergency Response Benefits

- Structured incident information
- Location and evidence
- Nearby emergency facilities
- Better information flow
- Emergency communication support

## 🏛️ Authority Benefits

- Structured citizen reports
- Incident information
- Evidence-based workflows
- Regional response coordination
- Future control-room integration

## 🌍 Community Benefits

- Multi-disaster support
- Emergency preparedness
- Connectivity resilience
- Accessible assistance
- Connected emergency response

---

# 🤖 Future AI & Data Analytics

The current prototype does **not** claim to use a trained AI model for disaster prediction.

Future AI modules could be developed using validated datasets from appropriate:

- Government sources
- Historical disaster records
- Weather observations
- Geological monitoring
- Satellite/remote sensing
- River and environmental sensors
- Emergency incident records

Possible future applications include:

- Risk classification
- Incident prioritization
- Duplicate-report detection
- Anomaly detection
- Disaster trend analysis
- Resource-demand estimation
- Automated incident summarization

Any future AI system would require validated datasets, model evaluation, safety testing, and domain validation before operational deployment.

---

# 🚀 Future Scope

Future development may include:

- Authorized government integration
- Emergency control-room dashboard
- Verified authority workflows
- Regional emergency routing
- Push notifications
- Two-way incident status
- Production-grade geospatial infrastructure
- Advanced disaster-risk analysis
- Validated historical disaster datasets
- AI-assisted analysis
- Sensor integration
- Satellite and remote-sensing integration
- Accessibility improvements
- Large-scale field validation
- Cross-device security testing

---

# 👥 Team and Hackathon Context

**Project:** RakshaNet

**Event:** Smart India Hackathon 2026 — Internal Hackathon

**Focus Area:** Disaster Management, Emergency Response, and Resilient Digital Infrastructure

## Team RakshaNet

| Team Member | GitHub | Role & Responsibility |
|---|---|---|
| **Bhavya Keerthi Kodidala** | [@bhavya-kodidala](https://github.com/bhavya-kodidala) | **Application Developer** — Core application development, emergency-response workflow, backend integration and system implementation |
| **Saranya Mutham** | [@saranya101984](https://github.com/saranya101984) | **Frontend & UI Developer** — Mobile-first interface, responsive design, user workflows and PWA experience |
| **Sofiya** | [@Sofiya977](https://github.com/Sofiya977) | **Research & Disaster-Management Analyst** — Disaster research, existing-solution analysis, requirements and emergency information workflows |
| **Kandukuri Sree Lakshmi** | [@kandukurisreelakshmi80-tech](https://github.com/kandukurisreelakshmi80-tech) | **Geospatial & Location Developer** — GPS/location workflows, maps, nearby emergency facilities and geospatial integration |
| **Manvitha Gottipati** | [@manvithagottipati1908-svg](https://github.com/manvithagottipati1908-svg) | **Emergency Systems Developer** — SOS, incident reporting, offline workflows and emergency communication |
| **Akhila Addanki** | [@akhilaaddanki401-gif](https://github.com/akhilaaddanki401-gif) | **Testing & Documentation** — Feature testing, validation, documentation and presentation support |

---

# 🎯 Primary Outcome

RakshaNet aims to provide citizens with a:

- Fast
- Location-aware
- Secure
- Connectivity-resilient
- Multi-disaster

emergency response interface.

The platform connects:

**Incident Reporting + Location + Evidence + Assistance + Response Communication**

into one workflow.

---

# 🔗 Project Links

### GitHub Repository

https://github.com/bhavya-kodidala/SIH

### Live Demo

https://rakshanet-beta.vercel.app/

---

# 📚 Research & References

### Government & Open Data

- **NDMA / SACHET** — Government disaster alerts and official disaster information
  - https://sachet.ndma.gov.in/

- **Open Government Data Platform India** — Government and open datasets
  - https://data.gov.in/

- **OpenStreetMap** — Geographic and map data
  - https://www.openstreetmap.org/

### APIs & Data Services

- **Nominatim** — Location search and reverse geocoding
  - https://nominatim.org/

- **Overpass API** — Nearby hospitals, police stations, fire stations and shelters
  - https://overpass-api.de/

- **Open-Meteo** — Weather and environmental data
  - https://open-meteo.com/

- **WMO Weather Codes** — Weather-condition interpretation
  - https://open-meteo.com/en/docs

### Existing Solutions Studied

- **SafeHaven** — Crowdsourced disaster-management and emergency coordination
  - https://github.com/archangel2006/SafeHaven

- **Sahaya** — Disaster-management assistant with alerts, assistance and SOS workflows
  - https://github.com/sr2echa/sahaya

- **SACHET** — Official Indian disaster-alert platform
  - https://sachet.ndma.gov.in/

- **Global Disaster Monitoring** — Disaster information and monitoring workflow
  - https://www.youtube.com/watch?v=4y0w9iAls5I

### Background Research

- **Disaster Management | Disasters - Types and Effects**
  - https://www.youtube.com/watch?v=9WIwlljva_s

These resources were studied to understand existing approaches, disaster-management workflows, data sources, emergency communication, geographic services, and possible integration points.

RakshaNet does not claim ownership of third-party data, APIs, maps, or services.

---

# ⚠️ Important Prototype Disclaimer

RakshaNet is currently an **SIH 2026 internal hackathon prototype**.

The prototype demonstrates:

- Emergency-response workflows
- Location services
- Offline capabilities
- Authentication
- Maps
- Nearby facilities
- Weather information
- User reporting
- Emergency communication

It is **not a replacement for official government emergency systems, emergency services, or disaster-management authorities**.

Before real-world deployment, the system would require:

- Security testing
- Privacy review
- Field validation
- Authorized government integration
- Operational infrastructure
- Emergency-service coordination
- Reliability testing
- Legal and regulatory review

---

# 🤝 Future Contributions

Future development may include:

- Integration with authorized disaster-management and emergency-response systems
- Verified authority and control-room workflows
- Regional emergency routing
- Push notifications and two-way incident status
- Production-grade geospatial infrastructure
- Advanced disaster-risk analysis using validated datasets
- Accessibility and multilingual improvements
- Security and cross-device testing
- Large-scale deployment and field validation

  
# 🚨 RakshaNet

> **Not every disaster can be predicted. Every emergency needs a response.**

**Smart India Hackathon 2026 — Team RakshaNet**

### Citizen → Incident → Location → Evidence → Assistance → Response


## 📄 License

This project is currently an **SIH 2026 internal hackathon prototype**.

The source code is provided for academic, demonstration, and hackathon evaluation purposes.

The licensing and contribution policy for future public/production use will be determined according to the requirements of the participating institution, hackathon organizers, and project team.
