import { validateCatalog, MAX_IMPORT_BYTES, MAX_CATALOG_SHOWS, MAX_CATALOG_EPISODES } from "./domain.mjs";
import { CHANNEL_REGISTRY_CAPABILITY, MAX_CHANNELS } from "./channel-registry.mjs";
export const LEGACY_PUBLISHED_MANIFEST_PATH = "data/published-catalog-manifest.json";
export const PUBLISHED_MANIFEST_PATH = "data/published-catalog-v2-manifest.json";
export const REGISTRY_MANIFEST_PATH = "data/published-catalog-v3-manifest.json";
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
    ![1, 2].includes(raw.version) ||
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
    counts.shows > MAX_CATALOG_SHOWS ||
    !Number.isInteger(counts.episodes) ||
    counts.episodes < 0 ||
    counts.episodes > MAX_CATALOG_EPISODES ||
    !Number.isInteger(counts.sources) ||
    counts.sources < 0 ||
    counts.sources > 100000
  )
    throw Error("Invalid shared catalog counts.");
  if (raw.version === 2 && (
    !Array.isArray(raw.requires) || raw.requires.length !== 1 || raw.requires[0] !== CHANNEL_REGISTRY_CAPABILITY ||
    !Array.isArray(raw.channelIds) || raw.channelIds.length < 9 || raw.channelIds.length > MAX_CHANNELS ||
    new Set(raw.channelIds).size !== raw.channelIds.length ||
    raw.channelIds.some(id => typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(id) || ['all','none','library','movies','custom','arcade','constructor','prototype'].includes(id))
  )) throw Error("Unsupported shared channel registry contract.");
  return {
    version: raw.version,
    ...(raw.version === 2 ? {requires:[...raw.requires],channelIds:[...raw.channelIds]} : {}),
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
  manifestUrl = REGISTRY_MANIFEST_PATH,
  cryptoRef = globalThis.crypto,
} = {}) {
  const response = await fetcher(manifestUrl, {
    cache: "no-store",
    credentials: "omit",
  });
  if (response.status === 404 && manifestUrl === REGISTRY_MANIFEST_PATH)
    return fetchPublishedCatalog({fetcher,currentRevision,manifestUrl:PUBLISHED_MANIFEST_PATH,cryptoRef});
  if (response.status === 404 && manifestUrl === PUBLISHED_MANIFEST_PATH)
    return fetchPublishedCatalog({fetcher,currentRevision,manifestUrl:LEGACY_PUBLISHED_MANIFEST_PATH,cryptoRef});
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
  if (manifestUrl === REGISTRY_MANIFEST_PATH && manifest.version !== 2) throw Error("Registry feed requires a version-2 manifest.");
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
  validateRegistryManifestCatalog(manifest, catalog);
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
    "channelRemixes",
    "storiesPerTurn",
    "commercialCount",
    "mixChannels",
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
  const savedCustom=previous.settings.customShows??previous.settings.streamShows;
  if(Array.isArray(savedCustom)&&savedCustom.length){const surviving=savedCustom.filter(id=>next.shows.some(s=>s.id===id));try{if(surviving.length)next.settings=validateCatalog({...next,settings:{...next.settings,customShows:surviving,customTitle:previous.settings.customTitle??'Your Channel',customSeed:previous.settings.customSeed??previous.settings.shuffleSeed,customEpoch:previous.settings.customEpoch??previous.epoch,customRotation:previous.settings.customRotation??previous.settings.rotation}}).settings;}catch{/* Removed or invalid saved shows cannot change the shared catalog. */}}
  if(previous.settings.customQueue?.length){try{next.settings=validateCatalog({...next,settings:{...next.settings,customQueue:previous.settings.customQueue,customMode:previous.settings.customMode??'episodes',customQueueActive:previous.settings.customQueueActive===true}}).settings;}catch{/* Invalid local queue cannot alter shared content. */}}
  const selected = next.settings.streamShows ? null : previous.settings.streamShow;
  const moved=next.shows.find(show=>show.id===selected);
  if (moved && previous.settings.channel !== 'mixed') next.settings.channel = moved.channel;
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

export function validateRegistryManifestCatalog(manifest, catalog) {
  if (manifest.version === 2) {
    if (!catalog.channelRegistry || JSON.stringify(manifest.channelIds) !== JSON.stringify(catalog.channelRegistry.channels.map(c => c.id)))
      throw Error('Shared channel registry does not match its manifest.');
  } else if (catalog.channelRegistry) throw Error('Registry catalog requires a registry manifest.');
}
