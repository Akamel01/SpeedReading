# 06: Dashboard + header integration

**Category:** enhancement

**What to build:** Wire engines and components into the app: dashboard gamification home, header HUD (XP + streak), persisted "seen" state for the unlock moment.

**Blocked by:** 01, 02, 03, 04, 05.

**Status:** ready-for-agent

## Agent Brief

**Summary:** `src/app.js` + `src/ui/dashboard.js` + `index.html` header. The only ticket mutating shared app files.

**Desired behavior:**
- `createDashboard` render contract extends additively: `render({ sessions, suggestion, gamify })` where `gamify` is computed in `src/app.js` from the engines (engines stay pure). Existing lap table / suggestion behavior unchanged.
- Dashboard order frozen by `design/direction.md`: XP/level → streak + calendar → unlock moment (only when new) → stamps grid → chart → podium → existing lap table + actions.
- Header HUD: compact XP counter + streak chip, visible across views, updated after session record and quiz save; not focus-trapping; accessible names.
- Settings delta: `settings.seenAchievements: string[]` (additive, default `[]`). New unlocks → unlock moment renders, then ids written as seen. Legacy settings default safely.
- Empty state invites action ("Read one text to start your ledger"); no fake data, no locked-badge noise when there is no history (design doc defines exact empty behavior).

**Key interfaces:**
- Engines 01–03; components 04–05; store: existing `settings` record only (no DB version change)
- `show()` routing unchanged; zero new views

**Acceptance criteria:**
- [ ] `.autoforge/validation/e2e-walkthrough.mjs` extended: after a real session + quiz → XP > 0 shown, streak day marked, unlock moment appears once, second dashboard visit does not repeat it
- [ ] `node --test test/` green; all pre-existing walkthrough steps still green
- [ ] Copy grep (speed-promise words) over new UI copy exits nonzero; zero network requests after load re-verified
- [ ] Legacy data path: import a schemaVersion-1 export without gamification fields → dashboard renders without error

**Out of scope:** new views/routes, store schema bump, notifications, data migration, push/deploy.
