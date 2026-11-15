# Bird Wanderer

A mobile-first birdwatching and wildlife-photography app, built by Group 13 for the Software Engineering course.

Bird Wanderer brings bird discovery, hotspot planning, photography preparation, a personal field journal and a small birding community into one app. It runs as a mobile web app and as an Android app (APK) that wraps the same interface.

## Status

The project is complete. All four planned phases are delivered and tested, and the Android APK builds and installs.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 — Core | Accounts, species discovery, hotspots and maps, weather and photography planning | Delivered |
| 2 — Community | Profiles, photo uploads with EXIF reading and metadata removal, journal, life list, community feed | Delivered |
| 3 — Alerts | Species and hotspot subscriptions, sighting and forecast alerts, optional Firebase push, privacy protection for exact locations | Delivered |
| 4 — Retention | Photo quiz with XP and streaks, weekly photography challenges, field messaging, global search, notifications | Delivered |
| Android | Java WebView app with native photo picker, location, sharing and optional push | APK builds and installs |

**Next step:** permanent hosting on Azure, so the web app and the APK can reach a server that is always on. The `main_birdwanderer.yml` workflow already builds, tests and deploys `main` to the Birdwanderer Azure Web App; until hosting is finalised the server also runs on a team laptop. See the [release runbook](docs/RELEASE_RUNBOOK.md) and [domain setup](docs/DOMAIN_SETUP.md).

## Features

- **Explore:** recent bird reports for Delhi and Noida from eBird, nearby filtering from your device or a chosen point, and a local weather forecast.
- **Species pages:** credited Wikimedia Commons photographs with their camera settings, Wikipedia identification/habitat/behaviour excerpts, licensed bird-call recordings, a map of recent sightings and photography tips.
- **Hotspots:** an interactive OpenStreetMap map, recent reports and all-time species lists per hotspot, sunrise/sunset and hourly forecasts, reviewed visitor information for major sites, and Google Maps directions.
- **Log Observation:** upload a JPEG/PNG, pick the species, read the date and location from the photo when present, add a hotspot or map point, and save the weather for that hour. The stored copy has all embedded metadata removed.
- **Journal and Life List:** your own records with editing, deletion and life-list tracking.
- **Community:** feed, follows, likes, saves, comments and reports, with per-post visibility (public, followers, private) enforced by the server.
- **Field Chats:** private one-to-one messages with optional observation or hotspot attachments that respect post privacy.
- **Alerts and notifications:** subscribe to a bird or hotspot, get sighting and photography-forecast alerts, and follow/comment/mention notifications.
- **Bird Quiz:** ten-question photo practice with XP, streaks and weekly challenges.
- **Account:** password change, optional email verification and password recovery, privacy settings.

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| API | Node.js 24, Express |
| Database | SQLite (Node's built-in `node:sqlite`) |
| Authentication | scrypt password hashes, hashed session tokens, HttpOnly cookies, origin checks, rate limiting |
| Maps | Leaflet with OpenStreetMap tiles; Google Maps directions links |
| Data sources | eBird API 2.0, Open-Meteo, Wikidata, Wikimedia Commons, Wikipedia |
| Android | Java WebView host, Gradle 8.13, Android Gradle Plugin 8.13.2, minimum Android 8 (API 26) |
| Tests | Node.js test runner: HTTP integration tests, server-rendered UI checks, Android unit tests |
| Package manager | pnpm 11.25.0 with a committed lockfile |

## Getting started

Install Node.js **24.15 or later in the 24.x line** and pnpm **11.25.0**. Then:

```sh
cd frontend
pnpm install --frozen-lockfile
cp .env.example .env   # then add your own eBird API key
pnpm dev
```

Open **http://localhost:3000** (use `localhost`, which matches the default allowed origin) and create an account. On Windows, `./Start-Dev.ps1` from the repository root starts the same thing.

Bird discovery needs a free eBird API key from https://ebird.org/api/keygen in `EBIRD_API_KEY`. Every other service is optional; [`frontend/.env.example`](frontend/.env.example) lists every setting with placeholders. Never commit `.env`, databases, photographs or credentials.

Accounts, records and photographs are stored in `frontend/data/` (`bird-wanderer.sqlite` and `media/`), which Git ignores.

## Checks

From `frontend`:

```sh
pnpm lint    # TypeScript type check
pnpm test    # automated tests on temporary databases
pnpm build   # production build
```

Android, from `android` (needs JDK 17 and the Android SDK; see [android/README.md](android/README.md)):

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug assembleRelease
```

GitHub Actions runs both sets of checks on every push and pull request, and the Azure workflow runs them again before deploying `main`.

## Android APK

The APK is a thin Java WebView host for the same interface; the server, database and photographs stay on the server. On first launch it asks which server to connect to. The debug build is at `android/app/build/outputs/apk/debug/app-debug.apk`; the release build must be signed with your own key before distribution. Details: [android/README.md](android/README.md).

## Operations

- **Backups:** `pnpm backup create <new-folder-outside-the-repo> --server-stopped`, then `pnpm backup verify <folder>`. See the [release runbook](docs/RELEASE_RUNBOOK.md).
- **Removing leftover test data:** `pnpm cleanup:test-data` takes a verified backup and lists every account with its activity, marking likely test accounts. Nothing is deleted without `--apply` and a keep-list. See [frontend/README.md](frontend/README.md#removing-leftover-test-data).
- **Production:** set `NODE_ENV=production` and an HTTPS `APP_ORIGIN`, run `pnpm build`, then `pnpm start` behind an HTTPS reverse proxy.

## Repository layout

```text
frontend/
  src/components/       Screens and shared UI
  src/lib/              Browser API clients and helpers
  server/               Express API modules and their tests
  scripts/              Dev launcher, tunnel, backup and test-data cleanup
  worker/               Push-notification service worker
android/                Java WebView app (Gradle project)
docs/                   Walkthroughs, acceptance records and design references
  design-reference/     Approved screen designs
.github/                CI, Android and Azure deployment workflows; contribution templates
```

## Data sources and credits

Bird reports and hotspots: [eBird](https://ebird.org) (Cornell Lab of Ornithology). Weather: [Open-Meteo](https://open-meteo.com) (CC BY 4.0). Species photographs and recordings: [Wikimedia Commons](https://commons.wikimedia.org), credited with each creator and licence in the app. Species text: [Wikipedia](https://en.wikipedia.org) (CC BY-SA 4.0). Maps: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## Team (Group 13)

Anirudh Jain (project manager and deployment), Ayush Pandey (development), Sourabh (design), Uday (testing) and Ravi Ranjan (requirements analysis).

## Documentation

- [Development record](docs/DEVELOPMENT_RECORD.md): dated history of every increment
- [Final acceptance](docs/FINAL_ACCEPTANCE.md) and [design comparison](docs/DESIGN_FIDELITY.md)
- [Release runbook](docs/RELEASE_RUNBOOK.md), [domain setup](docs/DOMAIN_SETUP.md) and [runtime notes](frontend/README.md)
- [Android app](android/README.md)
- Feature walkthroughs with viva notes: [authentication](docs/AUTH_WALKTHROUGH.md), [discovery](docs/DISCOVERY_WALKTHROUGH.md), [weather](docs/WEATHER_WALKTHROUGH.md), [photos](docs/PHOTOS_WALKTHROUGH.md), [EXIF](docs/EXIF_WALKTHROUGH.md), [observations](docs/OBSERVATIONS_WALKTHROUGH.md), [community](docs/COMMUNITY_WALKTHROUGH.md), [alerts](docs/ALERTS_WALKTHROUGH.md), [messaging](docs/MESSAGING_WALKTHROUGH.md), [retention](docs/RETENTION_WALKTHROUGH.md), [search and notifications](docs/SEARCH_NOTIFICATIONS_WALKTHROUGH.md), [password recovery](docs/PASSWORD_RECOVERY_WALKTHROUGH.md) and more in [docs/](docs/)
- [Living project specification](https://docs.google.com/document/d/1_KcOFYP8ELQf6WegrDuPw5uNlLqqlc90Gf2x46mSUvc/edit?usp=sharing)
- [Contribution guide](CONTRIBUTING.md)

No project-wide open-source licence has been chosen; existing file-level notices are kept.
