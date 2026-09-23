// Accessibility helpers for SpeedReading shell module

// Returns true if user prefers reduced motion
export function prefersReducedMotion() {
  try {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Announce a message into the live region if present
export function announce(message, { politeness = 'polite' } = {}) {
  try {
    const live = document.getElementById('live-region');
    if (!live) return;
    // Ensure string value
    live.textContent = String(message);
    // Re-set aria-live if needed to enforce politeness level (some browsers honor as-is)
    live.setAttribute('aria-live', politeness);
  } catch {
    // swallow: no side effects if DOM not ready
  }
}

// Focus the main app container (if present)
export function focusMain() {
  try {
    const app = document.getElementById('app');
    if (app && typeof app.focus === 'function') {
      app.focus();
    }
  } catch {
    // ignore
  }
}
