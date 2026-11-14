import { readCatalog, saveCatalog, STORAGE_KEY } from './domain.mjs';
export const CATALOG_WRITE_LOCK = 'yata.catalog.writer.v1';
export class CatalogConflict extends Error {
  constructor() { super('Another tab saved a newer catalog. Your change was not written. Export this tab’s changes before reloading the saved catalog.'); this.name = 'CatalogConflict'; }
}
// Web Locks serialize cooperating tabs. The snapshot check also rejects stale
// drafts; it is not a compare-and-swap guarantee against older unlocked clients.
export async function openCatalogStore({storage, locks, seed, prepare}) {
  let current, expected, loaded;
  let writable = typeof locks?.request === 'function';
  const initialize = () => {
    loaded = readCatalog(storage, seed, {persistMigration:writable}); current = loaded.catalog;
    if (writable && !loaded.error && prepare) current = prepare(current);
    try { expected = storage.getItem(STORAGE_KEY); } catch { expected = undefined; }
  };
  if (writable) {
    try { await locks.request(CATALOG_WRITE_LOCK, {mode:'exclusive'}, initialize); }
    catch { writable=false; initialize(); }
  } else initialize();
  return {
    loaded, writable, get catalog() { return current; },
    async save(next, base = current) {
      if (!writable) throw new Error('Catalog changes are read-only because this browser cannot safely coordinate tabs. Playback and export remain available.');
      const snapshot = expected;
      if (base !== current) throw new CatalogConflict();
      return locks.request(CATALOG_WRITE_LOCK, {mode:'exclusive'}, () => {
        if (snapshot === undefined || storage.getItem(STORAGE_KEY) !== snapshot || expected !== snapshot) throw new CatalogConflict();
        const saved = saveCatalog(storage, next);
        expected = JSON.stringify(saved); current = saved;
        return saved;
      });
    },
    isStale() { try { return storage.getItem(STORAGE_KEY) !== expected; } catch { return true; } },
  };
}
