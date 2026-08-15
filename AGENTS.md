# Hisab Pune Repo Instructions

## Inheritance Contract

Inherits `~/.codex/AGENTS.md`. That file owns universal doctrine. This file owns only Hisab Pune routing and boundaries.

## Scope

Pune civic accountability: web + API in `hisab-pune/`, iOS in `hisab-pune/ios/`.

## Trigger Map

- Product-lead checklist, blockers, or go/no-go → `.agents/skills/checklist/SKILL.md`
- Architecture or product rules → `.session/docs/ARCHITECTURE.md`
- Visual / disclosure language → `.session/docs/DESIGN.md`
- iOS / WidgetKit / XCUITest → `.cursor/skills/hisab-pune-ios/SKILL.md` → `hisab-pune/ios/README.md`
- Web/API run, CI, graders → `hisab-pune/README.md`

## Documentation ownership

- Keep root prose to `AGENTS.md` and `README.md`; both are routers, not app fact owners.
- Keep canonical app documents only in `.session/docs/`.
- Keep exactly one control owner for each document type and name it in the owner map.
- Consolidate useful content before deleting a duplicate; then repair every inbound link.
- Keep current checklist facts only in `.session/checklist/checklist.json`; generated session files never own status.

Owner map:

| Type | Owner |
| --- | --- |
| Architecture | `.session/docs/ARCHITECTURE.md` |
| Design | `.session/docs/DESIGN.md` |
| Checklist | `.session/checklist/checklist.json` |
| iOS runbook | `hisab-pune/ios/README.md` |
| Web/API run | `hisab-pune/README.md` |

## Repo Rules

- English only in names, UI, and API payloads.
- Edit `hisab-pune/ios/project.yml`, not pbxproj.
- No Apple portal mutation without explicit operator authorize.
