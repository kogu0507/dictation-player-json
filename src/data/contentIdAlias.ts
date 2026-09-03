import type { ContentType } from "./types";

const MELODY_ID_ALIASES: Readonly<Record<string, string>> = {
  melody001: "melody-bass-001",
  melody002: "melody-bass-002",
  melody003: "melody-bass-003",
};

/**
 * Resolve transitional legacy content IDs to their canonical IDs.
 *
 * Alias resolution is intentionally scoped by content type so that a future
 * harmony/rhythm ID cannot be rewritten accidentally. The returned canonical
 * ID must be used before data fetch and validation.
 */
export function resolveContentIdAlias(id: string, type: ContentType): string {
  if (type !== "melody") {
    return id;
  }
  return MELODY_ID_ALIASES[id] ?? id;
}
