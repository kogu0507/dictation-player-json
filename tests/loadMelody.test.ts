import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMelody, MelodyLoadError } from "../src/data/loadMelody";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadMelody", () => {
  it("不正なIDをfetch前に拒否する", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadMelody("../sample")).rejects.toMatchObject({
      code: "invalid-id",
    } satisfies Partial<MelodyLoadError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404を課題なしとして区別する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    await expect(loadMelody("missing")).rejects.toMatchObject({
      code: "not-found",
    } satisfies Partial<MelodyLoadError>);
  });

  it("JSON解析失敗を区別する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError("invalid")),
      }),
    );

    await expect(loadMelody("sample")).rejects.toMatchObject({
      code: "invalid-json",
    } satisfies Partial<MelodyLoadError>);
  });

  it("未対応schemaを区別する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          schema_version: 2,
        }),
      }),
    );

    await expect(loadMelody("sample")).rejects.toMatchObject({
      code: "unsupported-schema",
    } satisfies Partial<MelodyLoadError>);
  });
});
