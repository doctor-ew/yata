import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createCatalogPublisher,
  frozenCatalog,
  PublicationError,
} from "./catalog-publisher.mjs";
import { MAX_IMPORT_BYTES } from "../src/domain.mjs";

export async function runPublishCatalogCli(
  args,
  {
    publisher = createCatalogPublisher(),
    read = (file) => readFile(file, "utf8"),
  } = {},
) {
  let file, expectedRevision, reviewedRevision;
  let publish = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--catalog") file = args[++index];
    else if (argument === "--expected-revision") {
      const revision = args[++index];
      expectedRevision = revision === "none" ? null : revision;
    } else if (argument === "--reviewed-revision")
      reviewedRevision = args[++index];
    else if (argument === "--publish") publish = true;
    else if (argument === "--dry-run" || argument === "--review")
      publish = false;
    else
      throw new Error(
        "Use --catalog FILE [--dry-run] or --publish --expected-revision REVISION|none --reviewed-revision SNAPSHOT_HASH.",
      );
  }
  if (!file) throw new Error("Provide a catalog file with --catalog.");
  const text = await read(file);
  if (Buffer.byteLength(text) > MAX_IMPORT_BYTES)
    throw new Error("Catalog exceeds the publication size limit.");
  const catalog = JSON.parse(text);
  if (!publish) {
    const review = await publisher.preview(catalog, { expectedRevision });
    return {
      dryRun: true,
      baseRevision: review.baseRevision,
      revision: review.revision,
      counts: review.counts,
      diff: review.diff,
    };
  }
  if (
    expectedRevision === undefined ||
    !/^[a-f0-9]{64}$/.test(reviewedRevision || "")
  ) {
    throw new Error(
      "Publishing requires --expected-revision from the dry run (or none initially) and --reviewed-revision with its snapshot hash.",
    );
  }
  if (frozenCatalog(catalog).revision !== reviewedRevision) {
    throw new PublicationError(
      "Catalog changed after review. Preview it again before publishing.",
      "REVIEW_CHANGED",
      409,
    );
  }
  return publisher.publish(catalog, { expectedRevision, reviewedRevision });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      JSON.stringify(
        await runPublishCatalogCli(process.argv.slice(2)),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      error.code ? `${error.code}: ${error.message}` : error.message,
    );
    process.exitCode = 1;
  }
}
