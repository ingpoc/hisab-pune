---
name: hisab-pune-testing
description: >-
  Hisab Pune testing adapter. Use for prove, drain, frozen-source release,
  or checklist-linked acceptance gates. Doctrine stays in testing-framework.
---

# Hisab Pune testing

Lane: drain. Default mode **B**. Mode **A** only to catalog an unknown fail surface. Mode **C** after the same tip fails twice. Doctrine: `~/.agents/skills/testing-framework`.

## Owners

| Concern | Owner |
| --- | --- |
| Product status | `.session/checklist/checklist.json` |
| Acceptance gates | `.agents/skills/hisab-pune-testing/gates.json` |
| Immutable receipts | `.session/testing/receipts/` |
| Design | `.session/docs/DESIGN.md` |
| Architecture | `.session/docs/ARCHITECTURE.md` |
| Journeys | `hisab-pune/e2e/smoke.spec.ts`, `hisab-pune/server/src/app.test.ts` |
| Generated snapshot | `.session/testing/testing-ledger.json` |

Refresh: `python3 scripts/generate_checklist.py` then `--check-current`. Never edit generated session files.

## Dimensions

Applicable: static, functional (web/API).  
Open: visual vs DESIGN.md, blind UX, accessibility/trust runtime, iOS XCUITest, empty frozen re-review.  
Not required: customer money.

## Commands

```bash
python3 scripts/testing_release.py          # freeze HEAD, run deterministic suite, write receipt
python3 scripts/generate_checklist.py
python3 scripts/generate_checklist.py --check-current
```

`npm run ci` in `hisab-pune/` is evidence only. It does not pass G2.

## Mutexes (contested → stop)

| Mutex | Rule |
| --- | --- |
| `playwright-chromium` | One prove owner |
| `seed-db` | Do not reseed mid-prove |

Browser UI → bundled Chrome. iOS → `hisab-pune-ios`. No portal mutation.
