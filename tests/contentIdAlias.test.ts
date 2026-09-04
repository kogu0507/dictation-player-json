import { describe, expect, it } from "vitest";
import { resolveContentIdAlias } from "../src/data/contentIdAlias";

describe("resolveContentIdAlias", () => {
  it.each([
    ["melody001", "melody-bass-001"],
    ["melody002", "melody-bass-002"],
    ["melody003", "melody-bass-003"],
  ])("旧melody ID %sをcanonical ID %sへ解決する", (legacyId, canonicalId) => {
    expect(resolveContentIdAlias(legacyId, "melody")).toBe(canonicalId);
  });

  it.each([
    "melody-bass-001",
    "melody-bass-002",
    "melody-bass-003",
  ])("canonical melody ID %sを変更しない", (canonicalId) => {
    expect(resolveContentIdAlias(canonicalId, "melody")).toBe(canonicalId);
  });

  it("無関係なmelody IDを変更しない", () => {
    expect(resolveContentIdAlias("sample1", "melody")).toBe("sample1");
  });

  it("melody aliasをharmonyへ適用しない", () => {
    expect(resolveContentIdAlias("melody001", "harmony")).toBe("melody001");
  });
});
