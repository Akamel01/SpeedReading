# Canonical tokens (frozen, pass 3)

CSS-ready. Single source for the implementation tickets.

```css
:root {
  --folio: #F6F4EC;
  --iron: #1A1815;
  --marker: #FFDD33;
  --pencil: #82858A;
  --rule: #E3DED2;
  --oxblood: #A93226;
  --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --font-ui: system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-data: ui-monospace, "SF Mono", Menlo, monospace;
  --font-scale: 1;
  --text-align: center;
  --ease-calm: cubic-bezier(0.2, 0, 0, 1);
  --dur-view: 180ms;
  --dur-press: 100ms;
  --dur-tick: 240ms;
  --dur-status: 150ms;
}
```

Type: display clamp(1.75rem,4vw,2.75rem)/1.05/-0.015em/600; RSVP 2rem/1.4/500; body 1rem/1.5; captions 0.8125rem/1.4/+0.01em pencil; data mono tabular-nums.
Surfaces: header rgba(246,244,236,0.72) + blur(16px) saturate(140%); page card solid + rule + `0 12px 32px rgba(26,24,21,0.08)`.
Fallbacks: reduced-motion → opacity ≤150ms, no transform; reduced-transparency → solid header; contrast-more → 1px iron control borders.
