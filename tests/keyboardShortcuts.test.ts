import { describe, expect, it } from "vitest";
import { getKeyboardAction } from "../src/ui/keyboardShortcuts";

describe("getKeyboardAction", () => {
  it("練習モードのSpaceで開始と停止を切り替える", () => {
    expect(
      getKeyboardAction({
        code: "Space",
        targetTagName: "BODY",
        mode: "practice",
        activity: "idle",
        hasMelody: true,
      }),
    ).toBe("start-practice");
    expect(
      getKeyboardAction({
        code: "Space",
        targetTagName: "BODY",
        mode: "practice",
        activity: "practice",
        hasMelody: true,
      }),
    ).toBe("stop-practice");
  });

  it("試験モードのSpaceで開始と中止を切り替える", () => {
    expect(
      getKeyboardAction({
        code: "Space",
        targetTagName: "BODY",
        mode: "exam",
        activity: "idle",
        hasMelody: true,
      }),
    ).toBe("start-exam");
    expect(
      getKeyboardAction({
        code: "Space",
        targetTagName: "BODY",
        mode: "exam",
        activity: "exam",
        hasMelody: true,
      }),
    ).toBe("cancel-exam");
  });

  it("フォーム操作中のSpaceを奪わない", () => {
    expect(
      getKeyboardAction({
        code: "Space",
        targetTagName: "SELECT",
        mode: "practice",
        activity: "idle",
        hasMelody: true,
      }),
    ).toBeUndefined();
  });

  it("Escapeはフォーカス位置にかかわらず実行中処理を止める", () => {
    expect(
      getKeyboardAction({
        code: "Escape",
        targetTagName: "SELECT",
        mode: "practice",
        activity: "practice",
        hasMelody: true,
      }),
    ).toBe("stop-practice");
    expect(
      getKeyboardAction({
        code: "Escape",
        targetTagName: "BUTTON",
        mode: "exam",
        activity: "exam",
        hasMelody: true,
      }),
    ).toBe("cancel-exam");
  });

  it("データ未読込時と別キーを無視する", () => {
    expect(
      getKeyboardAction({
        code: "Space",
        targetTagName: "BODY",
        mode: "practice",
        activity: "idle",
        hasMelody: false,
      }),
    ).toBeUndefined();
    expect(
      getKeyboardAction({
        code: "Enter",
        targetTagName: "BODY",
        mode: "practice",
        activity: "idle",
        hasMelody: true,
      }),
    ).toBeUndefined();
  });
});
