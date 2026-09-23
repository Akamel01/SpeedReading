# Map — speedreading-redesign-build

Effort: implement the frozen redesign (pass-3 spec + tokens + architecture decision).
Design sources: `.scratch/speedreading-redesign/design/` (pass artifacts, `tokens.md`, `architecture.md`).

## Dependency matrix

- Frontier (parallel): B1, B2, B3 — no blockers, disjoint files.
- Chain (sequential — shared `styles/app.css` + view files): S1 → S2 → S3 → S4 → S5 → S6 → S7.
- Cross edges: S1←B3; S2←B2,B3; S3←B1,B2,B3; S4←B2,B3; S5←B1,B2,B3; S6←S5; S7←S6.

```
B1 ─────────┬──────────────────────► S3 ──► S4 ──► S5 ──► S6 ──► S7
B2 ──┬──► S2 ──╯      ▲              ▲
B3 ──┴──► S1 ─────────╯              ╯(S4←B2,B3 via S3 chain)
```

## Ticket index

| # | Ticket | Category | Status | Blocked by |
|---|---|---|---|---|
| B1 | lib-sentence-ticks | enhancement | ready-for-agent | none |
| B2 | dom-helper-h | enhancement | ready-for-agent | none |
| B3 | tokens-css-split | enhancement | ready-for-agent | none |
| S1 | header-nav-material | enhancement | ready-for-agent | B3 |
| S2 | shelf-restyle | enhancement | ready-for-agent | B2, B3, S1 |
| S3 | page-rail-setup | enhancement | ready-for-agent | B1, B2, B3, S2 |
| S4 | quiz-copy | enhancement | ready-for-agent | B2, B3, S3 |
| S5 | log-lap-rows | enhancement | ready-for-agent | B1, B2, B3, S4 |
| S6 | motion-responsive | enhancement | ready-for-agent | S5 |
| S7 | green-release | enhancement | ready-for-agent | S6 |

## Resolution

Run speedreading-002 2026-09-23: B1–B3 and S1–S7 all delivered; S-chain reviewed (blockers fixed: lib splitter in SR mode, best/delta styling, motion gaps) and re-reviewed APPROVED; S7 released: suite 109/109, walkthrough 39/39 GO, pushed 4328fed, live URL verified serving the redesign (tokens.css folio/iron).
