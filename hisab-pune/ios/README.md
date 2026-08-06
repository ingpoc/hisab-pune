# HisabPune iOS

SwiftUI app + WidgetKit. English-only. Shares `GET /v1/here` via App Group `group.in.hisab.pune`.

Requires API with `POST /v1/auth/session`, categories on reports, and `GET /v1/localities/:id/reports`.

## Layout

| Path | Role |
| ------ | ------ |
| `project.yml` | XcodeGen project (source of truth) |
| `HisabPune.xcodeproj` | Generated — open this in Xcode |
| `Shared/HereSnapshot.swift` | Widget + app snapshot contract |
| `HisabPune/` | Main app (Here, Report, session, location) |
| `HisabPuneWidget/` | Home Screen small/medium widget |

## Open / regenerate

```bash
cd hisab-pune/ios
xcodegen generate   # needs brew install xcodegen
open HisabPune.xcodeproj
```

Simulator build (no Apple team required):

```bash
cd hisab-pune/ios
xcodegen generate
xcodebuild -scheme HisabPune \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath /tmp/HisabPuneDerived \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## Run against local API

1. `npm run seed && npm run dev` in `hisab-pune/` (API `:8787`).
2. Run **HisabPune** on Simulator — default base URL is `http://127.0.0.1:8787`.
3. Physical device: set API URL in **About** to your Mac’s LAN IP (`http://192.168.x.x:8787`).

## Behaviour (MVP)

- Session via `POST /v1/auth/session` → stable **anonymous posting id**.
- **Here** tab: GPS → `/v1/here` → escalation people + locality issue feed; writes App Group for widget.
- **Report** tab: category + note at current GPS (Baner fallback until fix) → `POST /v1/reports`.
- Widget reads last `HereSnapshot` from App Group.

## Not in this slice

- Phone OTP UI (session stub only)
- PhotoPicker → object storage
- Live Activity travel mode
- App Store signing / Team ID (set `DEVELOPMENT_TEAM` in Xcode)
