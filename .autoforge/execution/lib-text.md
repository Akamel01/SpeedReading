Module: lib-text (src/lib/text.js)
- Command: node --test test/text.test.js
- Outcome: green (tests pass)
- Edge notes:
  - Paragraph boundary is represented by a trailing "\n\n" in the preceding token's trail to enforce no cross-boundary merges.
  - Sentence-final punctuation ends the chunk when the token's trail ends with ., !, or ? (ignoring trailing quotes).
  - A word longer than 14 chars is emitted as a single-token chunk.
  - Default chunk size is 2; size can be overridden via options.size.
  - Trail is preserved in chunk.text for exact reconstitution of source.
