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
  const VERSION = 1;

  const req = win.open(DB_NAME, VERSION);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    const stores = ['texts', 'quizzes', 'sessions', 'settings'];
    for (const s of stores) {
      if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    }
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
    return { schemaVersion: 1, texts, quizzes, sessions, settings };
  };

  const STORES = ['texts', 'quizzes', 'sessions', 'settings'];

  // Review fix: validate everything BEFORE clearing; replace atomically in one transaction.
  api.importAll = async (json) => {
    if (!json || json.schemaVersion !== 1) return { ok: false, error: 'schema-mismatch' };
    for (const field of STORES) {
      if (json[field] !== undefined && !Array.isArray(json[field])) {
        return { ok: false, error: `invalid-field:${field}` };
      }
    }
    try {
      const tx = db.transaction(STORES, 'readwrite');
      for (const name of STORES) {
        const os = tx.objectStore(name);
        os.clear();
        for (const rec of json[name] || []) os.put(rec);
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
