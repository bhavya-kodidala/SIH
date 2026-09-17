# RakshaNet — Disaster Management & Emergency Response App

A mobile-first prototype for a disaster management / emergency response application,
rendered inside a realistic 6.7" phone frame (1080×2340-based, 9:19.5 aspect ratio,
widened ~10% for a comfortable flagship-style body).

## Authentication: Passkeys (WebAuthn), not OTP

The old phone-number + SMS OTP login has been fully removed and replaced with real
browser/device Passkey authentication (WebAuthn). There is no fake fingerprint
animation, no fake Face ID screen, no hardcoded PIN, and no `isAuthenticated = true`
simulation — the phone number identifies the account, and a real WebAuthn credential
(fingerprint / face / device PIN / security key, whatever the device offers) is what
actually authenticates.

- **New user** → enters phone number → taps **Create Passkey** → browser's native
  passkey creation UI opens → device handles biometric/PIN verification → the public
  credential is sent to a Supabase Edge Function and verified/stored server-side →
  "Passkey created successfully" → continues to the existing `LocationScreen`.
- **Returning user** → enters phone number → taps **Continue with Passkey** → browser's
  native passkey prompt opens → device authenticates → the signed assertion is verified
  server-side against the stored public key → continues to `LocationScreen`.
- Everything after that — Maps, Report, SOS, Shelter, Authority, the header, the
  bottom nav — is untouched.

## Files changed / added

**Changed**
- `src/App.jsx`
  - Removed: `OtpScreen` component, all OTP digit-box state, OTP handlers, the
    `"otp"` app stage, `sendOtp`/`enterOtp`/`otpSub`/`verify`/`resend` strings
    (EN/TE/HI), `.otp-wrap`/`.otp-boxes`/`.simple-top` CSS, the now-unused
    `ArrowLeft` icon import.
  - Rewrote `LoginScreen`: phone number field + a single primary CTA that reads
    **Continue with Passkey** or **Create Passkey** depending on whether the number
    is already registered (checked live, debounced, as the user finishes typing).
    Shows inline status ("Checking your account…", "Creating your passkey…",
    "Verifying your passkey…", "Passkey created successfully") and friendly error
    text — never a raw browser/DOMException message.
  - Added a persistent "Passkeys are not supported on this device or browser."
    notice when `PublicKeyCredential`/`navigator.credentials` isn't available, with
    the button disabled — the app never navigates to a dead end.
  - Root `App`: dropped the `"otp"` stage; `LoginScreen` now calls
    `onAuthenticated(phone)` straight into the existing `LocationScreen`.
  - Visual identity, other screens, header, and bottom nav: unchanged.
- `package.json` — added `@supabase/supabase-js` and `@simplewebauthn/browser`.

**Added**
- `src/lib/supabaseClient.js` — Supabase browser client, **anon key only**.
- `src/lib/auth.js` — `checkUserExists`, `registerPasskey`, `loginWithPasskey`,
  `isWebAuthnSupported`. This is the only place the app calls
  `@simplewebauthn/browser`'s `startRegistration`/`startAuthentication`, which
  wrap the real `navigator.credentials.create()` / `navigator.credentials.get()`
  WebAuthn APIs. Maps DOMExceptions (`NotAllowedError`, `InvalidStateError`, etc.)
  to plain-English messages.
- `supabase/functions/webauthn-check-user/` — does an account exist for this phone?
- `supabase/functions/webauthn-register-options/` — generates a real WebAuthn
  registration challenge (`@simplewebauthn/server`), creates the account row if
  needed, stores the challenge.
- `supabase/functions/webauthn-register-verify/` — verifies the browser's
  attestation response against the stored challenge and stores **only the public
  key** (base64), credential ID, counter, transports. The private key never leaves
  the user's device — it's not sent here, and there's nowhere in this schema to put
  it even if it were.
- `supabase/functions/webauthn-auth-options/` — generates a real authentication
  challenge and the account's list of allowed credential IDs.
- `supabase/functions/webauthn-auth-verify/` — verifies the signed assertion against
  the stored public key, bumps the signature counter (replay/clone protection).
- `supabase/functions/_shared/{http,config,supabaseAdmin}.ts` — CORS, phone
  validation, JSON helpers, and the RP ID/origin config.
- `supabase/migrations/0001_webauthn_auth.sql` — `rakshanet_users`,
  `webauthn_credentials`, `webauthn_challenges`. RLS is **enabled with zero
  policies**, so PostgREST denies all direct browser access; every read/write goes
  through the Edge Functions using the `service_role` key, which never reaches the
  client.
- `.env.example` — public `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` only.

## Packages to install

```bash
npm install
```

This pulls in the two new dependencies (`@supabase/supabase-js`,
`@simplewebauthn/browser`) alongside the existing ones. Nothing needs installing for
the Edge Functions — they run on Supabase's Deno runtime and import
`@simplewebauthn/server` and `@supabase/supabase-js` directly via `npm:` specifiers
at deploy time.

## Supabase changes required (you need to do this — I can't from here)

This sandbox has no internet access and no connected Supabase project, so I
implemented and syntax-checked all of this code but could not actually run it
against a live project. To make it real:

1. **Create a Supabase project** (or use an existing one) at supabase.com.
2. **Run the migration**:
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```
   (or paste `supabase/migrations/0001_webauthn_auth.sql` into the SQL editor).
3. **Deploy the Edge Functions**:
   ```bash
   supabase functions deploy webauthn-check-user
   supabase functions deploy webauthn-register-options
   supabase functions deploy webauthn-register-verify
   supabase functions deploy webauthn-auth-options
   supabase functions deploy webauthn-auth-verify
   ```
4. **Set the RP ID / origin secrets** (skip for local dev — they default to
   `localhost` / `http://localhost:5173`):
   ```bash
   supabase secrets set WEBAUTHN_RP_ID=your-production-domain.com
   supabase secrets set WEBAUTHN_ORIGIN=https://your-production-domain.com
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
   every Edge Function — do not set those yourself, and never put them in a
   `VITE_`-prefixed variable.
5. **No `service_role` key, database password, or private key is ever exposed to
   the browser.** The only credential the frontend holds is the public anon key.

## Environment variables

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

## Exact commands to run

```bash
npm install
npm run build     # production build — verifies everything compiles
npm run dev        # local dev server, defaults to http://localhost:5173
```

## Testing Passkey authentication in Chrome/Edge

1. Run `npm run dev` and open `http://localhost:5173` **directly** (not through any
   iframe/preview wrapper — see limitation below).
2. `localhost` is treated as a secure context, so WebAuthn works there without HTTPS.
3. Enter any valid Indian mobile number (`6`–`9` followed by 9 digits).
4. Tap **Create Passkey**. Chrome/Edge will show their native "Save a passkey?"
   dialog. On a laptop without biometric hardware, Chrome falls back to your device
   PIN or offers to save it to a connected phone/security key/password manager
   (this is real, not simulated — the browser is doing it).
5. Refresh the page, enter the **same** number, tap **Continue with Passkey**
   — the button should already say "Continue with Passkey" once the debounced
   existence check resolves. The native "Sign in with a passkey?" prompt appears.
6. To test cancellation/error handling: dismiss the native prompt — the app should
   show "Passkey authentication was cancelled or timed out." and stay usable.

## Real device location (replaces the old mock map)

The old hardcoded "Kavali, Andhra Pradesh" location and the fake SVG-grid map with
manually-positioned facility markers have been completely removed. Location, the
map, nearby facilities, and reverse-geocoded addresses are now all real:

- **Device location**: `navigator.geolocation.getCurrentPosition()` with
  `enableHighAccuracy: true`, `timeout: 15000`, `maximumAge: 0`
  (`src/lib/geolocation.js`). No fallback/demo coordinates exist anywhere in the
  code — on denial/timeout/unavailability the UI shows "Location unavailable" and a
  **Try Again** action, never a substituted location.
- **Map**: [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/)
  raster tiles via `react-leaflet`, centered on the real coordinates, with a
  "you are here" marker and real facility markers.
- **Reverse geocoding**: [OpenStreetMap Nominatim](https://nominatim.org/) turns the
  real lat/lng into a locality/state label (`src/lib/geocoding.js`). On failure it
  returns `null` and the UI shows "Address unavailable" — it never fabricates a
  place name, and the real coordinates are kept regardless.
- **Nearby facilities**: [OpenStreetMap Overpass API](https://overpass-api.de/) query
  for real `amenity=hospital / police / fire_station` and `emergency=shelter` nodes
  within ~6 km of the real coordinate (`src/lib/facilities.js`), sorted by real
  Haversine distance. No seeded/fake facility list exists anymore.
- A **"Use My Current Location"** control appears in three places — the header
  (tap the location text), and a refresh icon on both Maps and Shelter — all calling
  the same real re-fetch pipeline (location → reverse geocode → facilities).
- Typing a location manually is still available as an explicit fallback (unchanged
  from before), but it's clearly labeled as not enabling the live map/facilities,
  since there's no forward-geocoding step converting free text into coordinates in
  this pass.

### Files created
- `src/lib/geolocation.js` — Geolocation API wrapper, real error codes only.
- `src/lib/geocoding.js` — Nominatim reverse geocoding.
- `src/lib/facilities.js` — Overpass nearby-facility query + Haversine distance.
- `src/lib/mapIcons.js` — Leaflet default-icon path fix (Vite bundling quirk) + small
  colored marker icons matching the app's palette.

### Files modified
- `src/App.jsx` — removed the mock `FACILITIES`/`SHELTERS` arrays and the SVG-grid
  fake map; rewrote `LocationScreen`, `AppHeader`, `MapsScreen`, `ShelterScreen` to
  use real data; updated `ReportScreen`/`SosScreen` to display the real location
  label; root `App` now holds `location` as a real `{lat, lng, accuracy, timestamp,
  label, source}` object (or `null`) instead of a hardcoded string, added the
  `refreshLocation()` pipeline and a live facilities-fetch effect. Also de-branded
  the static demo report history in `SEED_REPORTS` (removed "Kavali"/"Andhra
  Pradesh" strings — those are unrelated to the live location feature, just old
  placeholder text).
- `package.json` — added `leaflet` and `react-leaflet`.
- `src/main.jsx` — added the required `leaflet/dist/leaflet.css` import.

**Not modified, as instructed**: `src/lib/auth.js`, `src/lib/supabaseClient.js`,
anything under `supabase/` (Edge Functions, migration, config) — verified untouched.

### Dependencies to install
```bash
npm install
```
Adds `leaflet` and `react-leaflet` on top of the existing dependencies.

### APIs / services used
1. **Location API**: browser Geolocation API (`navigator.geolocation.getCurrentPosition`).
2. **Map technology**: Leaflet + OpenStreetMap tile server (`{s}.tile.openstreetmap.org`).
3. **Reverse-geocoding service**: OpenStreetMap Nominatim (`nominatim.openstreetmap.org`).
4. **Nearby-facility data source**: OpenStreetMap Overpass API (`overpass-api.de`).

None of these need an API key, which is why nothing new was added to `.env.example`.
That's also their limitation: Nominatim and Overpass are free community
infrastructure with fair-use rate limits — fine for a student/SIH prototype, but a
real production deployment should self-host these or move to a paid provider
(Google/Mapbox/HERE) to avoid being rate-limited under real traffic.

### Privacy / where location is (and isn't) stored
Nothing in this pass sends location to Supabase or anywhere else persistent —
`location`, `facilities`, and the Report/SOS location labels all live only in
React state in the browser, exactly like the rest of the app's existing
(pre-passkey) architecture. The only network calls carrying your coordinates are the
direct browser→Nominatim and browser→Overpass requests described above (both
over HTTPS, both free public OSM endpoints, neither requires a key). If you later
want Reports or SOS alerts to actually persist to Supabase with a location attached,
that's a new feature to build on top of this — say the word and I'll wire it up
explicitly rather than assume it.

### How to test real location locally
1. `npm install && npm run dev`, open `http://localhost:5173` (a real Chrome/Edge
   tab, not the in-chat preview — see the passkey section above for why).
2. Log in with a passkey, reach the location screen, tap **Allow while using app**.
   Chrome will show its native location-permission prompt — accept it.
3. Confirm: the app shows your real coordinates' locality (or "Address unavailable"
   if reverse geocoding fails, never a guess), the Maps tab shows a real OpenStreetMap
   tile map centered on you with a "you are here" marker, and the facility list below
   it is populated from a live Overpass query (may be empty if there's genuinely
   nothing tagged nearby on OpenStreetMap — that's real data, not a bug).
4. Test denial: in Chrome, click the padlock/site-info icon → Site settings →
   Location → Block, reload, tap **Allow while using app** again — you should see
   "Location unavailable" with a **Try Again** button, never a fake location.
5. Test refresh: tap the location text in the header, or the small locate icon on
   the Maps/Shelter tabs — it should re-request your position and update the map,
   marker, address, and facility list.
6. Confirm no "Kavali" (or any other hardcoded place) appears anywhere — it doesn't;
   verified by grep across the whole file as part of this change.



1. Run `npm run dev` and open `http://localhost:5173` **directly** (not through any
   iframe/preview wrapper — see limitation below).
2. `localhost` is treated as a secure context, so WebAuthn works there without HTTPS.
3. Enter any valid Indian mobile number (`6`–`9` followed by 9 digits).
4. Tap **Create Passkey**. Chrome/Edge will show their native "Save a passkey?"
   dialog. On a laptop without biometric hardware, Chrome falls back to your device
   PIN or offers to save it to a connected phone/security key/password manager
   (this is real, not simulated — the browser is doing it).
5. Refresh the page, enter the **same** number, tap **Continue with Passkey**
   — the button should already say "Continue with Passkey" once the debounced
   existence check resolves. The native "Sign in with a passkey?" prompt appears.
6. To test cancellation/error handling: dismiss the native prompt — the app should
   show "Passkey authentication was cancelled or timed out." and stay usable.

## Limitations when testing inside the desktop-browser phone preview

The phone-frame preview you've been seeing in this chat is a component rendered
inside a sandboxed iframe on Anthropic's side. **Real WebAuthn prompts will not fire
in that context** — browsers require a stable top-level or properly-permissioned
origin for `navigator.credentials`, and that sandbox doesn't provide one. This is
also why the standalone previewable artifact was retired for this version: it now
depends on a live Supabase backend and npm packages that the in-chat preview runtime
doesn't resolve.

To actually see and test the real passkey prompts, run `npm run dev` and open
`localhost:5173` in a normal Chrome/Edge tab — that's a real, permissioned origin.

## Handled error cases

User cancels the prompt, no passkey registered for the number, browser doesn't
support WebAuthn, verification fails, network/Edge Function failure, invalid phone
number, registration failure, duplicate credential — all surfaced as plain-English
text under the button, never a raw DOMException or server error.

## What's still a prototype

Maps, Shelter, and location are now real (device GPS, OpenStreetMap tiles, Nominatim,
Overpass) — see above. Report and SOS still use local React state only: submitting a
report or sending an SOS updates the UI but doesn't call any backend, so nothing is
actually delivered to a hospital/police/fire department or persisted anywhere. A real
deployment still needs a backend for report/SOS routing and notifications, and — if
you want other tables protected by Supabase Row Level Security tied to the logged-in
user — wiring the post-passkey "authenticated" state into a full Supabase Auth
session (the Edge Functions here return a verified `{ id, phone }` and stop there;
minting a real GoTrue session from that is a follow-up, documented but not
implemented, since it wasn't asked for in the passkey pass).

## Project structure

```
rakshanet-app/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── README.md
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── lib/
│       ├── supabaseClient.js
│       ├── auth.js
│       ├── geolocation.js
│       ├── geocoding.js
│       ├── facilities.js
│       └── mapIcons.js
└── supabase/
    ├── migrations/
    │   └── 0001_webauthn_auth.sql
    └── functions/
        ├── _shared/
        │   ├── http.ts
        │   ├── config.ts
        │   └── supabaseAdmin.ts
        ├── webauthn-check-user/index.ts
        ├── webauthn-register-options/index.ts
        ├── webauthn-register-verify/index.ts
        ├── webauthn-auth-options/index.ts
        └── webauthn-auth-verify/index.ts
```
