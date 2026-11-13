export const COMMERCIAL_DEFAULTS_STORAGE_KEY = 'yata.commercial-default.v2';

// Call after successfully saving an explicit commercial-break choice.
export function markCommercialPreference(storage) {
  try {
    storage.setItem(COMMERCIAL_DEFAULTS_STORAGE_KEY, '1');
    return storage.getItem(COMMERCIAL_DEFAULTS_STORAGE_KEY) === '1';
  } catch { return false; }
}

// save must persist the supplied catalog and return true on success.
// The completion marker is written only after the catalog save succeeds.
export function applyCommercialDefaults(catalog, storage, save) {
  const unchanged = markerRecorded => ({ catalog, changed: false, markerRecorded });
  try {
    if (storage.getItem(COMMERCIAL_DEFAULTS_STORAGE_KEY) === '1') return unchanged(true);
  } catch { return unchanged(false); }

  if (catalog.settings.bumpers === true) return unchanged(markCommercialPreference(storage));
  const next = { ...catalog, settings: { ...catalog.settings, bumpers: true } };
  try {
    if (save(next) !== true) return unchanged(false);
  } catch { return unchanged(false); }
  if (markCommercialPreference(storage)) return { catalog: next, changed: true, markerRecorded: true };

  // Do not repeatedly override a saved Off choice when marker persistence fails.
  // Restore the previous catalog if the attempted migration cannot be recorded.
  try { if (save(catalog) === true) return unchanged(false); } catch { /* Report the persisted migration below. */ }
  return { catalog: next, changed: true, markerRecorded: false };
}
