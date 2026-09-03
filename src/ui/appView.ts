export function renderAppShell(root: HTMLElement): void {
  root.innerHTML = `
    <section class="app-shell" aria-labelledby="app-title">
      <header class="app-header">
        <p class="eyebrow">旋律聴音</p>
        <h1 id="app-title">課題を読み込んでいます</h1>
        <div
          id="status"
          class="status"
          data-state="loading"
          role="status"
          aria-live="polite"
          tabindex="-1"
        >
          <span id="status-label" class="status-label">読み込み中</span>
          <span id="status-message">課題データを読み込んでいます。</span>
        </div>
      </header>

      <section class="controls" aria-label="再生設定">
        <label>
          <span>モード</span>
          <select id="mode-select" disabled>
            <option value="practice" selected>練習</option>
            <option value="exam">試験</option>
          </select>
        </label>
        <p id="mode-guidance" class="exam-guidance" role="note" hidden></p>
        <label>
          <span>調</span>
          <select id="key-select" disabled></select>
        </label>
        <label>
          <span>音色</span>
          <select id="timbre-select" disabled>
            <option value="triangle">三角波</option>
            <option value="sine">サイン波</option>
          </select>
        </label>
        <div id="practice-controls" class="mode-controls">
          <label>
            <span>速度</span>
            <select id="playback-rate-select" disabled>
              <option value="0.75">0.75倍</option>
              <option value="1" selected>1.0倍</option>
              <option value="1.25">1.25倍</option>
              <option value="1.5">1.5倍</option>
            </select>
          </label>
          <label>
            <span>開始小節</span>
            <select id="start-measure-select" disabled></select>
          </label>
          <label>
            <span>終了小節</span>
            <select id="end-measure-select" disabled></select>
          </label>
          <div class="button-row">
            <button
              id="play-button"
              type="button"
              aria-keyshortcuts="Space"
              disabled
            >
              選択範囲を再生
            </button>
            <button
              id="stop-button"
              class="secondary"
              type="button"
              aria-keyshortcuts="Escape"
              disabled
            >
              停止
            </button>
          </div>
        </div>
        <div id="exam-controls" class="mode-controls" hidden>
          <div class="button-row">
            <button
              id="exam-start-button"
              type="button"
              aria-keyshortcuts="Space"
              disabled
            >
              試験開始
            </button>
            <button
              id="exam-cancel-button"
              class="secondary"
              type="button"
              aria-keyshortcuts="Escape"
              disabled
            >
              試験中止
            </button>
          </div>
          <p id="exam-step-status" class="exam-step-status" aria-live="polite">
            試験開始前
          </p>
          <p
            id="exam-wake-lock-guidance"
            class="exam-guidance"
            role="note"
            aria-live="polite"
            hidden
          ></p>
        </div>
      </section>

      <p class="shortcut-help">
        キーボード: Spaceで開始、Escapeで停止・中止
      </p>
      <p class="compatibility-note">
        推奨環境: iOS Safari 16.4以降。試験中の画面消灯防止にはHTTPS環境が必要です。
      </p>

      <section id="score-panel" class="score-panel" aria-labelledby="score-title">
        <div class="score-heading">
          <h2 id="score-title">譜面</h2>
          <span id="score-key" class="key-badge"></span>
        </div>
        <div id="score" class="score" aria-live="polite">
          <p class="placeholder">課題データを読み込んでいます。</p>
        </div>
      </section>
    </section>
  `;
}

export function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
): T {
  const element = parent.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`要素が見つかりません: ${selector}`);
  }
  return element;
}
