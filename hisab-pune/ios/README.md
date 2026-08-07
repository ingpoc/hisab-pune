# HisabPune iOS

SwiftUI app + WidgetKit. English-only. Shares `GET /v1/here` via App Group `group.in.hisab.pune`.

Cursor router skill: `.cursor/skills/hisab-pune-ios/SKILL.md` (points here).

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

Simulator build + UI tests (team `9UPQL479Z5` in `project.yml`):

```bash
cd hisab-pune/ios
xcodegen generate   # do not hand-edit .xcodeproj
# API must be on :8787
xcodebuild test -scheme HisabPune \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:HisabPuneUITests
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

## Signing (Apple Developer)

Owner: `project.yml` (`DEVELOPMENT_TEAM = 9UPQL479Z5`, Automatic).
Cross-project signing doctrine: `~/.codex/skills/apple-developer`.

| Target | Bundle ID | Entitlements |
| --- | --- | --- |
| HisabPune | `in.hisab.pune` | App Group `group.in.hisab.pune` |
| HisabPuneWidget | `in.hisab.pune.widget` | same App Group |
| HisabPuneUITests | `in.hisab.pune.uitests` | none |

Simulator/UITest lane does not require portal App ID registration. Device or
TestFlight needs explicit App IDs + App Group on **both** App IDs (authorize
portal mutation separately).

## Agent traps (read before changing iOS)

1. **Owner is `project.yml`.** Run `xcodegen generate`. Never hand-edit
   `HisabPune.xcodeproj` as source of truth.
2. **Do not re-add XcodeGen `entitlements:` target keys.** They wiped
   `.entitlements` to empty `<dict/>` once. Keep App Groups in the plist files;
   point `CODE_SIGN_ENTITLEMENTS` at them; `plutil -p` after generate.
3. **API contract for the app:** working tree / Phase E API with
   `POST /v1/auth/session`, `categoryId` on reports,
   `GET /v1/localities/:id/reports`. Stock `main` without session will fail
   create/session. Prove with `curl` `:8787/health` and session before UITests.
4. **UITest location:** `HISAB_FORCE_LAT` / `HISAB_FORCE_LNG` via
   `launchEnvironment` (see `LocationModel`). Do not use `Process`/`simctl`
   inside the iOS UITest target.
5. **Report → Here round-trip:** after pin + keyboard, cold relaunch the app;
   do not rely on tab switch alone.
6. **Simulator `codesign` empty entitlements** is a false negative — check
   `*-Simulated.xcent` and App Group container runtime write
   (`here.snapshot` / `group.in.hisab.pune`).
7. **Portal / `-allowProvisioningUpdates`:** not authorized by Simulator work.
   Ask before creating App IDs or profiles.

## Not in this slice

- Phone OTP UI (session stub only)
- PhotoPicker → object storage
- Live Activity travel mode
- App Store / TestFlight upload
