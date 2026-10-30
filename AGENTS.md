# AGENTS.md

Hisab Pune: civic accountability map for Pune. The app package is `hisab-pune/` (web + API), iOS in `hisab-pune/ios/`; it is not the git root.

- Scope: change only the files the handoff names; anything else, stop and report.
- Before editing: read the handoff and the files it names; nothing else unless needed.
- Tests: run `cd hisab-pune && npm ci && npm run ci` (lint, grade, seed + API tests, build) before finishing; done means it passes. UI flow changes also run `npm run test:e2e`. Add or update a test for each behaviour change (`*.test.ts` next to the code, run by `tsx --test`).
- Siblings: before finishing, search the allowed files for other code paths that repeat the pattern you fixed (same helper, constant or logic) and fix them too.
- Style: follow existing patterns (TypeScript, oxlint, ESM); English only in names, UI and API payloads; edit `hisab-pune/ios/project.yml`, never the pbxproj. No new dependency without the handoff saying so.
- Fail loud: no silent fallbacks, no skipped or weakened tests or gates.
- Secrets: never print or commit them; read from the environment or Keychain inside the process.
- Git: work only on your `codex/<task>` branch; never commit to main.
- Output: last message = what changed (files), test result, open questions. No narration.
- Never: add sign-in or accounts (the product is public), switch the Render service to paid, or mutate the Apple developer portal without explicit operator approval.
- Docs: `hisab-pune/ARCHITECTURE.md`, `hisab-pune/DESIGN.md`, `hisab-pune/IMPLEMENTATION.md`, `hisab-pune/README.md` (run, CI, graders), `hisab-pune/ios/README.md`.
