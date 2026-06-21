import { describe, expect, it } from "vitest";
import {
  getStatusPresentation,
  type AppStatusKind,
} from "../src/ui/statusPresentation";

describe("getStatusPresentation", () => {
  it.each([
    ["loading", true],
    ["preparing", true],
    ["playing", true],
    ["waiting", true],
    ["ready", false],
    ["completed", false],
    ["stopped", false],
  ] as Array<[AppStatusKind, boolean]>)(
    "%s状態のbusy属性を返す",
    (kind, busy) => {
      expect(getStatusPresentation(kind).busy).toBe(busy);
      expect(getStatusPresentation(kind).role).toBe("status");
    },
  );

  it("エラーをassertiveなalertとして返す", () => {
    expect(getStatusPresentation("error")).toEqual({
      label: "エラー",
      role: "alert",
      ariaLive: "assertive",
      busy: false,
    });
  });
});
