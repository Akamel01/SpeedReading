// Lightweight IndexedDB wrapper for SpeedReading ADR-2
// - openStore(): returns a Promise<Store> with methods: put/getAll/get/del/exportAll/importAll
// - No DOM access at import time; all IndexedDB access is lazy per call
// - Stores: texts, quizzes, sessions, settings; keyPath: id
// - This file is intentionally small and dependency-free.

export async function openStore() {
  if (typeof globalThis.indexedDB === 'undefined' && typeof indexedDB === 'undefined') {
    // In non-browser environments this will fail at runtime if used; importing is safe.
    throw new Error('IndexedDB is not available in this environment');
  }

  const win = typeof indexedDB !== 'undefined' ? indexedDB : globalThis.indexedDB;
  const DB_NAME = 'speedread';
  const VERSION = 2;

  const req = win.open(DB_NAME, VERSION);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    // Additive upgrade: preserve existing stores; add profile store if missing
    const stores = ['texts', 'quizzes', 'sessions', 'settings'];
    for (const s of stores) {
      if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('profile')) db.createObjectStore('profile', { keyPath: 'id' });
  };

  const db = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const withStore = (storeName, mode, fn) => {
    try {
      const tx = db.transaction(storeName, mode);
      const os = tx.objectStore(storeName);
      return fn(os);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  // Review fix: writes resolve only when the transaction commits (no pre-commit resolve, no silent abort).
  const runWrite = (storeName, fn) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const os = tx.objectStore(storeName);
      const result = fn(os);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error(`IndexedDB write failed: ${storeName}`));
        tx.onabort = () => reject(tx.error || new Error(`IndexedDB write aborted: ${storeName}`));
      });
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const api = {};
  api.put = (store, rec) => runWrite(store, (os) => {
    os.put(rec);
    return rec;
  });
  api.get = (store, id) => withStore(store, 'readonly', os => new Promise((res, rej) => {
    const req = os.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));
  api.getAll = store => withStore(store, 'readonly', os => new Promise((res, rej) => {
    const req = os.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));
  api.del = (store, id) => runWrite(store, (os) => {
    os.delete(id);
    return undefined;
  });

  api.exportAll = async () => {
    const texts = await api.getAll('texts');
    const quizzes = await api.getAll('quizzes');
    const sessions = await api.getAll('sessions');
    const settings = await api.getAll('settings');
    // v2 schema export includes profile as a single object (or null)
    const profs = await api.getAll('profile');
    return { schemaVersion: 2, texts, quizzes, sessions, settings, profile: profs[0] ?? null };
  };

  const STORES = ['texts', 'quizzes', 'sessions', 'settings'];

  // Helper: ensure a single, additive upgrade path for v1 -> v2
  const ensureUpgradeFromV1 = (json) => {
    // Wrap v1 payload into v2 shape by copying fields that exist.
    const out = {
      texts: json?.texts ?? [],
      quizzes: json?.quizzes ?? [],
      sessions: json?.sessions ?? [],
      settings: json?.settings ?? [],
    };
    return out;
  };

  // Review fix: validate everything BEFORE clearing; replace atomically in one transaction.
  api.importAll = async (json) => {
    // Support both v2 and v1 payloads. Additive upgrade path for v1.
    if (!json) return { ok: false, error: 'schema-mismatch' };
    let normalized = null;
    if (json.schemaVersion === 2) {
      // Validate v2 structure lightly
      for (const field of [...STORES, 'profile']) {
        if (json[field] !== undefined && !Array.isArray(json[field]) && field !== 'profile') {
          // profile is accepted as a single object in the export, but during import we expect arrays for stores
          if (field === 'profile') continue;
          return { ok: false, error: `invalid-field:${field}` };
        }
      }
      // Build a flat replacement of arrays for transactional import
      normalized = {
        texts: json.texts ?? [],
        quizzes: json.quizzes ?? [],
        sessions: json.sessions ?? [],
        settings: json.settings ?? [],
      };
      // profile is optional in import for v2; we apply a separate path below if provided
    } else if (json.schemaVersion === 1) {
      normalized = ensureUpgradeFromV1(json);
      for (const field of STORES) {
        if (normalized[field] !== undefined && !Array.isArray(normalized[field])) {
          return { ok: false, error: `invalid-field:${field}` };
        }
      }
    } else {
      return { ok: false, error: 'schema-mismatch' };
    }

    // Validate every record BEFORE any destructive write (ADR-23).
    for (const name of STORES) {
      const list = Array.isArray(normalized[name]) ? normalized[name] : [];
      for (let i = 0; i < list.length; i++) {
        const rec = list[i];
        if (!rec || typeof rec !== 'object' || Array.isArray(rec) || rec.id === undefined || rec.id === null) {
          return { ok: false, error: `invalid-record:${name}[${i}]` };
        }
      }
    }

    try {
      const txStores = [...STORES];
      if (json.profile !== undefined) txStores.push('profile');
      const tx = db.transaction(txStores, 'readwrite');
      // Clear and populate textual stores
      for (const name of STORES) {
        const os = tx.objectStore(name);
        os.clear();
        // Deduplicate by id
        const seen = new Map();
        for (const rec of normalized[name] || []) {
          if (rec && rec.id != null) seen.set(rec.id, rec);
        }
        for (const rec of seen.values()) os.put(rec);
      }
      if (json.profile !== undefined) {
        const osp = tx.objectStore('profile');
        // normalize to a single profile record if array provided
        const profs = Array.isArray(json.profile) ? json.profile : [json.profile];
        osp.clear();
        for (const p of profs) if (p && p.id) osp.put(p);
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB import failed'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB import aborted'));
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : 'import-failed' };
    }
  };

  return api;
}
