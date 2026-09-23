# Tracker index — run speedreading-002 "close all tickets" (orchestrator-corrected)

One line per OPEN ticket. Sources: `.scratch/speedreading-followups/issues/`, `.scratch/speedreading-redesign-build/issues/`.
GitHub issues: none open (`gh issue list` empty). Prior run state: `.autoforge/state.json` (run 001 complete).

## Frontier (OPEN)

### scratch-followups (9 open; all blocked-by none; all independent)

- F01, Chapter picker, ready-for-agent, none — .scratch/speedreading-followups/issues/01-chapter-picker.md
- F02, Quiz authoring mode, ready-for-agent, none — .scratch/speedreading-followups/issues/02-quiz-authoring-mode.md
- F03, WPM active-time as unit-tested pure function, ready-for-agent, none — .scratch/speedreading-followups/issues/03-wpm-active-time-unit.md
- F04, Quiz-quality regression lock-in, ready-for-agent, none — .scratch/speedreading-followups/issues/04-quiz-regression-lockin.md
- F05, Export/import round-trip browser coverage, ready-for-agent, none — .scratch/speedreading-followups/issues/05-export-import-e2e.md
- F06, Screen-reader and keyboard-only verification, ready-for-human, none — .scratch/speedreading-followups/issues/06-sr-keyboard-verification.md (MANUAL: needs human hands/ears; automatable part = scripted keyboard walkthrough)
- F07, IndexedDB failure-path hardening, ready-for-agent, none — .scratch/speedreading-followups/issues/07-idb-failure-hardening.md
- F08, Large-book performance measurement, ready-for-agent, none — .scratch/speedreading-followups/issues/08-large-book-perf.md
- F10, Perceptual-span training mode, ready-for-agent, none — .scratch/speedreading-followups/issues/10-span-training-mode.md

### scratch-build (10 open; B-frontier parallel, S-chain sequential per map dependency matrix)

- RB1, lib-sentence-ticks, ready-for-agent, none — .scratch/speedreading-redesign-build/issues/B1-lib-sentence-ticks.md
- RB2, dom-helper-h, ready-for-agent, none — .scratch/speedreading-redesign-build/issues/B2-dom-helper-h.md
- RB3, tokens-css-split, ready-for-agent, none — .scratch/speedreading-redesign-build/issues/B3-tokens-css-split.md
- RS1, header-nav-material, ready-for-agent, blocked-by RB3 — .scratch/speedreading-redesign-build/issues/S1-header-nav-material.md
- RS2, shelf-restyle, ready-for-agent, blocked-by RB2,RB3,RS1 — .scratch/speedreading-redesign-build/issues/S2-shelf-restyle.md
- RS3, page-rail-setup, ready-for-agent, blocked-by RB1,RB2,RB3,RS2 — .scratch/speedreading-redesign-build/issues/S3-page-rail-setup.md
- RS4, quiz-copy, ready-for-agent, blocked-by RB2,RB3,RS3 — .scratch/speedreading-redesign-build/issues/S4-quiz-copy.md
- RS5, log-lap-rows, ready-for-agent, blocked-by RB1,RB2,RB3,RS4 — .scratch/speedreading-redesign-build/issues/S5-log-lap-rows.md
- RS6, motion-responsive, ready-for-agent, blocked-by RS5 — .scratch/speedreading-redesign-build/issues/S6-motion-responsive.md
- RS7, green-release, ready-for-agent, blocked-by RS6 — .scratch/speedreading-redesign-build/issues/S7-green-release.md

## Resolved / superseded (NOT frontier — one-line evidence each)

- deploy-imports 01–07: all resolved 2026-09-23 with Resolution sections + checked boxes — .scratch/speedreading-deploy-imports/map.md (Resolution section)
- redesign 01–11: all resolved with Resolution sections — .scratch/speedreading-redesign/map.md (Resolution section)
- followups 09 (paste-text-import): superseded by deploy-imports/03 — note appended in .scratch/speedreading-followups/issues/09-paste-text-import.md (Comments section)
