import { randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createRegistryCatalogPublisher,
  PublicationError,
} from "./scripts/catalog-publisher.mjs";
const BODY_LIMIT = 4 * 1024 * 1024;
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || ""))
    throw new PublicationError("Send a JSON request.", "INVALID_BODY", 415);
  if (Number(req.headers["content-length"]) > BODY_LIMIT)
    throw new PublicationError(
      "Request body is too large.",
      "BODY_TOO_LARGE",
      413,
    );
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > BODY_LIMIT)
      throw new PublicationError(
        "Request body is too large.",
        "BODY_TOO_LARGE",
        413,
      );
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PublicationError(
      "Request body is not valid JSON.",
      "INVALID_BODY",
      400,
    );
  }
}
function equalToken(given, expected) {
  if (typeof given !== "string") return false;
  const actual = Buffer.from(given),
    wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
export function createOwnerPublicationHandler({
  publisher = createRegistryCatalogPublisher(),
  getOrigin,
  clock = () => Date.now(),
  previewLifetimeMs = 10 * 60 * 1000,
  maxPreviews = 16,
  tempRoot = tmpdir(),
} = {}) {
  const csrfToken = randomBytes(32).toString("hex"),
    reviews = new Map();
  let directoryPromise,
    busy = false,
    disposed = false,
    pendingPreviews = 0;
  const respond = (res, status, value) => {
    res
      .writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .end(JSON.stringify(value));
  };
  async function removeReview(id) {
    const review = reviews.get(id);
    reviews.delete(id);
    if (review) await rm(review.file, { force: true });
  }
  async function expire() {
    for (const [id, review] of reviews)
      if (review.expiresAt <= clock()) await removeReview(id);
  }
  const timer = setInterval(() => {
    void expire().catch(() => {});
  }, 60000);
  timer.unref?.();
  return {
    async handle(req, res) {
      const raw = req.url || "";
      if (!raw.startsWith("/api/publisher/")) return false;
      if (disposed) {
        respond(res, 503, {
          enabled: false,
          error: "Shared publishing is unavailable.",
        });
        return true;
      }
      const expected = getOrigin?.();
      if (
        !expected ||
        !/^http:\/\/127\.0\.0\.1:\d+$/.test(expected) ||
        req.headers.host !== new URL(expected).host ||
        req.headers.origin !== expected ||
        (req.headers["sec-fetch-site"] &&
          !["same-origin", "none"].includes(req.headers["sec-fetch-site"]))
      ) {
        respond(res, 403, {
          error: "Owner publishing requires the local same-origin page.",
        });
        return true;
      }
      if (req.method !== "POST") {
        respond(res, 405, {
          error: "Use POST for owner publication requests.",
        });
        return true;
      }
      if (
        ![
          "/api/publisher/capability",
          "/api/publisher/preview",
          "/api/publisher/confirm",
          "/api/publisher/shared",
        ].includes(raw)
      ) {
        respond(res, 404, { error: "Unknown publication endpoint." });
        return true;
      }
      const capability = raw === "/api/publisher/capability";
      if (!capability && !equalToken(req.headers["x-yata-csrf"], csrfToken)) {
        respond(res, 403, {
          error: "The owner publication token is missing or expired.",
        });
        return true;
      }
      try {
        if (capability) {
          const current = await publisher.capability();
          respond(res, 200, {
            enabled: true,
            csrfToken,
            baseRevision: current.baseRevision,
          });
          return true;
        }
        const input = await body(req);
        await expire();
        if (raw === "/api/publisher/shared") {
          respond(res, 200, await publisher.shared());
          return true;
        }
        if (raw === "/api/publisher/preview") {
          if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input) ||
            !input.catalog
          )
            throw new PublicationError(
              "Provide a catalog to review.",
              "INVALID_CATALOG",
              400,
            );
          if (reviews.size + pendingPreviews >= maxPreviews)
            throw new PublicationError(
              "Too many pending reviews. Wait for an old review to expire.",
              "REVIEW_LIMIT",
              429,
            );
          pendingPreviews++;
          try {
            const prepared = await publisher.preview(input.catalog);
            const directory = await (directoryPromise ||= mkdtemp(
              path.join(tempRoot, "yata-owner-reviews-"),
            ));
            const reviewId = randomUUID(),
              file = path.join(directory, reviewId + ".json"),
              expiresAt = clock() + previewLifetimeMs;
            await writeFile(file, prepared.text, { mode: 0o600, flag: "wx" });
            reviews.set(reviewId, {
              file,
              compatibilityBaseRevision: prepared.compatibilityBaseRevision,
              baseRevision: prepared.baseRevision,
              revision: prepared.revision,
              expiresAt,
            });
            respond(res, 200, {
              reviewId,
              compatibilityBaseRevision: prepared.compatibilityBaseRevision,
              baseRevision: prepared.baseRevision,
              revision: prepared.revision,
              diff: prepared.diff,
              compatibilityDiff: prepared.compatibilityDiff,
              counts: prepared.counts,
              expiresAt: new Date(expiresAt).toISOString(),
            });
            return true;
          } finally {
            pendingPreviews--;
          }
        }
        if (busy)
          throw new PublicationError(
            "A publication is already in progress.",
            "PUBLISH_BUSY",
            409,
          );
        const review =
          typeof input?.reviewId === "string"
            ? reviews.get(input.reviewId)
            : null;
        if (!review || review.expiresAt <= clock())
          throw new PublicationError(
            "This review is missing or expired. Preview the catalog again.",
            "REVIEW_EXPIRED",
            410,
          );
        busy = true;
        try {
          const result = await publisher.publishFile(review.file, {
            expectedRevision: review.baseRevision,
            reviewedRevision: review.revision,
            compatibilityBaseRevision: review.compatibilityBaseRevision,
          });
          await removeReview(input.reviewId);
          respond(res, 200, result);
        } catch (error) {
          if (error.code === "STALE_PUBLICATION")
            await removeReview(input.reviewId);
          throw error;
        } finally {
          busy = false;
        }
      } catch (error) {
        const known = error instanceof PublicationError;
        respond(res, known ? error.status : 503, {
          ...(capability ? { enabled: false } : {}),
          error: known
            ? error.message
            : "Shared publishing is unavailable. Check local AWS configuration.",
          ...(known ? { code: error.code } : {}),
        });
      }
      return true;
    },
    async dispose() {
      disposed = true;
      clearInterval(timer);
      reviews.clear();
      if (directoryPromise)
        await rm(await directoryPromise, { recursive: true, force: true });
    },
  };
}
