# M-RB2 review — `src/ui/h.js` + `test/harness/h.html`

**Verdict: APPROVED**
Date: 2026-09-23 · Reviewer: autoforge-reviewer (read-only) · Budget: one browser session, ports 8141/9371

## Evidence

### 1. Syntax / purity
- `node --check src/ui/h.js` → `exit=0`.
- `grep -n "require(\|module.exports\|innerHTML" src/ui/h.js` → no output, `grep_exit=1` (empty match). No CommonJS, no `innerHTML`.
- No DOM at import: only import-time statement is the `export function h` declaration (h.js:10); `document` appears only inside the function body — `document.createElement` h.js:12, `document.createTextNode` h.js:41. Header comment h.js:9 states the invariant and code matches.

### 2. Contract vs ADR-19 freeze (`.autoforge/architecture/decisions.md:148-149`)
Frozen: `h(tag: string, attrs?: {class?, on?, ...attr}, ...children) -> Element`.
- Signature: h.js:10 `export function h(tag, attrs, ...children) {`
- `class:` h.js:15-18 `const { class: className, on, ...rest } = attrs; ... el.className = className;`
- `on:` h.js:19-25 `for (const [evt, handler] of Object.entries(on)) ... el.addEventListener(evt, handler)` (non-function handlers ignored)
- other attrs h.js:26-31 `el.setAttribute(key, String(value))`, nullish values skipped
- strings/numbers → text nodes h.js:40-43 `document.createTextNode(String(child))`
- arrays flattened h.js:36-39 `child.forEach(appendChild)`
- nullish skipped h.js:35 `if (child === null || child === undefined || child === false) return;`
- non-Node objects ignored h.js:48-49
- tag may be an existing Element (h.js:12 ternary) — superset of freeze, harmless.

### 3. Browser check (real Chromium, real h(), real DOM)
Served repo with `python3 -m http.server 8141 --bind 127.0.0.1` (`http_status=200`), loaded `test/harness/h.html` in
`~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`
via zero-dep CDP (`--remote-debugging-port=9371`, Node 26 global `WebSocket`). Both processes killed after run (`both-killed`).

Observed:
```
BROWSER: HeadlessChrome/151.0.7922.34 | protocol 1.3
RESOURCES: ["http://127.0.0.1:8141/src/ui/h.js"]
HARNESS_OK_ATTR: "true"
DOM_SNAPSHOT: "<div class=\"container\"><span>Hello</span><ul><li>One</li><li>Two</li><li><strong>Three</strong></li></ul>Text</div>"
HARNESS_STRUCT: {"container":true,"span":"Hello","lis":["One","Two","Three"],"hasText":true,"textNodeDirect":true}
CONSOLE: []
PAGE_ERRORS: null
```
- Harness ran against the **real** module: the only resource fetched is `/src/ui/h.js` (harness imports `/src/ui/h.js`, h.html:13); no mock DOM/`h` stub exists in the harness. Its structural assertions (h.html:33-39: `div.container`, child `span`, exactly 3 `li`, body text) pass → `data-harness-ok="true"`.
- Independent in-page probe against the imported real `h()`:
```
CONTRACT_PROBE: {"attr_class":"c1","attr_id":"x1","attr_num":"5","text":"a7bcbold","tag":"DIV","node_kinds":[3,3,3,3,1],"on_wired":true,"no_attrs_ok":true}
```
  `on_wired:true` = click listener wired via `on:{click}` fires on `.click()`; attrs (`class`,`id`,`data-n` numeric→string) set; arrays flattened (`b`,`c`,`b-bold` all present); `node_kinds` shows text nodes (3) plus element (1). Nullish args (`null,undefined,false`) produced no nodes — probe's own `children_count=5` labels the field `nullish_skipped:false` only because my probe's hardcoded expected count was wrong (5 nodes from `'a',7,'b','c',<b>` is correct); behavior is correct, probe label was mine, not a code defect.

### 4. Scope
`git status --porcelain src/ui/ test/harness/` → only `?? src/ui/h.js` and `?? test/harness/h.html` (new, untracked); zero view edits, matches RB2 ownership (decisions.md:183). No tests added for h() beyond the harness — acceptable for RB2's stated harness scope.

## Findings
1. (info) Contract fully matches freeze; every clause verified by code quote + live probe.
2. (minor) Harness verifies listener *invocation* only implicitly (`tree.click()`, h.html:41) — clickCount is never asserted. Independent probe covered wiring (`on_wired:true`), so no gap in this review; add a `clickCount===1` assertion if the harness is to be re-run standalone.
3. (minor, non-blocking) `attrs` non-object values are silently ignored (h.js:14); matches "attrs?" optional intent, no caller impact.
4. No regressions: `src/ui/` has no modified tracked files; no other module imports `h.js` yet.
5. No missed edge cases found: arrays nested arbitrarily, numeric children, `false` skip, non-Node objects ignored, tag-as-Element supported.

Artifact: `.autoforge/reviews/M-RB2.md`
