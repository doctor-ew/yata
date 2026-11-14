import { createHash } from 'node:crypto';
// Bump whenever merge/migration semantics change without a data-file change.
export const LIBRARY_MIGRATION_VERSION = 2;
export function libraryRevision(texts, seed, migrationVersion = LIBRARY_MIGRATION_VERSION) {
  return `expanded-${createHash('sha256').update(JSON.stringify({migrationVersion, texts, seed})).digest('hex').slice(0,16)}`;
}
