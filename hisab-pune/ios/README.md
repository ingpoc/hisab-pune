# HisabPune iOS (scaffold)

SwiftUI + WidgetKit project skeleton for Mac/Xcode.

## Shared contract

`Shared/HereSnapshot.swift` mirrors `GET /v1/here` widget payload (English fields only).

## Targets (create in Xcode)

1. **HisabPune** — main app (location → `/v1/here` → App Group)
2. **HisabPuneWidget** — medium Home Screen widget reading App Group
3. Optional **HisabPuneTravel** Live Activity — Travel mode

App Group id: `group.in.hisab.pune`

## Run

Open this folder on a Mac with Xcode 16+, create an iOS App project, add these sources, enable App Groups + Location When In Use.

This Linux cloud agent cannot compile iOS binaries.
