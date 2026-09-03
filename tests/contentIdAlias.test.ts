import { describe, expect, it } from "vitest";
import { resolveContentIdAlias } from "../src/data/contentIdAlias";

describe("resolveContentIdAlias", () => {
  it.each([
    ["melody001", "melody-bass-001"],
    ["melody002", "melody-bass-002"],
    ["melody003", "melody-bass-003"],
  ])("maps legacy melody ID %s to %s", (legacyId, canonicalId) => {
    expect(resolveContentIdAlias(legacyId, "melody")).toBe(canonicalId);
  });

  it("leaves canonical and unrelated melody IDs unchanged", () => {
    expect(resolveContentIdAlias("melody-bass-001", "melody")).toBe(
      "melody-bass-001",
    );
    expect(resolveContentIdAlias("melody-treble-001", "melody")).toBe(
      "melody-treble-001",
    );
  });

  it("does not apply melody aliases to harmony content", () => {
    expect(resolveContentIdAlias("melody001", "harmony")).toBe("melody001");
  });
});
