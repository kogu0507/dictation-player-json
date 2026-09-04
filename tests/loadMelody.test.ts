import { afterEach, describe, expect, it, vi } from "vitest";
import sampleHarmonyJson from "../testdata/harmony/sample_harmony1.json";
import sample1Json from "../testdata/melody/sample1.json";
import {
  loadContent,
  loadMelody,
  MelodyLoadError,
} from "../src/data/loadMelody";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadMelody", () => {
  it("正常なschema v1データを取得して内部モデルへ変換する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(sample1Json),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadMelody("sample1")).resolves.toMatchObject({
      schema_version: 1,
      id: "sample1",
      measures: 8,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/testdata/melody/sample1.json",
    );
  });

  it.each([
    ["melody001", "melody-bass-001"],
    ["melody002", "melody-bass-002"],
    ["melody003", "melody-bass-003"],
  ])(
    "旧ID %sでcanonical JSON %sを取得・検証する",
    async (legacyId, canonicalId) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...sample1Json,
          id: canonicalId,
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(loadMelody(legacyId)).resolves.toMatchObject({
        id: canonicalId,
        type: "melody",
      });
      expect(fetchMock.mock.calls[0]?.[0]).toContain(
        `/testdata/melody/${canonicalId}.json`,
      );
    },
  );

  it.each([
    "melody-bass-001",
    "melody-bass-002",
    "melody-bass-003",
  ])("canonical melody ID %sをそのまま取得する", async (canonicalId) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        ...sample1Json,
        id: canonicalId,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadMelody(canonicalId)).resolves.toMatchObject({
      id: canonicalId,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `/testdata/melody/${canonicalId}.json`,
    );
  });

  it("旧ID URLでもcanonical IDではないJSONを拒否する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...sample1Json,
          id: "melody001",
        }),
      }),
    );

    await expect(loadMelody("melody001")).rejects.toMatchObject({
      code: "invalid-data",
    } satisfies Partial<MelodyLoadError>);
  });

  it("不正なIDをfetch前に拒否する", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadMelody("../sample")).rejects.toMatchObject({
      code: "invalid-id",
    } satisfies Partial<MelodyLoadError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("type省略時はmelodyとして読み込む", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(sample1Json),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadContent({ id: "sample1" })).resolves.toMatchObject({
      schema_version: 1,
      type: "melody",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/testdata/melody/sample1.json",
    );
  });

  it("harmony type指定時はharmony pathからschema v2を読み込む", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(sampleHarmonyJson),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadContent({ id: "sample_harmony1", type: "harmony" }),
    ).resolves.toMatchObject({
      schema_version: 2,
      type: "harmony",
      id: "sample_harmony1",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/testdata/harmony/sample_harmony1.json",
    );
  });

  it("melodyの旧ID aliasをharmonyへ適用しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        ...sampleHarmonyJson,
        id: "melody001",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadContent({ id: "melody001", type: "harmony" }),
    ).resolves.toMatchObject({
      id: "melody001",
      type: "harmony",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/testdata/harmony/melody001.json",
    );
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

  it("ネットワーク失敗を区別する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network")),
    );

    await expect(loadMelody("sample")).rejects.toMatchObject({
      code: "network-error",
    } satisfies Partial<MelodyLoadError>);
  });

  it("404以外のHTTPエラーを区別する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(loadMelody("sample")).rejects.toMatchObject({
      code: "http-error",
      message: "課題データの取得に失敗しました（HTTP 503）。",
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

  it("契約不正をinvalid-dataとして区別する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          schema_version: 1,
          id: "",
        }),
      }),
    );

    await expect(loadMelody("sample")).rejects.toMatchObject({
      code: "invalid-data",
    } satisfies Partial<MelodyLoadError>);
  });
});
