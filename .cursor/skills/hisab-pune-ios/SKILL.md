---
name: hisab-pune-ios
description: >-
  Routes Hisab Pune iOS/SwiftUI/WidgetKit/XCUITest work to the repo owner
  hisab-pune/ios/README.md (XcodeGen project.yml, App Group group.in.hisab.pune,
  team 9UPQL479Z5, UITest HISAB_FORCE_* traps). Use when editing ios/, running
  Simulator/UITests, fixing signing/entitlements, or building HisabPune.
---

# Hisab Pune iOS (router)

Thin trigger only. **Do not duplicate facts here.**

## First actions

1. Read `hisab-pune/ios/README.md` — layout, run, signing table, **Agent traps**.
2. For Apple signing / App Groups / portal / Simulated.xcent doctrine → load
   `apple-developer` (`~/.codex/skills/apple-developer`).
3. For WidgetKit timeline/refresh detail → `widgetkit` after README.

## First commands

```bash
cd hisab-pune
npm run seed && npm run dev          # API :8787 required by app
cd ios && xcodegen generate
xcodebuild test -scheme HisabPune \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:HisabPuneUITests
```

## Hard rules (pointers)

| Rule | Owner |
| --- | --- |
| Edit `project.yml`, not pbxproj | `ios/README.md` |
| App Group plists must stay non-empty after generate | `ios/README.md` + `apple-developer` |
| UITest forced coords = `launchEnvironment` | `ios/README.md` |
| No portal mutation without explicit user OK | `apple-developer` |
