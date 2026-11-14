import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  createCatalogPublisher,
  frozenCatalog,
  publicationDiff,
} from "../scripts/catalog-publisher.mjs";
import { runPublishCatalogCli } from "../scripts/publish-catalog.mjs";
import { createSeed } from "../src/catalog.mjs";
import {
  fetchPublishedCatalog,
  mergePublishedCatalog,
  validatePublishedManifest,
  PUBLISHED_MANIFEST_PATH,
} from "../src/published-catalog.mjs";

const config = JSON.parse(
  await readFile(new URL("../deploy/aws-static.json", import.meta.url), "utf8"),
);
const manifestKey = config.base.slice(1) + PUBLISHED_MANIFEST_PATH;
const fixture = (title) => {
  const catalog = createSeed();
  catalog.shows = catalog.shows.slice(0, 2);
  if (title) catalog.shows[0].title = title;
  return catalog;
};
function mockAws() {
  const objects = new Map(),
    calls = [];
  let serial = 0;
  const state = {
    account: config.account,
    failInvalidation: false,
    lostManifestResponse: false,
    failManifest: false,
    beforeManifestPut: null,
  };
  const install = (catalog) => {
    const frozen = frozenCatalog(catalog);
    const manifest = {
      version: 1,
      revision: frozen.revision,
      catalog: `data/catalogs/${frozen.revision}.json`,
      updatedAt: "2026-11-14T00:00:00.000Z",
      counts: frozen.counts,
    };
    objects.set(config.base.slice(1) + manifest.catalog, {
      body: frozen.text,
      etag: `"${++serial}"`,
    });
    objects.set(manifestKey, {
      body: JSON.stringify(manifest) + "\n",
      etag: `"${++serial}"`,
    });
    return manifest;
  };
  const runAws = async (args) => {
    calls.push([...args]);
    const option = (name) => args[args.indexOf(name) + 1];
    assert.equal(option("--region"), config.region);
    if (args[0] === "sts") return { Account: state.account };
    if (args[0] === "cloudfront") {
      if (state.failInvalidation)
        throw Error("credential-like text must never escape");
      assert.equal(option("--distribution-id"), config.distribution);
      assert.equal(option("--paths"), config.base + PUBLISHED_MANIFEST_PATH);
      return { Invalidation: { Id: "fixture-invalidation" } };
    }
    assert.equal(args[0], "s3api");
    assert.equal(option("--bucket"), config.bucket);
    assert.equal(option("--expected-bucket-owner"), config.account);
    const key = option("--key");
    if (args[1] === "get-object") {
      const item = objects.get(key);
      if (!item) throw Object.assign(Error("not found"), { code: "NoSuchKey" });
      const file = args[args.indexOf("--expected-bucket-owner") + 2];
      await writeFile(file, item.body);
      return { ETag: item.etag };
    }
    assert.equal(args[1], "put-object");
    const text = await readFile(option("--body"), "utf8");
    if (key === manifestKey && state.beforeManifestPut) {
      const hook = state.beforeManifestPut;
      state.beforeManifestPut = null;
      hook();
    }
    const existing = objects.get(key);
    if (args.includes("--if-none-match") && existing)
      throw Object.assign(Error("conflict"), { code: "PreconditionFailed" });
    if (
      args.includes("--if-match") &&
      (!existing || option("--if-match") !== existing.etag)
    )
      throw Object.assign(Error("conflict"), { code: "PreconditionFailed" });
    if (key === manifestKey && state.failManifest)
      throw Error("network timeout with credential-like detail");
    objects.set(key, { body: text, etag: `"${++serial}"` });
    if (key === manifestKey && state.lostManifestResponse)
      throw Error("lost response after commit");
    return { ETag: objects.get(key).etag };
  };
  return {
    objects,
    calls,
    state,
    install,
    runAws,
    publisher: createCatalogPublisher({ config, runAws }),
  };
}

test("first publication writes immutable snapshot before an initial CAS manifest and invalidates only the manifest", async () => {
  const aws = mockAws(),
    catalog = fixture();
  const preview = await aws.publisher.preview(catalog);
  assert.equal(preview.baseRevision, null);
  assert.equal(
    aws.calls.some((call) => call[1] === "put-object"),
    false,
  );
  const result = await aws.publisher.publish(catalog, {
    expectedRevision: null,
    reviewedRevision: preview.revision,
  });
  const puts = aws.calls.filter((call) => call[1] === "put-object");
  assert.equal(puts.length, 2);
  assert(puts[0].includes("public, max-age=31536000, immutable"));
  assert(puts[0].includes("--if-none-match"));
  assert(puts[1].includes("--if-none-match"));
  assert.equal(puts[1][puts[1].indexOf("--key") + 1], manifestKey);
  assert.equal(result.revision, frozenCatalog(catalog).revision);
  assert.equal(result.cacheInvalidationPending, false);
  assert.equal(
    (await aws.publisher.shared()).catalog.shows[0].id,
    catalog.shows[0].id,
  );
  assert.deepEqual(
    (await aws.publisher.capability()).baseRevision,
    result.revision,
  );
});

test("existing publication uses its ETag, rejects a stale base, and supports identical replay without writes", async () => {
  const aws = mockAws(),
    old = aws.install(fixture()),
    changed = fixture("Changed title");
  const review = await aws.publisher.preview(changed);
  const result = await aws.publisher.publish(changed, {
    expectedRevision: old.revision,
    reviewedRevision: review.revision,
  });
  const manifestPut = aws.calls
    .filter((call) => call[1] === "put-object")
    .at(-1);
  assert(manifestPut.includes("--if-match"));
  const writes = aws.calls.filter((call) => call[1] === "put-object").length;
  assert.equal(
    (
      await aws.publisher.publish(changed, {
        expectedRevision: old.revision,
        reviewedRevision: review.revision,
      })
    ).unchanged,
    true,
  );
  assert.equal(
    aws.calls.filter((call) => call[1] === "put-object").length,
    writes,
  );
  await assert.rejects(
    aws.publisher.publish(fixture("Another change"), {
      expectedRevision: old.revision,
    }),
    { code: "STALE_PUBLICATION" },
  );
  assert.equal(
    JSON.parse(aws.objects.get(manifestKey).body).revision,
    result.revision,
  );
});

test("concurrent initial publishers have one winner and preserve every immutable candidate", async () => {
  const aws = mockAws();
  const results = await Promise.allSettled([
    aws.publisher.publish(fixture("Writer A"), { expectedRevision: null }),
    aws.publisher.publish(fixture("Writer B"), { expectedRevision: null }),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected")[0].reason.code,
    "STALE_PUBLICATION",
  );
  assert.equal(
    [...aws.objects.keys()].filter((key) => key.includes("/catalogs/")).length,
    2,
  );
});

test("a writer racing after the manifest read cannot overwrite a different publication", async () => {
  const aws = mockAws(),
    original = aws.install(fixture()),
    competitor = fixture("Competitor");
  let winner;
  aws.state.beforeManifestPut = () => {
    winner = aws.install(competitor);
  };
  await assert.rejects(
    aws.publisher.publish(fixture("Candidate"), {
      expectedRevision: original.revision,
    }),
    { code: "STALE_PUBLICATION" },
  );
  assert.equal(
    JSON.parse(aws.objects.get(manifestKey).body).revision,
    winner.revision,
  );
});

test("lost manifest responses reconcile committed state, and invalidation failure still reports published success", async () => {
  const aws = mockAws();
  aws.state.lostManifestResponse = true;
  aws.state.failInvalidation = true;
  const result = await aws.publisher.publish(fixture(), {
    expectedRevision: null,
  });
  assert.equal(
    result.revision,
    JSON.parse(aws.objects.get(manifestKey).body).revision,
  );
  assert.equal(result.cacheInvalidationPending, true);
  assert.equal(result.invalidationId, null);
  const unknown = mockAws();
  unknown.state.failManifest = true;
  await assert.rejects(
    unknown.publisher.publish(fixture(), { expectedRevision: null }),
    { code: "PUBLICATION_OUTCOME_UNKNOWN" },
  );
  assert.equal(
    [...unknown.objects.keys()].filter((key) => key.includes("/catalogs/"))
      .length,
    1,
  );
});

test("account mismatch and reviewed snapshot mismatch perform no S3 writes and never expose AWS errors", async () => {
  const aws = mockAws();
  aws.state.account = "000000000000";
  await assert.rejects(
    aws.publisher.publish(fixture(), { expectedRevision: null }),
    { code: "ACCOUNT_MISMATCH" },
  );
  assert.equal(
    aws.calls.some((call) => call[1] === "put-object"),
    false,
  );
  const before = frozenCatalog(fixture());
  await assert.rejects(
    aws.publisher.publish(fixture("Changed since review"), {
      expectedRevision: null,
      reviewedRevision: before.revision,
    }),
    { code: "REVIEW_CHANGED" },
  );
  const broken = createCatalogPublisher({
    config,
    runAws: async () => {
      throw Error("SECRET_DETAIL");
    },
  });
  await assert.rejects(
    broken.capability(),
    (error) => !error.message.includes("SECRET_DETAIL"),
  );
});

test("CLI dry run pins both base and snapshot, refusing a file changed after review", async () => {
  const aws = mockAws();
  let contents = JSON.stringify(fixture());
  const options = { publisher: aws.publisher, read: async () => contents };
  const review = await runPublishCatalogCli(
    ["--catalog", "fixture.json", "--dry-run"],
    options,
  );
  contents = JSON.stringify(fixture("Edited after review"));
  await assert.rejects(
    runPublishCatalogCli(
      [
        "--catalog",
        "fixture.json",
        "--publish",
        "--expected-revision",
        "none",
        "--reviewed-revision",
        review.revision,
      ],
      options,
    ),
    { code: "REVIEW_CHANGED" },
  );
  assert.equal(
    aws.calls.some((call) => call[1] === "put-object"),
    false,
  );
  contents = JSON.stringify(fixture());
  const receipt = await runPublishCatalogCli(
    [
      "--catalog",
      "fixture.json",
      "--publish",
      "--expected-revision",
      "none",
      "--reviewed-revision",
      review.revision,
    ],
    options,
  );
  assert.equal(receipt.revision, review.revision);
  await assert.rejects(
    runPublishCatalogCli(
      ["--catalog", "fixture.json", "--publish", "--expected-revision", "none"],
      options,
    ),
  );
});

test("public loader validates raw snapshot bytes, manifest paths and counts; 403 is an error, not a missing catalog", async () => {
  const catalog = fixture(),
    frozen = frozenCatalog(catalog);
  const manifest = {
    version: 1,
    revision: frozen.revision,
    catalog: `data/catalogs/${frozen.revision}.json`,
    updatedAt: "2026-11-14T00:00:00Z",
    counts: frozen.counts,
  };
  let snapshot = frozen.text,
    calls = 0;
  const fetcher = async (url) => {
    calls++;
    return url === PUBLISHED_MANIFEST_PATH
      ? { ok: true, json: async () => manifest }
      : { ok: true, text: async () => snapshot };
  };
  assert.equal(
    (await fetchPublishedCatalog({ fetcher })).catalog.shows.length,
    2,
  );
  calls = 0;
  assert.equal(
    (await fetchPublishedCatalog({ fetcher, currentRevision: frozen.revision }))
      .unchanged,
    true,
  );
  assert.equal(calls, 1);
  snapshot += " ";
  await assert.rejects(fetchPublishedCatalog({ fetcher }), /integrity check/);
  assert.throws(() =>
    validatePublishedManifest({
      ...manifest,
      catalog: "https://evil.invalid/snapshot.json",
    }),
  );
  assert.equal(
    (await fetchPublishedCatalog({ fetcher: async () => ({ status: 404 }) }))
      .available,
    false,
  );
  await assert.rejects(
    fetchPublishedCatalog({
      fetcher: async () => ({ status: 403, ok: false }),
    }),
    /could not be loaded/,
  );
});

test("master merge replaces content/exclusions while retaining only valid playback choices without mutating legacy data", () => {
  const master = fixture(),
    previous = fixture("Private title");
  previous.shows.push({ ...master.shows[1], id: "private-show" });
  previous.exclusions = {
    episodes: [],
    sources: [
      {
        showId: master.shows[0].id,
        url: master.shows[0].episodes[0].sources[0].url,
      },
    ],
  };
  previous.settings = {
    ...previous.settings,
    channel: "action",
    bumpers: false,
    rotation: "ordered",
    streamShow: "private-show",
    commercialCount: 3,
    shuffleSeed: 6,
  };
  previous.epoch = 42;
  const original = JSON.stringify(previous),
    merged = mergePublishedCatalog(master, previous);
  assert.deepEqual(merged.shows, master.shows);
  assert.equal(merged.exclusions, undefined);
  assert.equal(merged.settings.channel, "action");
  assert.equal(merged.settings.streamShow, null);
  assert.equal(merged.settings.bumpers, false);
  assert.equal(merged.epoch, 42);
  assert.equal(JSON.stringify(previous), original);
  const diff = publicationDiff(previous, master);
  assert.equal(diff.removedShows[0].id, "private-show");
  assert.equal(diff.changedShows[0].id, master.shows[0].id);
});

test("publication uses station defaults and excludes owner playback choices and deletion history without mutating the draft", () => {
  const owner = createSeed();
  owner.settings = {
    channel: "scifi",
    rotation: "ordered",
    streamShow: "midnight-matinee",
    bumpers: false,
    commercialCount: 3,
    shuffleSeed: 91,
    storiesPerTurn: 3,
  };
  owner.epoch = 12345;
  owner.publishedRevision = "a".repeat(64);
  const removedUrl =
    "https://archive.org/download/owner-deleted-fixture/removed.mp4";
  owner.exclusions = {
    episodes: [
      {
        showId: "buck-rogers",
        title: "Deleted owner episode",
        season: 1,
        number: 99,
        kind: "episode",
        urls: [removedUrl],
      },
    ],
    sources: [{ showId: "buck-rogers", url: removedUrl }],
  };
  const original = JSON.stringify(owner);
  const snapshot = frozenCatalog(owner);
  const defaults = createSeed();
  assert.deepEqual(snapshot.catalog.settings, defaults.settings);
  assert.equal(snapshot.catalog.epoch, owner.epoch);
  assert.equal(snapshot.catalog.settings.channel, "mixed");
  assert.equal(snapshot.catalog.settings.rotation, "random");
  assert.equal(snapshot.catalog.settings.streamShow, null);
  assert.equal(snapshot.catalog.exclusions, undefined);
  assert.equal(snapshot.catalog.publishedRevision, undefined);
  assert.equal(snapshot.text.includes(removedUrl), false);
  assert.deepEqual(snapshot.catalog.shows, owner.shows);
  assert.equal(JSON.stringify(owner), original);
  const otherTuning = structuredClone(owner);
  otherTuning.settings = {
    ...defaults.settings,
    channel: "action",
    streamShow: "dukes",
  };
  assert.equal(frozenCatalog(otherTuning).revision, snapshot.revision);
  otherTuning.epoch = 999;
  assert.notEqual(frozenCatalog(otherTuning).revision, snapshot.revision);
});
