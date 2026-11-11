import { SECTIONS, BY_KANA, NOTES, toKatakana, keyOf } from './kana.js';
import { getPref, setPref, mastery, getStat, hasStats, avgTime, isSlow, onStatsChange } from './store.js';
import { say } from './speech.js';
import { icons } from './ui.js';

export function renderChart(root) {
  const el = document.createElement('div');
  el.className = 'chart';
  root.appendChild(el);

  let script = getPref('chartScript', 'hira');
  let selected = null;

  const conv = (k) => (script === 'kata' ? toKatakana(k) : k);

  // 熟練度除了右上角的記號，也寫進按鈕的說明文字，螢幕閱讀器才念得到
  const LEVEL = { good: '已熟練', learning: '練習中', weak: '常答錯' };
  const cellLabel = (c) => {
    const level = LEVEL[mastery(keyOf(c, script))];
    return `${conv(c.kana)}，${c.romaji}${level ? `，${level}` : ''}`;
  };

  function cellHTML(c) {
    if (!c) return '<span class="cell empty" aria-hidden="true"></span>';
    const cls = [
      'cell',
      `m-${mastery(keyOf(c, script))}`,
      c.kana.length > 1 ? 'is-combo' : '',
      selected && selected.kana === c.kana ? 'is-selected' : '',
    ].join(' ');
    return `<button type="button" class="${cls}" data-kana="${c.kana}" aria-label="${cellLabel(c)}">
      <span class="k" lang="ja">${conv(c.kana)}</span><span class="r">${c.romaji}</span>
    </button>`;
  }

  const sectionHTML = (sec) => `
    <section class="sec">
      <div class="sec-head"><h2>${sec.title}</h2><span>${sec.note}</span></div>
      <div class="grid cols-${sec.cols.length}">
        ${sec.cols.map((c) => `<span class="col-h" aria-hidden="true">${c}</span>`).join('')}
        ${sec.rows.map((r) => r.cells.map(cellHTML).join('')).join('')}
      </div>
    </section>`;

  function statText(c) {
    const key = keyOf(c, script);
    const s = getStat(key);
    if (!s) return '還沒練習過';
    const avg = avgTime(key);
    const time = avg == null ? '' : `・平均 ${(avg / 1000).toFixed(1)} 秒${isSlow(key) ? '（還不夠快）' : ''}`;
    return `答對 ${s.c} 次・答錯 ${s.w} 次${time}`;
  }

  function detailHTML(c) {
    const stat = statText(c);
    const note = NOTES[c.kana];
    return `<div class="detail-inner">
      <div class="pair">
        <div class="${script === 'hira' ? 'on' : ''}"><span class="big" lang="ja">${c.kana}</span><small>平假名</small></div>
        <div class="${script === 'kata' ? 'on' : ''}"><span class="big" lang="ja">${toKatakana(c.kana)}</span><small>片假名</small></div>
      </div>
      <div class="d-info">
        <div class="d-romaji">${c.romaji}</div>
        ${note ? `<div class="d-note">${note}</div>` : ''}
        <div class="d-stat">${stat}</div>
      </div>
      <button type="button" class="icon-btn accent" data-act="speak" aria-label="播放發音">${icons.volume}</button>
      <button type="button" class="icon-btn plain" data-act="close" aria-label="關閉">${icons.close}</button>
    </div>`;
  }

  function draw() {
    const showRomaji = getPref('showRomaji', true);
    el.classList.toggle('hide-romaji', !showRomaji);
    el.innerHTML = `
      ${
        hasStats()
          ? ''
          : `<section class="card start-card">
              <div>
                <h2>第一次來？從這裡開始</h2>
                <p>先點下面的假名聽發音，認得幾個之後就去做測驗。測驗會記住你不熟的假名，讓它們多出現幾次。</p>
              </div>
              <a class="btn primary" href="#quiz">去做測驗</a>
            </section>`
      }
      <div class="toolbar">
        <div class="seg" role="group" aria-label="切換文字">
          <button type="button" data-script="hira" aria-pressed="${script === 'hira'}">平假名</button>
          <button type="button" data-script="kata" aria-pressed="${script === 'kata'}">片假名</button>
        </div>
        <label class="check"><input type="checkbox" data-act="romaji" ${showRomaji ? 'checked' : ''} /> 顯示拼音</label>
      </div>
      <p class="hint">點一下假名就能聽發音，看平假名和片假名的對照。</p>
      <div class="legend">
        <span><i class="dot good"></i>已熟練</span>
        <span><i class="dot learning"></i>練習中（含答對但較慢）</span>
        <span><i class="dot weak"></i>常答錯</span>
        <span class="muted">做完測驗後會標在表格上</span>
      </div>
      ${SECTIONS.map(sectionHTML).join('')}
      <div class="detail" ${selected ? '' : 'hidden'}>${selected ? detailHTML(selected) : ''}</div>`;
  }

  function select(kana) {
    selected = BY_KANA[kana];
    el.querySelectorAll('.cell.is-selected').forEach((c) => c.classList.remove('is-selected'));
    el.querySelector(`.cell[data-kana="${kana}"]`)?.classList.add('is-selected');
    const d = el.querySelector('.detail');
    d.innerHTML = detailHTML(selected);
    d.hidden = false;
    say(conv(kana));
  }

  function close() {
    selected = null;
    el.querySelectorAll('.cell.is-selected').forEach((c) => c.classList.remove('is-selected'));
    el.querySelector('.detail').hidden = true;
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.script) {
      script = t.dataset.script;
      setPref('chartScript', script);
      draw();
    } else if (t.dataset.kana) {
      select(t.dataset.kana);
    } else if (t.dataset.act === 'speak' && selected) {
      say(conv(selected.kana), { force: true });
    } else if (t.dataset.act === 'close') {
      close();
    }
  });

  el.addEventListener('change', (e) => {
    if (e.target.dataset.act !== 'romaji') return;
    setPref('showRomaji', e.target.checked);
    el.classList.toggle('hide-romaji', !e.target.checked);
  });

  const onKey = (e) => {
    if (e.key === 'Escape' && selected) close();
  };
  document.addEventListener('keydown', onKey);

  // 其他裝置的紀錄同步進來時，只更新熟練度顏色和次數，不整個重畫
  const offStats = onStatsChange(() => {
    el.querySelectorAll('.cell[data-kana]').forEach((b) => {
      b.classList.remove('m-new', 'm-learning', 'm-weak', 'm-good');
      b.classList.add(`m-${mastery(keyOf(BY_KANA[b.dataset.kana], script))}`);
      b.setAttribute('aria-label', cellLabel(BY_KANA[b.dataset.kana]));
    });
    if (hasStats()) el.querySelector('.start-card')?.remove();
    const stat = el.querySelector('.d-stat');
    if (selected && stat) stat.textContent = statText(selected);
  });

  draw();
  return () => {
    document.removeEventListener('keydown', onKey);
    offStats();
  };
}
