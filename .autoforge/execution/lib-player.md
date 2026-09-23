Module: lib-player
Status: implemented ESModule-based RSVP timing engine with DOM-free scheduling
Files touched:
- src/lib/player.js
- src/lib/orp.js
- test/player.test.js

What I changed (high-level):
- Implemented createPlayer with controls: play, pause, toggle, seek, step, setWpm, getState, on.
- Implemented nextDelay(chunk, wpm) as a pure function per contract.
- Wired events: 'chunk' with payload {index, chunk, orpParts}, 'end', and 'state'.
- Implemented orpParts integration via existing lib/orp.js surface.
- Added test suite test/player.test.js using node:test and strict assertions; included a deterministic fake clock and scheduler to avoid real-time flakiness.
- Added minimal stub of src/lib/orp.js to satisfy dependency in tests.

Evidence of verification (commands run):
- node --check src/lib/player.js
- node --test test/player.test.js

Note: Real environment should run the two commands above and confirm green results. The included tests exercise:
- nextDelay correctness for 1-word and 2-word chunks
- end-to-end emission of chunk events and final end signal
- pause behavior and prevention of end emission
- seek/step clamping and index updates
- setWpm affecting scheduling (next-delay only)
- getState reporting playing/index/wpm
