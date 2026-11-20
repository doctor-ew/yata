import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateCatalog, MAX_IMPORT_BYTES } from "../src/domain.mjs";
import { createSeed } from "../src/catalog.mjs";
import {
  catalogCounts,
  validatePublishedManifest,
  PUBLISHED_MANIFEST_PATH, REGISTRY_MANIFEST_PATH, validateRegistryManifestCatalog,
} from "../src/published-catalog.mjs";
import { CHANNEL_REGISTRY_CAPABILITY, assertRegistryEvolution, compatibilityCatalog } from "../src/channel-registry.mjs";
const exec = promisify(execFile);
const REVISION = /^[a-f0-9]{64}$/;
export class PublicationError extends Error {
  constructor(message, code = "PUBLISH_FAILED", status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function frozenCatalog(input) {
  const draft = { ...input };
  delete draft.publishedRevision;
  let catalog;
  try {
    catalog = validateCatalog(draft);
  } catch (error) {
    throw new PublicationError(error.message, "INVALID_CATALOG", 400);
  }
  // The shared clock remains stable. Playback preferences and deletion history
  // stay local to the owner; validation has already cloned all catalog data.
  catalog.settings = { ...createSeed().settings };
  delete catalog.exclusions;
  const text = JSON.stringify(catalog) + "\n";
  if (Buffer.byteLength(text) > MAX_IMPORT_BYTES)
    throw new PublicationError(
      "Catalog exceeds the shared publication size limit.",
      "INVALID_CATALOG",
      400,
    );
  return {
    catalog,
    text,
    revision: createHash("sha256").update(text).digest("hex"),
    counts: catalogCounts(catalog),
  };
}
export function publicationDiff(previous, next) {
  const before = new Map((previous?.shows || []).map((s) => [s.id, s])),
    after = new Map(next.shows.map((s) => [s.id, s]));
  const label = (s) => ({ id: s.id, title: s.title });
  const episodes = (c) =>
    new Map(
      (c?.shows || []).flatMap((s) =>
        s.episodes.map((e) => [
          `${s.id}\0${e.id}`,
          { showId: s.id, id: e.id, title: e.title },
        ]),
      ),
    );
  const sources = (c) =>
    new Map(
      (c?.shows || []).flatMap((s) =>
        s.episodes.flatMap((e) =>
          e.sources.map((source) => [
            `${s.id}\0${e.id}\0${source.url}`,
            { showId: s.id, episodeId: e.id, url: source.url },
          ]),
        ),
      ),
    );
  const diff = (a, b) =>
    [...b].filter(([key]) => !a.has(key)).map(([, value]) => value);
  const oldEpisodes = episodes(previous),
    newEpisodes = episodes(next),
    oldSources = sources(previous),
    newSources = sources(next);
  return {
    addedShows: diff(before, after).map(label),
    removedShows: diff(after, before).map(label),
    changedShows: [...after]
      .filter(
        ([id, show]) =>
          before.has(id) &&
          JSON.stringify(before.get(id)) !== JSON.stringify(show),
      )
      .map(([, show]) => label(show)),
    addedEpisodes: diff(oldEpisodes, newEpisodes),
    removedEpisodes: diff(newEpisodes, oldEpisodes),
    addedSources: diff(oldSources, newSources),
    removedSources: diff(newSources, oldSources),
  };
}
export async function readPublisherConfig() {
  return JSON.parse(
    await readFile(
      new URL("../deploy/aws-static.json", import.meta.url),
      "utf8",
    ),
  );
}
function validConfig(config) {
  if (
    !config ||
    !/^\d{12}$/.test(config.account) ||
    !config.region ||
    !config.bucket ||
    !config.distribution ||
    !/^\/[a-z0-9/_-]+\/$/.test(config.base) ||
    config.base.includes("..")
  )
    throw new PublicationError("Shared publishing configuration is invalid.");
  return config;
}
function awsCode(error) {
  const text = String(error?.stderr || "");
  for (const code of [
    "NoSuchKey",
    "NotFound",
    "PreconditionFailed",
    "ConditionalRequestConflict",
  ])
    if (error?.code === code || text.includes(`(${code})`)) return code;
  return null;
}
const stale = () =>
  new PublicationError(
    "Shared catalog changed. Review the latest publication before trying again.",
    "STALE_PUBLICATION",
    409,
  );
export function createCatalogPublisher({
  config,
  runAws,
  manifestPath = PUBLISHED_MANIFEST_PATH,
  clock = () => new Date(),
} = {}) {
  const setup = async () =>
    validConfig(config || (await readPublisherConfig()));
  const invoke = async (c, args) => {
    try {
      if (runAws)
        return await runAws([
          ...args,
          "--region",
          c.region,
          "--output",
          "json",
        ]);
      const result = await exec(
        "aws",
        [...args, "--region", c.region, "--output", "json"],
        { maxBuffer: 2_000_000, timeout: 120000 },
      );
      return JSON.parse(result.stdout || "{}");
    } catch (error) {
      const code = awsCode(error);
      if (code) throw Object.assign(new Error(code), { code });
      throw new PublicationError(
        "Shared publishing is unavailable. Check local AWS configuration.",
      );
    }
  };
  const identity = async (c) => {
    const result = await invoke(c, ["sts", "get-caller-identity"]);
    if (result.Account !== c.account)
      throw new PublicationError(
        "AWS account does not match the publication configuration.",
        "ACCOUNT_MISMATCH",
        403,
      );
  };
  const temporary = async (callback) => {
    const dir = await mkdtemp(path.join(tmpdir(), "yata-publication-"));
    try {
      return await callback(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
  const object = async (c, key, file) =>
    invoke(c, [
      "s3api",
      "get-object",
      "--bucket",
      c.bucket,
      "--key",
      key,
      "--expected-bucket-owner",
      c.account,
      file,
    ]);
  async function current(c, dir, withCatalog = false) {
    const file = path.join(dir, "manifest.json");
    let result;
    try {
      result = await object(c, c.base.slice(1) + manifestPath, file);
    } catch (error) {
      if (["NoSuchKey", "NotFound"].includes(error.code))
        return { manifest: null, etag: null, catalog: null };
      throw error;
    }
    const text = await readFile(file, "utf8");
    if (Buffer.byteLength(text) > 8192)
      throw new PublicationError("Shared catalog manifest is invalid.");
    let manifest;
    try {
      manifest = validatePublishedManifest(JSON.parse(text));
      if (manifestPath === REGISTRY_MANIFEST_PATH && manifest.version !== 2) throw Error("Invalid registry feed version.");
    } catch {
      throw new PublicationError("Shared catalog manifest is invalid.");
    }
    if (typeof result.ETag !== "string" || !result.ETag)
      throw new PublicationError(
        "Shared catalog manifest has no concurrency version.",
      );
    let catalog = null;
    if (withCatalog) {
      const snapshot = path.join(dir, "previous.json");
      await object(c, c.base.slice(1) + manifest.catalog, snapshot);
      const body = await readFile(snapshot, "utf8");
      if (
        Buffer.byteLength(body) > MAX_IMPORT_BYTES ||
        createHash("sha256").update(body).digest("hex") !== manifest.revision
      )
        throw new PublicationError(
          "Shared catalog snapshot failed its integrity check.",
        );
      try {
        catalog = validateCatalog(JSON.parse(body));
      } catch {
        throw new PublicationError("Shared catalog snapshot is invalid.");
      }
      validateRegistryManifestCatalog(manifest, catalog);
      const counts = catalogCounts(catalog);
      if (Object.keys(counts).some((k) => counts[k] !== manifest.counts[k]))
        throw new PublicationError("Shared catalog counts are invalid.");
    }
    return { manifest, etag: result.ETag, catalog };
  }
  return {
    async capability() {
      const c = await setup();
      await identity(c);
      return temporary(async (dir) => ({
        baseRevision: (await current(c, dir)).manifest?.revision || null,
      }));
    },
    async shared() {
      const c = await setup();
      await identity(c);
      return temporary(async (dir) => {
        const result = await current(c, dir, true);
        return {
          available: !!result.manifest,
          unchanged: false,
          revision: result.manifest?.revision || null,
          manifest: result.manifest,
          catalog: result.catalog,
        };
      });
    },
    async preview(input, { expectedRevision } = {}) {
      const snapshot = frozenCatalog(input),
        c = await setup();
      await identity(c);
      return temporary(async (dir) => {
        const previous = await current(c, dir, true);
        const baseRevision = previous.manifest?.revision || null;
        if (expectedRevision !== undefined && expectedRevision !== baseRevision)
          throw stale();
        return {
          ...snapshot,
          baseRevision,
          diff: publicationDiff(previous.catalog, snapshot.catalog),
        };
      });
    },
    async publishFile(file, options) {
      const text = await readFile(file, "utf8");
      if (Buffer.byteLength(text) > MAX_IMPORT_BYTES)
        throw new PublicationError(
          "Catalog exceeds the shared publication size limit.",
          "INVALID_CATALOG",
          400,
        );
      return this.publish(JSON.parse(text), options);
    },
    async publish(input, { expectedRevision, reviewedRevision } = {}) {
      if (expectedRevision !== null && !REVISION.test(expectedRevision || ""))
        throw new PublicationError(
          "An expected publication revision is required.",
          "INVALID_REVISION",
          400,
        );
      const snapshot = frozenCatalog(input);
      if (
        reviewedRevision !== undefined &&
        reviewedRevision !== snapshot.revision
      )
        throw new PublicationError(
          "Catalog changed after review. Preview it again before publishing.",
          "REVIEW_CHANGED",
          409,
        );
      const c = await setup();
      await identity(c);
      return temporary(async (dir) => {
        const previous = await current(c, dir),
          baseRevision = previous.manifest?.revision || null;
        if (baseRevision === snapshot.revision)
          return {
            ...previous.manifest,
            manifestPath: manifestPath,
            invalidationId: null,
            cacheInvalidationPending: false,
            unchanged: true,
          };
        if (expectedRevision !== baseRevision) throw stale();
        const relative = `data/catalogs/${snapshot.revision}.json`,
          key = c.base.slice(1) + relative,
          snapshotFile = path.join(dir, "snapshot.json");
        await writeFile(snapshotFile, snapshot.text, { mode: 0o600 });
        try {
          await invoke(c, [
            "s3api",
            "put-object",
            "--bucket",
            c.bucket,
            "--key",
            key,
            "--expected-bucket-owner",
            c.account,
            "--body",
            snapshotFile,
            "--content-type",
            "application/json",
            "--cache-control",
            "public, max-age=31536000, immutable",
            "--if-none-match",
            "*",
          ]);
        } catch (error) {
          if (
            !["PreconditionFailed", "ConditionalRequestConflict"].includes(
              error.code,
            )
          )
            throw error;
          const existing = path.join(dir, "existing.json");
          await object(c, key, existing);
          if (
            createHash("sha256")
              .update(await readFile(existing))
              .digest("hex") !== snapshot.revision
          )
            throw new PublicationError(
              "An immutable catalog snapshot has unexpected content.",
            );
        }
        let manifest = {
            version: snapshot.catalog.channelRegistry ? 2 : 1,
            ...(snapshot.catalog.channelRegistry ? {requires:[CHANNEL_REGISTRY_CAPABILITY],channelIds:snapshot.catalog.channelRegistry.channels.map(c=>c.id)} : {}),
            revision: snapshot.revision,
            catalog: relative,
            updatedAt: clock().toISOString(),
            counts: snapshot.counts,
          },
          manifestFile = path.join(dir, "new-manifest.json");
        await writeFile(manifestFile, JSON.stringify(manifest) + "\n", {
          mode: 0o600,
        });
        try {
          await invoke(c, [
            "s3api",
            "put-object",
            "--bucket",
            c.bucket,
            "--key",
            c.base.slice(1) + manifestPath,
            "--expected-bucket-owner",
            c.account,
            "--body",
            manifestFile,
            "--content-type",
            "application/json",
            "--cache-control",
            "no-cache, max-age=0, must-revalidate",
            ...(previous.etag
              ? ["--if-match", previous.etag]
              : ["--if-none-match", "*"]),
          ]);
        } catch (error) {
          if (
            ["PreconditionFailed", "ConditionalRequestConflict"].includes(
              error.code,
            )
          )
            throw stale();
          let observed;
          try {
            observed = await current(c, dir);
          } catch {}
          if (observed?.manifest?.revision === snapshot.revision)
            manifest = observed.manifest;
          else
            throw new PublicationError(
              "Publication outcome could not be confirmed. Load the shared catalog before trying again.",
              "PUBLICATION_OUTCOME_UNKNOWN",
              503,
            );
        }
        // The CAS succeeded. An invalidation failure must not report an unpublished
        // catalog or prompt a retry that could replace a subsequent release.
        let invalidationId = null,
          cacheInvalidationPending = false;
        try {
          const result = await invoke(c, [
            "cloudfront",
            "create-invalidation",
            "--distribution-id",
            c.distribution,
            "--paths",
            c.base + manifestPath,
          ]);
          invalidationId = result.Invalidation?.Id || null;
        } catch {
          cacheInvalidationPending = true;
        }
        return {
          ...manifest,
          manifestPath: manifestPath,
          invalidationId,
          cacheInvalidationPending,
          unchanged: false,
        };
      });
    },
  };
}

// Canonical registry + assignments share one immutable snapshot and one CAS.
// The legacy projection has its own CAS; a partial success is reported explicitly.
export function createRegistryCatalogPublisher(options = {}) {
  const canonical = createCatalogPublisher({...options,manifestPath:REGISTRY_MANIFEST_PATH});
  const legacy = createCatalogPublisher({...options,manifestPath:PUBLISHED_MANIFEST_PATH});
  async function heads() { return {current:await canonical.shared(),compatibility:await legacy.shared()}; }
  function check(input, previous) {
    if (!input.channelRegistry) throw new PublicationError('Publication requires a channel registry.', 'INVALID_CATALOG', 400);
    if (previous?.channelRegistry) assertRegistryEvolution(previous.channelRegistry,input.channelRegistry);
  }
  return {
    async capability() {return canonical.capability();},
    async shared() { const value=await canonical.shared();return value.available ? value : legacy.shared(); },
    async preview(input, options={}) {
      const {current,compatibility}=await heads();check(input,current.catalog);
      const result=await canonical.preview(input,options);
      const projection=frozenCatalog(compatibilityCatalog(result.catalog));
      return {...result,diff:publicationDiff(current.catalog??compatibility.catalog,result.catalog),compatibilityBaseRevision:compatibility.revision,compatibilityRevision:projection.revision,compatibilityDiff:publicationDiff(compatibility.catalog,projection.catalog)};
    },
    async publishFile(file, options) {
      const text=await readFile(file,'utf8');if(Buffer.byteLength(text)>MAX_IMPORT_BYTES)throw new PublicationError('Catalog exceeds the shared publication size limit.','INVALID_CATALOG',400);
      return this.publish(JSON.parse(text),options);
    },
    async publish(input, options={}) {
      const {current,compatibility}=await heads();check(input,current.catalog);
      // Refuse to overwrite a newer legacy inventory reviewed by another publisher.
      if (options.compatibilityBaseRevision === undefined) throw new PublicationError('Review the compatibility feed before publishing.','INVALID_REVISION',400);
      if (options.compatibilityBaseRevision !== compatibility.revision) throw stale();
      const projection=frozenCatalog(compatibilityCatalog(frozenCatalog(input).catalog));
      const result=await canonical.publish(input,options);
      try {
        const receipt=await legacy.publish(projection.catalog,{expectedRevision:compatibility.revision,reviewedRevision:projection.revision});
        return {...result,compatibilityPending:false,compatibilityRevision:receipt.revision};
      } catch {
        return {...result,compatibilityPending:true,compatibilityRevision:projection.revision};
      }
    }
  };
}
