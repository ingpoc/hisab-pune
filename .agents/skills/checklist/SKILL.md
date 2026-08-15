---
name: checklist
description: Hisab Pune product-lead checklist adapter. Use for current checklist status, blockers, stale checklist data, or go/no-go posture.
---

# Hisab Pune checklist

Use `~/.agents/skills/checklist-framework` for lifecycle, statuses, schema, and rendering.

## Owners

- Sole checklist control owner: `.session/checklist/checklist.json`
- Architecture: `.session/docs/ARCHITECTURE.md`
- Design: `.session/docs/DESIGN.md`
- iOS evidence: `hisab-pune/ios/README.md`
- Web/API evidence: `hisab-pune/README.md`, `hisab-pune` graders / API tests / Playwright

Code, CI logs, Simulator runs, and portals never update checklist status automatically.

Testing follows `~/.agents/skills/testing-framework` via `.agents/skills/hisab-pune-testing/`. Gate owner: `.agents/skills/hisab-pune-testing/gates.json`. Snapshot: `.session/testing/testing-ledger.json`. `npm run ci` is evidence only.

## Applicability

Sections 0–5 and 7–9 apply. Section 6 is `not_required`: no customer billing or money movement.

## Commands

```bash
python3 scripts/generate_checklist.py
python3 scripts/generate_checklist.py --check-current
python3 scripts/generate_checklist.py --check
python3 ~/.agents/skills/checklist-framework/scripts/render_checklist.py --root . --check-current
python3 ~/.agents/skills/checklist-framework/scripts/audit_repo_docs.py .
```

Generated caches: `.session/checklist/state.json`, `.session/testing/testing-ledger.json`, `.session/html/checklist.html`. Do not edit them.

## Boundaries

- Local CI and Simulator proof do not establish TestFlight, production host, or frozen-source release.
- Apple portal App IDs, App Group registration, deploy, spend, and legal acceptance stay operator-controlled.
- Reconcile evidence into `checklist.json` explicitly; generation never imports status from roadmaps or portals.
