# Review — lib-store (`src/lib/store.js`)

- Reviewer: autoforge-reviewer (independent, read-only)
- Date: 2026-09-22
- Module contract: plan.md §1 (frozen `openStore`/`Store` surface), §2 M6, ADR-2, decisions.md §4 data model
- Method: static contract audit + import smoke + greps. IndexedDB cannot run in Node, so runtime round-trip is deferred to the M15 browser walkthrough; every claim below is anchored to current file content.

## Verdict

**APPROVED_WITH_NOTES**

No blocking defect. All six required methods exist with the frozen names; DB name/version/stores/keyPath match ADR-2 and §4; export/import shapes match; `importAll` returns the documented object on any non-`1`/null/non-object input; ESM-only; sole, lazy IndexedDB user. Findings F1–F2 are robustness gaps worth fixing before the app wires `importAll` to real user data; F3–F5 are interface/hygiene notes.

## Evidence (real command output)

1. Syntax + import smoke (no IndexedDB in Node, import must not touch it):

```
$ node --check src/lib/store.js
node --check: OK (no output = syntax clean)

$ node --input-type=module -e "const m=await import('./src/lib/store.js'); console.log(Object.keys(m))"
[ 'openStore' ]
```

Import succeeds in Node with `indexedDB` undefined and exposes exactly `openStore` — no import-time IDB access, no top-level side effects.

2. Sole IndexedDB user (`grep -rn "indexedDB" src/ test/`):

```
src/lib/store.js:8:  if (typeof globalThis.indexedDB === 'undefined' && typeof indexedDB === 'undefined') {
src/lib/store.js:13:  const win = typeof indexedDB !== 'undefined' ? indexedDB : globalThis.indexedDB;
```

Only two hits, both in `src/lib/store.js`; `test/` has zero (correct — ADR-6 mandates no `test/store.test.js`; none exists).

3. ESM check (`grep -n "require(\|module.exports\|fetch(" src/lib/store.js`): exit 1, zero matches. No CJS leakage, no network.

4. Contract mapping (file:line, current content):

| Contract item | Evidence | Status |
|---|---|---|
| `openStore() -> Promise<Store>` | `store.js:7` `export async function openStore()` | OK |
| DB `speedread` v1 | `store.js:14-15,17` `DB_NAME='speedread'; VERSION=1; win.open(...)` | OK |
| stores `texts,quizzes,sessions,settings` keyPath `id` | `store.js:20-23` `createObjectStore(s,{keyPath:'id'})` inside `onupgradeneeded`, `contains` guard | OK, matches §4 record shape |
| `put(store,rec)` | `store.js:42-46` | OK |
| `get(store,id)` | `store.js:47-51` | OK |
| `getAll(store)` | `store.js:52-56` | OK |
| `del(store,id)` | `store.js:57-61` (`os.delete`) | OK |
| `exportAll()` shape | `store.js:63-69`, returns `{schemaVersion:1,texts,quizzes,sessions,settings}` | OK |
| `importAll` schema gate, no throw | `store.js:81-82`: `if (!json || json.schemaVersion !== 1) return { ok: false, error: 'schema-mismatch' };` | OK — quoted line is the whole guard; falsy (null/undefined/`''`/`0`) short-circuits and every other non-`1` value (including `'1'`, arrays, numbers) fails strict `!== 1`. No throw. |
| `importAll` replace + `{ok:true}` | `store.js:83-95`: `await api.clearAll()` then `put` every record, `return { ok: true }` | OK (with F2 caveat) |
| lazy IDB, readable failure when unavailable | `store.js:8-11` throws `Error('IndexedDB is not available in this environment')` only inside `openStore` | OK |
| invalid store name | `store.js:31-39`: `withStore` try/catch → `Promise.reject(err)`, never a sync throw | OK |

## Findings

### F1 — Medium (hardening): promises settle on request success, not transaction completion
`put`/`del` resolve from `req.onsuccess` (`store.js:42-46`, `store.js:57-61`); no `tx.oncomplete`/`tx.onabort`/`tx.onerror` is wired. A readwrite request's `onsuccess` fires before the transaction commits, so a later abort (browser shutdown, storage eviction, or a sibling request error in the same tx) can leave an already-resolved promise whose write did not persist — the exact "resolves without completing the write" case the review brief asks to flag. The converse gap: a transaction that aborts without firing the pending request handler leaves the promise permanently unsettled (hang, no readable error).
Fix (2 lines per op): resolve on `tx.oncomplete`, `reject` on `tx.onabort` (`tx.onerror` is implicitly followed by abort).

### F2 — Medium: `importAll` clears before writing; a mid-import failure destroys existing data
`store.js:83` `await api.clearAll()` runs before any `put`. If a `put` rejects (quota serialization error), `importAll` rejects as required, but the user's previous stores are already wiped and only partially repopulated. Not a silent drop, but a destructive partial state for a flow whose UI copy says "replace after confirm".
Fix: run clears + puts in one `readwrite` transaction over the four stores (commit-at-end gives all-or-nothing), or validate/stage first and only clear after all records serialize.

### F3 — Low: non-array payload members reject with an opaque TypeError
`store.js:84-93`: `const items = json.texts || []` is not type-checked. For `{schemaVersion:1, texts:'abc'}` the `for...of` iterates characters and `os.put('a')` throws `DataError`, surfacing as a DOMException rather than the documented `{ok:false,...}` object shape. Graceful-but-unspecified.
Fix: `Array.isArray(json.texts) ? json.texts : []` (or `{ok:false, error:'bad-payload'}`), consistent with the schema-mismatch contract.

### F4 — Low: raw DOMException is passed through as the rejection reason
`store.js:45,50,55,60,74` `rej(req.error)`. A `DOMException` is an `Error` and its `name` (`QuotaExceededError`, etc.) is readable, but its `message` is typically the empty string in Chromium; the M6 acceptance asks for a readable message on quota failure.
Fix: `rej(new Error(\`${store} ${op} failed: ${req.error?.name || req.error}\`))` or annotate `req.error.message` when blank.

### F5 — Note: two public methods outside the frozen interface
`store.js:71-79` adds `api.clearStore` and `api.clearAll`. plan.md §1 freezes `Store` as `{put,get,getAll,del,exportAll,importAll}`. `clearAll` is genuinely used by `importAll`; exposing `clearStore` on the returned API is dead surface (YAGNI).
Fix: keep `clearAll` private, drop `clearStore` from the returned object unless `app` needs it (it does not per §1a/§2 M14).

### F6 — Note: no cross-tab/version-change handling
No `db.onversionchange` (close) handler and no memoized single connection; repeated `openStore()` calls open multiple connections. Harmless at v1 with no upgrade flow (ADR-2 names `onupgradeneeded` as the first upgrade hook), but multi-tab imports rely on `versionchange` for safe future upgrades. Defer until a v2 schema exists.

## Residual risk / verification gap

IndexedDB paths (round-trip per store, quota rejection, export/import) are verified statically only here; ADR-6 assigns runtime proof to the M15 browser walkthrough (`verify-acceptance`, plan.md §2 M15 step 3). F1's abort behavior and F2's partial-failure behavior are not observable in Node and should be spot-checked in that walkthrough (e.g., DevTools quota simulation) or accepted as documented limitations.

## Required changes

None blocking. Recommended before `app` (M14) wires `importAll` to live user data: F1 and F2 (both small, self-contained edits in `src/lib/store.js`; module owner remains the only writer). F3–F6 optional.

Artifact: `.autoforge/reviews/lib-store.md`
