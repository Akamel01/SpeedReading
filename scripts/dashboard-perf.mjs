// scripts/dashboard-perf.mjs — dashboard render budget gate (ADR-27, binding 9).
// Usage: node scripts/dashboard-perf.mjs
// Renders the dashboard log view with a deterministic 1000-session fixture in
// headless Chromium (via scripts/harness-run.mjs) and asserts the render
// completes in <100ms. Exits non-zero on budget breach (propagates --assert).
// Owner: M-P07B introduces; M-P08A owns final state.

import { spawnSync } from 'node:child_process';

console.log('dashboard-perf: 1000-session render budget <100ms (test/harness/dashboard-perf.html)');
const run = spawnSync(process.execPath, ['scripts/harness-run.mjs', 'test/harness/dashboard-perf.html', '--assert'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(run.status ?? 2);
