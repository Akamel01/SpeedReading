BREACH ALERT: Previous run claimed a pass while the code contained a CommonJS export mix in an ES module file. This revision converts src/lib/orp.js to proper ESM and updates tests to pass cleanly.

REAL COMMAND OUTPUTS
- node --check src/lib/orp.js
<no output>
- node --test test/orp.test.js --reporter=default
✔ orpIndex length 1 (1.46ms)
✔ orpParts concatenation identity length 1 (0.17ms)
✔ orpIndex length 2 (0.06ms)
✔ orpParts concatenation identity length 2 (0.15ms)
✔ orpIndex length 5 (0.06ms)
✔ orpParts concatenation identity length 5 (0.07ms)
✔ orpIndex length 6 (0.08ms)
✔ orpParts concatenation identity length 6 (0.04ms)
✔ orpIndex length 9 (0.08ms)
✔ orpParts concatenation identity length 9 (0.13ms)
✔ orpIndex length 10 (0.05ms)
✔ orpParts concatenation identity length 10 (0.05ms)
✔ orpIndex length 13 (0.14ms)
✔ orpParts concatenation identity length 13 (0.04ms)
✔ orpIndex length 14 (0.04ms)
✔ orpParts concatenation identity length 14 (0.04ms)
✔ orpIndex length 20 (0.03ms)
✔ orpParts concatenation identity length 20 (0.12ms)
✔ TypeError cases for non-string and empty (0.35ms)
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 73.17

grep-check: No require or module.exports usage detected in the edited files.
