/**
 * @vitest-environment jsdom
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import sampleHarmony from "../testdata/harmony/sample_harmony1.json";

const PRACTICE_ONLY_GUIDANCE =
  "この課題は練習モードのみ利用できます。";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`テスト対象の要素が見つかりません: ${selector}`);
  }
  return element;
}

describe("sequence が空の課題の DOM 統合", () => {
  beforeAll(async () => {
    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(
      {},
      "",
      "/?type=harmony&id=sample_harmony1",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sampleHarmony,
      }),
    );

    await import("../src/main");
    await vi.waitFor(() => {
      expect(requireElement("#app-title").textContent).toBe(
        sampleHarmony.title,
      );
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    const modeSelect = requireElement<HTMLSelectElement>("#mode-select");
    modeSelect.value = "practice";
    modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });

  it("試験モードの選択肢を無効化する", () => {
    const examOption = requireElement<HTMLOptionElement>(
      '#mode-select option[value="exam"]',
    );

    expect(examOption.disabled).toBe(true);
  });

  it("練習モードのみ利用できる案内を表示する", () => {
    const modeGuidance = requireElement<HTMLElement>("#mode-guidance");

    expect(modeGuidance.hidden).toBe(false);
    expect(modeGuidance.textContent).toBe(PRACTICE_ONLY_GUIDANCE);
  });

  it("防御的な試験開始では練習モードへ戻す", () => {
    const modeSelect = requireElement<HTMLSelectElement>("#mode-select");
    const practiceControls =
      requireElement<HTMLElement>("#practice-controls");
    const examStartButton =
      requireElement<HTMLButtonElement>("#exam-start-button");
    const playButton = requireElement<HTMLButtonElement>("#play-button");
    const statusMessage = requireElement<HTMLElement>("#status-message");

    modeSelect.value = "exam";
    modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(examStartButton.disabled).toBe(true);

    examStartButton.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(modeSelect.value).toBe("practice");
    expect(practiceControls.hidden).toBe(false);
    expect(statusMessage.textContent).toBe(PRACTICE_ONLY_GUIDANCE);
    expect(document.activeElement).toBe(playButton);
  });

  it("利用できない試験を Space キーで開始しない", () => {
    const modeSelect = requireElement<HTMLSelectElement>("#mode-select");
    const examStartButton =
      requireElement<HTMLButtonElement>("#exam-start-button");
    const examCancelButton =
      requireElement<HTMLButtonElement>("#exam-cancel-button");
    const status = requireElement<HTMLElement>("#status");
    const statusMessage = requireElement<HTMLElement>("#status-message");

    modeSelect.value = "exam";
    modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const spaceEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Space",
    });
    document.body.dispatchEvent(spaceEvent);

    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(modeSelect.value).toBe("exam");
    expect(examStartButton.disabled).toBe(true);
    expect(examCancelButton.disabled).toBe(true);
    expect(status.dataset.state).toBe("ready");
    expect(statusMessage.textContent).toContain("譜面非表示");
  });
});
