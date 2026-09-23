# AutoForge run — SpeedReading

Product-side state for this run. Factory rules: `~/.config/opencode/autoforge/protocol.md`.

- State: `.autoforge/state.json` (phase, loop, modules)
- Stage views: `.autoforge/stages/*/output/` (symlinks to flat homes)
- Status = what exists: a stage is complete when its output dir has files other than placeholders.
