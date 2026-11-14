import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { readFile, stat } from "node:fs/promises";
import { createOwnerPublicationHandler } from "../owner-publisher.mjs";
import {
  frozenCatalog,
  PublicationError,
} from "../scripts/catalog-publisher.mjs";
import { createSeed } from "../src/catalog.mjs";

async function fixture(t, overrides = {}) {
  const published = [],
    files = [];
  const publisher = {
    capability: async () => ({ baseRevision: null }),
    shared: async () => ({
      available: false,
      unchanged: false,
      revision: null,
      manifest: null,
      catalog: null,
    }),
    preview: async (catalog) => ({
      ...frozenCatalog(catalog),
      baseRevision: null,
      diff: {
        addedShows: catalog.shows.map((s) => ({ id: s.id, title: s.title })),
      },
    }),
    publishFile: async (file, options) => {
      files.push(file);
      assert.equal((await stat(file)).mode & 0o777, 0o600);
      const catalog = JSON.parse(await readFile(file, "utf8"));
      assert.equal(frozenCatalog(catalog).revision, options.reviewedRevision);
      published.push(catalog);
      return {
        revision: options.reviewedRevision,
        cacheInvalidationPending: false,
      };
    },
    ...overrides.publisher,
  };
  let origin;
  const handler = createOwnerPublicationHandler({
    publisher,
    getOrigin: () => origin,
    ...overrides.handler,
  });
  const server = http.createServer(async (req, res) => {
    try {
      if (!(await handler.handle(req, res))) res.writeHead(404).end();
    } catch {
      res.writeHead(500).end("unexpected handler failure");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.close();
    server.closeAllConnections();
    await once(server, "close");
    await handler.dispose();
  });
  const post = async (action, body = {}, headers = {}) => {
    const response = await fetch(`${origin}/api/publisher/${action}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json(),
    };
  };
  const capability = await post("capability");
  assert.equal(capability.status, 200);
  const csrf = { "X-YATA-CSRF": capability.body.csrfToken };
  return { origin, post, csrf, published, files, publisher };
}

test("owner endpoints enforce exact loopback Host and Origin, POST, and byte-safe CSRF without CORS", async (t) => {
  const f = await fixture(t);
  for (const origin of ["https://doctorew.com", "null", ""]) {
    const result = await f.post("capability", {}, { Origin: origin });
    assert.equal(result.status, 403);
    assert.equal(result.headers.get("access-control-allow-origin"), null);
  }
  const wrongHost = await new Promise((resolve, reject) => {
    const request = http.request(
      `${f.origin}/api/publisher/capability`,
      { method: "POST", headers: { Host: "evil.invalid", Origin: f.origin } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(wrongHost, 403);
  assert.equal(
    (
      await fetch(`${f.origin}/api/publisher/capability`, {
        headers: { Origin: f.origin },
      })
    ).status,
    405,
  );
  assert.equal(
    (await f.post("preview", { catalog: createSeed() })).status,
    403,
  );
  assert.equal(
    (
      await f.post(
        "preview",
        { catalog: createSeed() },
        { "X-YATA-CSRF": "é".repeat(64) },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.post(
        "preview",
        { catalog: createSeed() },
        { "X-YATA-CSRF": "0".repeat(64) },
      )
    ).status,
    403,
  );
  assert.equal((await f.post("shared", {}, f.csrf)).status, 200);
  assert.equal(
    (await f.post("shared?url=https://evil.invalid/", {}, f.csrf)).status,
    404,
  );
  assert.equal((await f.post("unknown", {}, f.csrf)).status, 404);
  assert.equal(f.published.length, 0);
});

test("preview freezes reviewed bytes and confirm consumes the review instead of accepting a new payload", async (t) => {
  const f = await fixture(t),
    catalog = createSeed(),
    originalTitle = catalog.shows[0].title;
  const review = await f.post("preview", { catalog }, f.csrf);
  assert.equal(review.status, 200);
  assert(Number.isFinite(Date.parse(review.body.expiresAt)));
  catalog.shows[0].title = "Edited after the review";
  const receipt = await f.post(
    "confirm",
    { reviewId: review.body.reviewId, catalog },
    f.csrf,
  );
  assert.equal(receipt.status, 200);
  assert.equal(f.published[0].shows[0].title, originalTitle);
  assert.equal(
    (await f.post("confirm", { reviewId: review.body.reviewId }, f.csrf))
      .status,
    410,
  );
  await assert.rejects(stat(f.files[0]), { code: "ENOENT" });
});

test("only one confirm runs at a time; double click cannot start another release", async (t) => {
  let entered, release;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const f = await fixture(t, {
    publisher: {
      publishFile: async () => {
        calls++;
        entered();
        await gate;
        return { revision: "a".repeat(64) };
      },
    },
  });
  const review = await f.post("preview", { catalog: createSeed() }, f.csrf);
  const first = f.post("confirm", { reviewId: review.body.reviewId }, f.csrf);
  await started;
  const second = await f.post(
    "confirm",
    { reviewId: review.body.reviewId },
    f.csrf,
  );
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "PUBLISH_BUSY");
  release();
  assert.equal((await first).status, 200);
  assert.equal(calls, 1);
});

test("expired and stale reviews cannot publish; stale confirm requires a new review", async (t) => {
  let clock = 0;
  const f = await fixture(t, {
    handler: { clock: () => clock, previewLifetimeMs: 100 },
  });
  const review = await f.post("preview", { catalog: createSeed() }, f.csrf);
  clock = 101;
  assert.equal(
    (await f.post("confirm", { reviewId: review.body.reviewId }, f.csrf))
      .status,
    410,
  );
  assert.equal(f.published.length, 0);
  const stale = await fixture(t, {
    publisher: {
      publishFile: async () => {
        throw new PublicationError(
          "Shared catalog changed.",
          "STALE_PUBLICATION",
          409,
        );
      },
    },
  });
  const another = await stale.post(
    "preview",
    { catalog: createSeed() },
    stale.csrf,
  );
  assert.equal(
    (
      await stale.post(
        "confirm",
        { reviewId: another.body.reviewId },
        stale.csrf,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await stale.post(
        "confirm",
        { reviewId: another.body.reviewId },
        stale.csrf,
      )
    ).status,
    410,
  );
});

test("oversized and malformed bodies fail before preview, and operational errors are sanitized", async (t) => {
  let called = 0;
  const f = await fixture(t, {
    publisher: {
      preview: async () => {
        called++;
        throw Error("SECRET_ERROR_DETAIL");
      },
    },
  });
  const huge = await f.post(
    "preview",
    { catalog: { padding: "x".repeat(4 * 1024 * 1024) } },
    f.csrf,
  );
  assert.equal(huge.status, 413);
  assert.equal(called, 0);
  const response = await fetch(`${f.origin}/api/publisher/preview`, {
    method: "POST",
    headers: {
      Origin: f.origin,
      "Content-Type": "application/json",
      ...f.csrf,
    },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.equal(called, 0);
  const error = await f.post("preview", { catalog: createSeed() }, f.csrf);
  assert.equal(error.status, 503);
  assert.equal(
    JSON.stringify(error.body).includes("SECRET_ERROR_DETAIL"),
    false,
  );
});

test("loopback HTML blocks framing without restricting its child media frames", async (t) => {
  const { spawn } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("../server.mjs", import.meta.url))],
    {
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(async () => {
    if (child.exitCode === null) {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }
  });
  const origin = await new Promise((resolve, reject) => {
    let text = "";
    const timer = setTimeout(
      () => reject(Error("Local server did not start.")),
      5000,
    );
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdout.on("data", (chunk) => {
      text += chunk;
      const found = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (found) {
        clearTimeout(timer);
        resolve(found[0]);
      }
    });
  });
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(
    response.headers.get("content-security-policy"),
    "frame-ancestors 'none'",
  );
  assert.equal(
    response.headers.get("content-security-policy").includes("frame-src"),
    false,
  );
});
