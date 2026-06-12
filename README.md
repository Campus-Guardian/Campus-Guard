# CampusGuard

CampusGuard is a campus safety platform with an Express/Supabase backend, an
admin web panel, and one Expo mobile client. Phones send location, speed,
derived decibel estimates, acceleration summaries, battery state, and network
state. Raw audio is never uploaded or retained.

## V1 behavior

- Students can send and view data only for devices they own.
- Dashboard, reports, simulator, campus-wide locations, device deletion, zone
  management, and analysis settings require the admin role.
- Dashboard sessions use a short-lived HttpOnly cookie. Mobile access and
  rotating refresh tokens are kept in SecureStore.
- Socket.IO rejects unauthenticated clients and publishes only to the
  `dashboard`, user, or verified device rooms.
- Zone entry requires two accurate locations within 15 seconds. Two outside
  locations resolve the same device-zone alarm.
- Noise alarms require, by default, 3 devices with at least 2 readings of
  85 dB or more in 30 seconds. State and alarm deduplication live in PostgreSQL.
- Events older than two minutes are stored but do not update live state or
  create real-time alarms.
- Raw sensor rows are retained for 7 days. Summaries and alarms are retained
  for 90 days.

## Requirements

- Node.js 20+
- Supabase PostgreSQL project
- Backend service-role key
- EAS development/internal build for the mobile application

Expo Go is not supported because background location, background audio, and
push notifications require native build configuration.

## Backend setup

```powershell
Copy-Item .env.example .env
npm ci
npm start
```

Required variables:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
JWT_SECRET=A_LONG_RANDOM_SECRET
ALLOWED_ORIGINS=https://YOUR_RENDER_SERVICE.onrender.com
COOKIE_SECURE=true
```

Do not expose the service-role key to the dashboard or mobile application.

## Database

For a new project, run `database/schema.sql`, then every file in
`database/migrations` in numeric order. For an existing project, take a backup
and run only migrations not yet applied. See `database/README.md`.

No default admin password is shipped. Create the first admin explicitly:

```powershell
$env:ADMIN_EMAIL='security@university.edu'
$env:ADMIN_PASSWORD='use-a-password-manager'
$env:ADMIN_NAME='Campus Security'
npm run admin:create
```

## Mobile setup

```powershell
Set-Location mobile-app
npm ci
npx expo-doctor
npx eas build --profile development --platform android
npx eas build --profile development --platform ios
```

Set `expo.extra.apiBaseUrl` in `mobile-app/app.json` for the target backend.
After linking the project with EAS, Expo writes the project ID used for push
tokens. The app gracefully skips push registration until that ID exists.

The SQLite offline queue keeps unique events for at most 24 hours and 10,000
rows, using exponential retry. Android uses a foreground location service.
iOS enables background location/audio. If the operating system force-stops the
app, continuous collection cannot be guaranteed and the UI states this.

## Verification

```powershell
npm run check
npm run validate:migrations
npm audit --audit-level=high

Set-Location mobile-app
npx expo-doctor
npx expo export --platform android
npm audit --audit-level=high
```

Physical-device acceptance requires at least 30 minutes on Android and iOS
with the screen locked, network loss/restoration, push delivery, and inspection
that no audio file is sent or permanently retained.

For the 100-device backend load scenario, prepare 100 test devices and run:

```powershell
$env:ADMIN_EMAIL='security@university.edu'
$env:ADMIN_PASSWORD='your-admin-password'
$env:LOAD_TEST_DEVICES='100'
$env:LOAD_TEST_SECONDS='60'
npm run load:test
```

API details are in `docs/openapi.yaml`. Reproducible demo steps are in
`docs/DEMO.md`.
