import { describe, expect, it } from "vitest";
import { resolveDataBaseUrl } from "../src/config/dataSource";

describe("resolveDataBaseUrl", () => {
  it("開発・productionの既定URLを返す", () => {
    expect(resolveDataBaseUrl(undefined, true)).toBe(
      "./testdata/melody",
    );
    expect(resolveDataBaseUrl(undefined, false)).toBe(
      "/data/dictation/melody",
    );
    expect(resolveDataBaseUrl(undefined, true, "harmony")).toBe(
      "./testdata/harmony",
    );
    expect(resolveDataBaseUrl(undefined, false, "harmony")).toBe(
      "/data/dictation/harmony",
    );
  });

  it("VITE_DATA_BASE_URL相当の設定値を優先する", () => {
    expect(
      resolveDataBaseUrl(
        "http://192.168.1.20:9000/melody/",
        false,
      ),
    ).toBe("http://192.168.1.20:9000/melody");
    expect(resolveDataBaseUrl("./data/dictation/melody", false)).toBe(
      "./data/dictation/melody",
    );
    expect(
      resolveDataBaseUrl("./data/dictation/melody", false, "harmony"),
    ).toBe("./data/dictation/harmony");
    expect(resolveDataBaseUrl("./data/dictation", false, "harmony")).toBe(
      "./data/dictation/harmony",
    );
  });

  it("空白だけの設定値を未指定として扱う", () => {
    expect(resolveDataBaseUrl("   ", false)).toBe(
      "/data/dictation/melody",
    );
  });
});
