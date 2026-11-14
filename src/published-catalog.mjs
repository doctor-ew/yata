import { validateCatalog, MAX_IMPORT_BYTES } from "./domain.mjs";
export const PUBLISHED_MANIFEST_PATH = "data/published-catalog-manifest.json";
const REVISION = /^[a-f0-9]{64}$/;
export function catalogCounts(catalog) {
  return {
    shows: catalog.shows.length,
    episodes: catalog.shows.reduce((n, s) => n + s.episodes.length, 0),
    sources: catalog.shows.reduce(
      (n, s) => n + s.episodes.reduce((m, e) => m + e.sources.length, 0),
      0,
    ),
  };
}
export function validatePublishedManifest(raw) {
  if (
    !raw ||
    raw.version !== 1 ||
    !REVISION.test(raw.revision) ||
    raw.catalog !== `data/catalogs/${raw.revision}.json` ||
    typeof raw.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(raw.updatedAt))
  )
    throw Error("Invalid shared catalog manifest.");
  const counts = raw.counts;
  if (
    !counts ||
    !Number.isInteger(counts.shows) ||
    counts.shows < 1 ||
    counts.shows > 100 ||
    !Number.isInteger(counts.episodes) ||
    counts.episodes < 0 ||
    counts.episodes > 5000 ||
    !Number.isInteger(counts.sources) ||
    counts.sources < 0 ||
    counts.sources > 100000
  )
    throw Error("Invalid shared catalog counts.");
  return {
    version: 1,
    revision: raw.revision,
    catalog: raw.catalog,
    updatedAt: raw.updatedAt,
    counts: {
      shows: counts.shows,
      episodes: counts.episodes,
      sources: counts.sources,
    },
  };
}
export async function snapshotRevision(text, cryptoRef = globalThis.crypto) {
  const digest = await cryptoRef.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
export async function fetchPublishedCatalog({
  fetcher = globalThis.fetch,
  currentRevision = null,
  manifestUrl = PUBLISHED_MANIFEST_PATH,
  cryptoRef = globalThis.crypto,
} = {}) {
  const response = await fetcher(manifestUrl, {
    cache: "no-store",
    credentials: "omit",
  });
  if (response.status === 404)
    return {
      available: false,
      unchanged: false,
      revision: null,
      manifest: null,
      catalog: null,
    };
  if (!response.ok) throw Error("The shared catalog could not be loaded.");
  const manifest = validatePublishedManifest(await response.json());
  if (manifest.revision === currentRevision)
    return {
      available: true,
      unchanged: true,
      revision: manifest.revision,
      manifest,
      catalog: null,
    };
  const result = await fetcher(manifest.catalog, {
    cache: "force-cache",
    credentials: "omit",
  });
  if (!result.ok)
    throw Error("The shared catalog snapshot could not be loaded.");
  const text = await result.text();
  if (
    new TextEncoder().encode(text).length > MAX_IMPORT_BYTES ||
    (await snapshotRevision(text, cryptoRef)) !== manifest.revision
  )
    throw Error("The shared catalog snapshot failed its integrity check.");
  const catalog = validateCatalog(JSON.parse(text));
  const counts = catalogCounts(catalog);
  if (Object.keys(counts).some((key) => counts[key] !== manifest.counts[key]))
    throw Error("The shared catalog counts do not match its manifest.");
  return {
    available: true,
    unchanged: false,
    revision: manifest.revision,
    manifest,
    catalog,
  };
}
// Published content is authoritative. Only local playback preferences survive;
// previous shows, exclusions and draft fields cannot add content to the master.
export function mergePublishedCatalog(master, previous) {
  const next = validateCatalog(master);
  delete next.publishedRevision;
  if (!previous || !previous.settings) return next;
  next.settings.streamShow = null;
  for (const key of [
    "channel",
    "bumpers",
    "rotation",
    "shuffleSeed",
    "storiesPerTurn",
    "commercialCount",
  ]) {
    if (!Object.hasOwn(previous.settings, key)) continue;
    try {
      next.settings = validateCatalog({
        ...next,
        settings: { ...next.settings, [key]: previous.settings[key] },
      }).settings;
    } catch {
      /* Ignore only the invalid viewer preference. */
    }
  }
  const custom = previous.settings.streamShows;
  if (Array.isArray(custom) && custom.length && next.settings.channel === 'mixed') {
    const surviving = custom.filter(sid => next.shows.some(show => show.id === sid));
    try { if (surviving.length) next.settings = validateCatalog({...next, settings:{...next.settings, streamShow:null,streamShows:surviving}}).settings; } catch { /* Invalid personal selections cannot change the master. */ }
  }
  const selected = next.settings.streamShows ? null : previous.settings.streamShow;
  if (
    selected !== null &&
    typeof selected === "string" &&
    next.shows.some(
      (show) =>
        show.id === selected &&
        (next.settings.channel === "mixed" ||
          show.channel === next.settings.channel),
    )
  ) {
    try {
      next.settings = validateCatalog({
        ...next,
        settings: { ...next.settings, streamShow: selected },
      }).settings;
    } catch {
      /* Removed or invalid selections return to the channel mix. */
    }
  }
  if (Number.isFinite(previous.epoch) && previous.epoch >= 0)
    next.epoch = previous.epoch;
  return validateCatalog(next);
}
