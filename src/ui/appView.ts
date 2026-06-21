export function renderAppShell(root: HTMLElement): void {
  root.innerHTML = `
    <section class="app-shell" aria-labelledby="app-title">
      <header class="app-header">
        <p class="eyebrow">旋律聴音</p>
        <h1 id="app-title">課題を読み込んでいます</h1>
        <p id="status" class="status" role="status" aria-live="polite">
          読み込み中…
        </p>
      </header>

      <section class="controls" aria-label="再生設定">
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
          <button id="play-button" type="button" disabled>
            選択範囲を再生
          </button>
          <button id="stop-button" class="secondary" type="button" disabled>
            停止
          </button>
        </div>
      </section>

      <section class="score-panel" aria-labelledby="score-title">
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
