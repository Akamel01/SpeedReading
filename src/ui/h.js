// DOM builder small helper (ESM)
// Exports: export function h(tag, attrs, ...children)
// - tag: string tag name
// - attrs: optional object with:
//    - class (string): CSS class name
//    - on (object): event name -> handler function (used with addEventListener)
//    - any other attributes set via setAttribute
// - children: strings, DOM Nodes, or nested arrays (flattened)
// Note: no DOM access at import time; document is used only when h() is invoked.
export function h(tag, attrs, ...children) {
  // Create the element lazily; avoid touching DOM at import time
  const el = typeof tag === 'string' ? document.createElement(tag) : tag;

  if (attrs && typeof attrs === 'object') {
    const { class: className, on, ...rest } = attrs;
    if (className != null) {
      el.className = className;
    }
    if (on && typeof on === 'object') {
      for (const [evt, handler] of Object.entries(on)) {
        if (typeof handler === 'function') {
          el.addEventListener(evt, handler);
        }
      }
    }
    for (const [key, value] of Object.entries(rest)) {
      // set as attribute; string/number values are supported
      if (value != null) {
        el.setAttribute(key, String(value));
      }
    }
  }

  const appendChild = (child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(appendChild);
      return;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
      return;
    }
    if (child instanceof Node) {
      el.appendChild(child);
      return;
    }
    // If someone passes a plain object, ignore (non-Node)
  };

  for (const c of children) {
    appendChild(c);
  }

  return el;
}
