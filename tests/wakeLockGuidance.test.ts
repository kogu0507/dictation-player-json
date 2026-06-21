import { describe, expect, it } from "vitest";
import { getWakeLockGuidance } from "../src/ui/wakeLockGuidance";

describe("getWakeLockGuidance", () => {
  it("非HTTPSではsecure contextが必要と案内する", () => {
    expect(getWakeLockGuidance("insecure-context")).toContain(
      "HTTPS環境が必要",
    );
  });

  it.each(["unsupported", "failed"] as const)(
    "%s時に自動ロック無効化を案内する",
    (state) => {
      expect(getWakeLockGuidance(state)).toContain(
        "自動ロックを一時的に無効化",
      );
    },
  );

  it.each(["available", "acquired", "interrupted"] as const)(
    "%sでは警告を返さない",
    (state) => {
      expect(getWakeLockGuidance(state)).toBeUndefined();
    },
  );
});
