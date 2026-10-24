(function (global) {
  const DB_NAME = "golf-skip-pwa";
  const DB_VER = 1;
  const STORE = "state";
  const KEY = "latest";
  const LS_KEY = "golfSkipPwa.v1";

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("no idb"));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function save(state) {
    const payload = {
      savedAt: new Date().toISOString(),
      ...state,
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ meta: payload.meta, savedAt: payload.savedAt }));
    } catch (e) {
      /* ignore quota on meta-only */
    }
    try {
      const db = await idbOpen();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(payload, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      try {
        localStorage.setItem(LS_KEY + ".full", JSON.stringify(payload));
      } catch (e2) {
        console.warn("Could not persist full analysis", e2);
      }
    }
    return payload;
  }

  async function load() {
    try {
      const db = await idbOpen();
      const row = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (row) return row;
    } catch (e) {
      /* fall through */
    }
    try {
      const raw = localStorage.getItem(LS_KEY + ".full");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  global.GolfStore = { save, load };
})(window);
