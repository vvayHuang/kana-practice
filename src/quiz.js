import { GROUPS, ALL, BY_KANA, toKatakana, display, keyOf, confusables } from './kana.js';
import { getPref, setPref, record, weakKeys, weight, onStatsChange, SLOW_MS } from './store.js';
import { say } from './speech.js';
import { icons } from './ui.js';

const MODES = { k2r: '看假名 選拼音', r2k: '看拼音 選假名' };
const SCRIPTS = { hira: '平假名', kata: '片假名', mix: '混合' };
const SCRIPT_NAME = { hira: '平假名', kata: '片假名' };

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const uniqBy = (arr, f) => {
  const seen = new Set();
  return arr.filter((x) => {
    const k = f(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// 依權重抽 n 題（不重複）：不熟的假名權重高，比較容易被抽到
function pickWeighted(qs, n) {
  return qs
    .map((q) => ({ q, r: Math.random() ** (1 / weight(keyOf(q.item, q.script))) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, n)
    .map((x) => x.q);
}

// 干擾選項：拼音不能和答案相同（じ／ぢ 都念 ji），長度相同（拗音配拗音）。
// 優先挑容易混淆的：先放長得像的（ぬ／め、シ／ツ），再補念起來像的（同一行或同一段），
// 剩下的從目前範圍隨機挑，不夠再從全部假名補。混淆的假名也只從目前範圍裡找。
function makeOptions(q, pool) {
  const inPool = new Set(pool);
  const picks = [];
  const add = (list, max) => {
    for (const i of shuffle(list)) {
      if (picks.length >= max) return;
      if (i.romaji === q.item.romaji || i.kana.length !== q.item.kana.length) continue;
      if (!picks.some((p) => p.romaji === i.romaji)) picks.push(i);
    }
  };
  const { look, sound } = confusables(q.item, q.script);
  add(look.filter((i) => inPool.has(i)), 3);
  add(sound.filter((i) => inPool.has(i)), 2);
  add(pool, 3);
  add(ALL, 3);
  return shuffle([q.item, ...picks]);
}

const seg = (field, opts, cur) => `
  <div class="seg block" role="group" data-field="${field}">
    ${Object.entries(opts)
      .map(([v, t]) => `<button type="button" data-val="${v}" aria-pressed="${String(cur) === v}">${t}</button>`)
      .join('')}
  </div>`;

function resultMessage(pct) {
  if (pct === 100) return '全對！太厲害了！';
  if (pct >= 80) return '很棒，快要熟練了！';
  if (pct >= 50) return '不錯喔，再多練幾次會更熟。';
  return '慢慢來，先回五十音表看一看也很好。';
}

export function mountQuiz(root) {
  const el = document.createElement('div');
  el.className = 'quiz';
  root.appendChild(el);

  const cfg = {
    mode: getPref('quizMode', 'k2r'),
    script: getPref('quizScript', 'hira'),
    groups: new Set(getPref('quizGroups', ['a', 'ka', 'sa'])),
    length: getPref('quizLength', 10),
  };
  let screen = 'setup';
  let game = null;
  let timer = null;
  let weakShown = -1; // 設定畫面上「複習常錯」顯示的數量

  const saveCfg = () => {
    setPref('quizMode', cfg.mode);
    setPref('quizScript', cfg.script);
    setPref('quizGroups', [...cfg.groups]);
    setPref('quizLength', cfg.length);
  };

  const selectedItems = () => GROUPS.filter((g) => cfg.groups.has(g.id)).flatMap((g) => g.items);
  const scriptsFor = (s) => (s === 'mix' ? ['hira', 'kata'] : [s]);

  const weakQuestions = () =>
    weakKeys(20)
      .map((k) => {
        const [script, kana] = k.split(':');
        return BY_KANA[kana] && SCRIPT_NAME[script] ? { item: BY_KANA[kana], script } : null;
      })
      .filter(Boolean);

  function start(questions, pool, kind) {
    clearTimeout(timer);
    game = {
      qs: shuffle(questions).map((q) => ({ ...q, options: makeOptions(q, pool) })),
      pool,
      kind,
      i: 0,
      score: 0,
      streak: 0,
      best: 0,
      answered: false,
      picked: -1,
      mistakes: [],
      slow: [], // 答對但想比較久的
      shownAt: performance.now(),
    };
    screen = 'play';
    draw();
  }

  function startFromCfg() {
    const items = selectedItems();
    if (!items.length) return;
    let qs = items.flatMap((item) => scriptsFor(cfg.script).map((script) => ({ item, script })));
    if (cfg.length !== 'all' && qs.length > cfg.length) qs = pickWeighted(qs, cfg.length);
    start(qs, items, 'normal');
  }

  function startReview() {
    const qs = weakQuestions();
    if (qs.length) start(qs, ALL, 'review');
  }

  function answer(idx) {
    if (screen !== 'play' || game.answered) return;
    const q = game.qs[game.i];
    if (idx < 0 || idx >= q.options.length) return;
    const ok = q.options[idx].kana === q.item.kana;
    game.answered = true;
    game.picked = idx;
    const ms = performance.now() - game.shownAt;
    record(keyOf(q.item, q.script), ok, ms);
    if (ok) {
      if (ms > SLOW_MS) game.slow.push(q);
      game.score++;
      game.streak++;
      game.best = Math.max(game.best, game.streak);
    } else {
      game.streak = 0;
      game.mistakes.push(q);
    }
    say(display(q.item, q.script));
    draw();
    if (ok) timer = setTimeout(next, 900);
  }

  function next() {
    clearTimeout(timer);
    if (screen !== 'play' || !game.answered) return;
    game.i++;
    game.answered = false;
    game.picked = -1;
    game.shownAt = performance.now();
    if (game.i >= game.qs.length) screen = 'result';
    draw();
  }

  // ---------- 畫面 ----------

  function drawSetup() {
    const items = selectedItems();
    const total = items.length * scriptsFor(cfg.script).length;
    const weak = weakQuestions();
    weakShown = weak.length;
    const label = (g) => (cfg.script === 'kata' ? toKatakana(g.label) : g.label);

    el.innerHTML = `
      ${
        weak.length
          ? `<section class="card review-card">
              <div>
                <h2>複習常錯的假名</h2>
                <p>有 ${weak.length} 個假名比較常答錯，先把它們練熟吧。</p>
              </div>
              <button type="button" class="btn primary" data-act="review">開始複習</button>
            </section>`
          : ''
      }
      <section class="card setup">
        <div class="field">
          <p class="field-label">題型</p>
          ${seg('mode', MODES, cfg.mode)}
        </div>
        <div class="field">
          <p class="field-label">文字</p>
          ${seg('script', SCRIPTS, cfg.script)}
        </div>
        <div class="field">
          <p class="field-label"><span>範圍</span><span class="muted">已選 ${items.length} 個假名</span></p>
          <div class="chips">
            ${GROUPS.map(
              (g) => `<button type="button" class="chip${g.kind === 'seion' ? ' kana-chip' : ''}" data-group="${g.id}"
                aria-pressed="${cfg.groups.has(g.id)}"${g.kind === 'seion' ? ' lang="ja"' : ''}>${label(g)}</button>`,
            ).join('')}
          </div>
          <div class="quick">
            <button type="button" class="link-btn" data-quick="seion">全部清音</button>
            <button type="button" class="link-btn" data-quick="all">全選</button>
            <button type="button" class="link-btn" data-quick="none">清除</button>
          </div>
        </div>
        <div class="field">
          <p class="field-label">題數</p>
          ${seg('length', { 10: '10 題', 20: '20 題', all: `全部 ${total} 題` }, cfg.length)}
        </div>
        <button type="button" class="btn primary big block" data-act="start" ${items.length ? '' : 'disabled'}>
          開始測驗 ${icons.arrow}
        </button>
        ${items.length ? '' : '<p class="empty-hint">先選至少一個範圍喔</p>'}
      </section>`;
  }

  function feedbackHTML(q, ok) {
    const shown = display(q.item, q.script);
    const picked = q.options[game.picked];
    const last = game.i + 1 >= game.qs.length;
    const text = ok
      ? `<div class="fb-text ok">${icons.check}<span>答對了！</span></div>`
      : `<div class="fb-text bad">
          <span>答案是 <b lang="ja">${shown}</b> ${q.item.romaji}</span>
          <small>你選的 <b lang="ja">${display(picked, q.script)}</b> 念 ${picked.romaji}</small>
        </div>`;
    return `${text}<button type="button" class="btn ${ok ? 'ghost' : 'primary'}" data-act="next">${
      last ? '看結果' : '下一題'
    } ${icons.arrow}</button>`;
  }

  function drawPlay() {
    const q = game.qs[game.i];
    const n = game.qs.length;
    const isK2R = cfg.mode === 'k2r';
    const correctIdx = q.options.findIndex((o) => o.kana === q.item.kana);
    const ok = game.answered && game.picked === correctIdx;
    const done = game.i + (game.answered ? 1 : 0);

    el.innerHTML = `
      <div class="play">
        <div class="play-top">
          <button type="button" class="icon-btn" data-act="quit" aria-label="結束測驗">${icons.close}</button>
          <div class="progress" role="progressbar" aria-label="進度" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}">
            <div class="bar" style="width:${(done / n) * 100}%"></div>
          </div>
          <span class="counter">${game.i + 1} / ${n}</span>
        </div>

        <section class="card prompt">
          <p class="prompt-label">${isK2R ? '這個假名怎麼念？' : `選出這個音的${SCRIPT_NAME[q.script]}`}</p>
          ${
            isK2R
              ? `<div class="prompt-main kana" lang="ja">${display(q.item, q.script)}</div>`
              : `<div class="prompt-main romaji">${q.item.romaji}</div>`
          }
          ${
            isK2R || game.answered
              ? `<button type="button" class="icon-btn speak" data-act="speak" aria-label="播放發音">${icons.volume}</button>`
              : ''
          }
          <p class="prompt-meta">${game.streak >= 3 ? `連續答對 ${game.streak} 題` : '&nbsp;'}</p>
        </section>

        <div class="options">
          ${q.options
            .map((o, idx) => {
              let state = '';
              if (game.answered) state = idx === correctIdx ? 'correct' : idx === game.picked ? 'wrong' : 'dim';
              const text = isK2R ? o.romaji : display(o, q.script);
              return `<button type="button" class="opt ${state}" data-opt="${idx}" ${game.answered ? 'disabled' : ''}>
                <span class="num" aria-hidden="true">${idx + 1}</span>
                <span class="opt-label"${isK2R ? '' : ' lang="ja"'}>${text}</span>
              </button>`;
            })
            .join('')}
        </div>

        <div class="feedback" aria-live="polite">${game.answered ? feedbackHTML(q, ok) : ''}</div>
      </div>`;

    if (game.answered && !ok) el.querySelector('[data-act="next"]')?.focus({ preventScroll: true });
  }

  function drawResult() {
    const n = game.qs.length;
    const pct = Math.round((game.score / n) * 100);
    const misses = uniqBy(game.mistakes, (q) => keyOf(q.item, q.script));
    const missed = new Set(misses.map((q) => keyOf(q.item, q.script)));
    const slows = uniqBy(game.slow, (q) => keyOf(q.item, q.script)).filter((q) => !missed.has(keyOf(q.item, q.script)));
    const kanaList = (qs) => `<ul class="miss">
      ${qs.map((q) => `<li><span class="k" lang="ja">${display(q.item, q.script)}</span><span class="r">${q.item.romaji}</span></li>`).join('')}
    </ul>`;
    el.innerHTML = `
      <section class="card result">
        <p class="result-label">${game.kind === 'review' ? '複習完成' : '測驗完成'}</p>
        <div class="score">${game.score}<small> / ${n}</small></div>
        <p class="msg">${resultMessage(pct)}</p>
        <div class="stats-row">
          <div><b>${pct}%</b><span>正確率</span></div>
          <div><b>${game.best}</b><span>最多連續答對</span></div>
        </div>
        ${misses.length ? `<h3>答錯的假名</h3>${kanaList(misses)}` : ''}
        ${slows.length ? `<h3>答對但想比較久的假名</h3>${kanaList(slows)}<p class="result-note">多練幾次、答得更快就算熟練了。</p>` : ''}
        <div class="actions">
          ${misses.length ? '<button type="button" class="btn primary" data-act="retry-miss">再練一次答錯的</button>' : ''}
          <button type="button" class="btn ${misses.length ? '' : 'primary'}" data-act="again">再來一輪</button>
          <button type="button" class="btn ghost" data-act="setup">回到設定</button>
        </div>
      </section>`;
  }

  let lastScreen = screen;
  let lastIndex = -1;
  function draw() {
    if (screen === 'play') drawPlay();
    else if (screen === 'result') drawResult();
    else drawSetup();
    // 換畫面或換題時回到頂端，題目才不會被頁首擋住
    const idx = screen === 'play' ? game.i : -1;
    if (screen !== lastScreen || idx !== lastIndex) window.scrollTo(0, 0);
    lastScreen = screen;
    lastIndex = idx;
  }

  // ---------- 事件 ----------

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || !el.contains(t)) return;
    const fromKeyboard = e.detail === 0;
    let refocus = null;

    const field = t.parentElement?.dataset.field;
    if (field && t.dataset.val) {
      cfg[field] = field === 'length' && t.dataset.val !== 'all' ? Number(t.dataset.val) : t.dataset.val;
      refocus = `[data-field="${field}"] [data-val="${t.dataset.val}"]`;
    } else if (t.dataset.group) {
      const id = t.dataset.group;
      if (cfg.groups.has(id)) cfg.groups.delete(id);
      else cfg.groups.add(id);
      refocus = `[data-group="${id}"]`;
    } else if (t.dataset.quick) {
      const q = t.dataset.quick;
      cfg.groups = new Set(
        q === 'all' ? GROUPS.map((g) => g.id) : q === 'seion' ? GROUPS.filter((g) => g.kind === 'seion').map((g) => g.id) : [],
      );
      refocus = `[data-quick="${q}"]`;
    } else if ('opt' in t.dataset) {
      answer(Number(t.dataset.opt));
      return;
    } else {
      const q = game?.qs[game.i];
      switch (t.dataset.act) {
        case 'start': return startFromCfg();
        case 'review': return startReview();
        case 'next': return next();
        case 'speak': return q && say(display(q.item, q.script), { force: true });
        case 'again': return game.kind === 'review' ? startReview() : startFromCfg();
        case 'retry-miss': {
          const qs = uniqBy(game.mistakes, (m) => keyOf(m.item, m.script)).map(({ item, script }) => ({ item, script }));
          return start(qs, game.pool, game.kind);
        }
        case 'quit':
        case 'setup':
          clearTimeout(timer);
          screen = 'setup';
          draw();
          window.scrollTo(0, 0);
          return;
        default: return;
      }
    }

    saveCfg();
    draw();
    if (fromKeyboard && refocus) el.querySelector(refocus)?.focus({ preventScroll: true });
  });

  // 鍵盤：1–4 選答案，Enter / 空白鍵 下一題
  const onKey = (e) => {
    if (screen !== 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!game.answered && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      answer(Number(e.key) - 1);
    } else if (game.answered && (e.key === 'Enter' || e.key === ' ')) {
      if (e.target instanceof HTMLButtonElement) return; // 按鈕本身會處理
      e.preventDefault();
      next();
    }
  };
  document.addEventListener('keydown', onKey);

  // 其他裝置的紀錄同步進來時，設定畫面的「複習常錯的假名」可能要更新
  const offStats = onStatsChange(() => {
    if (screen === 'setup' && weakQuestions().length !== weakShown) draw();
  });

  draw();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    offStats();
  };
}
