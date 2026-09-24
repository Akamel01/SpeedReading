// Profile repository for SpeedReading persistence v2
// Stores a single profile object in the 'profile' objectStore keyed by 'id'.

export function createProfileRepository(store, { profileId = 'local' } = {}) {
  const ensureProfile = async () => {
    // Load existing profile or create a defaults if missing/corrupt
    const all = await store.getAll('profile');
    let p = all && all.length ? all.find((x) => x?.id === 'local') : null;
    if (!p) {
      const now = new Date().toISOString();
      p = {
        id: 'local',
        profileId,
        schemaVersion: 2,
        seenAchievements: [],
        activeSession: null,
        uiPrefs: {},
        createdAt: now,
        updatedAt: now,
      };
      try {
        await store.put('profile', p);
      } catch {
        // ignore write errors; defaults will still be used
      }
    }
    return p;
  };

  let cached;
  const load = async () => {
    try {
      const all = await store.getAll('profile');
      const p = all.find((x) => x?.id === 'local');
      if (!p || typeof p !== 'object' || p.schemaVersion !== 2) {
        // Corrupt/missing: return defaults with recovered flag
        const now = new Date().toISOString();
        cached = {
          id: 'local',
          profileId,
          schemaVersion: 2,
          seenAchievements: [],
          activeSession: null,
          uiPrefs: {},
          createdAt: now,
          updatedAt: now,
          recovered: true,
        };
        return cached;
      }
      cached = p;
      return cached;
    } catch {
      const now = new Date().toISOString();
      cached = {
        id: 'local',
        profileId,
        schemaVersion: 2,
        seenAchievements: [],
        activeSession: null,
        uiPrefs: {},
        createdAt: now,
        updatedAt: now,
        recovered: true,
      };
      return cached;
    }
  };

  const save = async (patch) => {
    const p = (await load()) || {};
    const now = new Date().toISOString();
    const next = { ...p, ...patch, updatedAt: now };
    await store.put('profile', next);
    cached = next;
    return next;
  };

  const markSeen = async (ids) => {
    if (!Array.isArray(ids)) return load();
    const p = await load();
    const seen = new Set(p.seenAchievements || []);
    for (const id of ids) seen.add(id);
    return save({ seenAchievements: Array.from(seen) });
  };

  const getActiveSession = async () => {
    const p = await load();
    return p.activeSession ?? null;
  };

  const setActiveSession = async (snapshot) => {
    await save({ activeSession: snapshot ?? null });
  };

  const setUiPrefs = async (partial) => {
    await save({ uiPrefs: { ...((await load())?.uiPrefs ?? {}), ...partial } });
  };

  return {
    load,
    save,
    markSeen,
    getActiveSession,
    setActiveSession,
    setUiPrefs,
  };
}
