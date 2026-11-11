import { GROUPS, ALL, toKatakana, display, keyOf, confusables } from './kana.js';
import { WORDS } from './words.js';
import { getPref, setPref, record, mastery, getStat, weight, onStatsChange, slowLimit } from './store.js';
import { say } from './speech.js';
import { icons } from './ui.js';

const CONTENTS = { kana: '假名', word: '單字' };
const MODES = { k2r: '看假名 選拼音', r2k: '看拼音 選假名' };
const WORD_MODES = { read: '單字→拼音', mean: '單字→意思', pick: '意思→單字' };
const WORD_MIN = 4; // 單字至少要有幾個才能出題（一題四個選項）
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

// 題目可能是假名或單字。單字自己帶著文字種類（script）和中文意思（zh）。
const isWord = (item) => 'zh' in item;
const show = (item, script) => display(item, item.script || script);
const qKey = (q) => (isWord(q.item) ? `word:${q.item.kana}` : keyOf(q.item, q.script));

// 依權重抽 n 題（不重複）：不熟的假名權重高，比較容易被抽到
function pickWeighted(qs, n) {
  return qs
    .map((q) => ({ q, r: Math.random() ** (1 / weight(qKey(q))) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, n)
    .map((x) => x.q);
}

// 常答錯的題目（和五十音表上紅點的標準一樣）。答對幾次、正確率回升後就不算了。
const isWeak = (q) => mastery(qKey(q)) === 'weak';

// 出題：範圍裡常答錯的一定會出（最多佔一半，錯越多的越優先），剩下的依熟練度加權抽
function pickQuestions(qs, length) {
  if (length === 'all' || qs.length <= length) return qs;
  const misses = (q) => getStat(qKey(q)).w - getStat(qKey(q)).c;
  const weak = shuffle(qs.filter(isWeak))
    .sort((a, b) => misses(b) - misses(a))
    .slice(0, Math.ceil(length / 2));
  const rest = qs.filter((q) => !weak.includes(q));
  return [...weak, ...pickWeighted(rest, length - weak.length)];
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

// 單字的干擾選項：優先挑同一種文字裡開頭相同、長度相同的單字，比較不容易用猜的
function makeWordOptions(q, pool) {
  const picks = [];
  const add = (list) => {
    for (const w of shuffle(list)) {
      if (picks.length >= 3) return;
      if (w !== q.item && !picks.includes(w)) picks.push(w);
    }
  };
  const same = pool.filter((w) => w.script === q.item.script);
  add(same.filter((w) => w.size === q.item.size && w.kana[0] === q.item.kana[0]));
  add(same.filter((w) => w.size === q.item.size));
  add(same);
  add(pool);
  add(WORDS);
  return shuffle([q.item, ...picks]);
}

const seg = (field, opts, cur) => `
  <div class="seg block" role="group" data-field="${field}">
    ${Object.entries(opts)
      .map(([v, t]) => `<button type="button" data-val="${v}" aria-pressed="${String(cur) === v}">${t}</button>`)
      .join('')}
  </div>`;

// 例句裡把這個單字標出來；い形容詞常會變化（からい → からくて），找不到整個字就標字幹
function markWord(ex, w) {
  const word = show(w, w.script);
  const hit = ex.includes(word) ? word : w.dict.pos === 'い形容詞' ? word.slice(0, -1) : '';
  return hit ? ex.replace(hit, `<b>${hit}</b>`) : ex;
}

// 單字答題後，題目下方的字典解釋：意思、念法、詞性、漢字或來源、使用情境、例句。
// 題目已經大大顯示的東西（單字本身或意思）就不再重複。
function entryHTML(w, mode) {
  const d = w.dict;
  const head =
    mode === 'pick'
      ? `<span class="entry-word" lang="ja">${show(w, w.script)}</span><span class="entry-romaji">${w.romaji}</span>`
      : `<span class="entry-zh">${w.zh}</span><span class="entry-romaji">${w.romaji}</span>`;
  if (!d) return `<div class="entry"><div class="entry-head">${head}</div></div>`;
  const kata = w.script === 'kata';
  return `
    <div class="entry">
      <div class="entry-head">${head}</div>
      <div class="entry-tags">
        <span class="tag">${d.pos}</span>
        ${d.origin ? `<span class="tag">${kata ? '來源' : '漢字'} <b${kata ? '' : ' lang="ja"'}>${d.origin}</b></span>` : ''}
      </div>
      <p class="entry-label">使用情境</p>
      <p class="entry-note">${d.note}</p>
      <div class="entry-label">
        例句
        <button type="button" class="icon-btn plain small" data-act="speak-ex" aria-label="播放例句">${icons.volume}</button>
      </div>
      <p class="ex-ja" lang="ja">${markWord(d.ex, w)}</p>
      <p class="ex-zh">${d.exZh}</p>
    </div>`;
}

function resultMessage(pct, word) {
  if (pct === 100) return word ? '全對！這些單字都記住了！' : '全對！太厲害了！';
  if (pct >= 80) return word ? '很棒，大部分單字都認得了！' : '很棒，快要熟練了！';
  if (pct >= 50) return word ? '不錯喔，再多練幾次就記得住。' : '不錯喔，再多練幾次會更熟。';
  return word ? '慢慢來，單字多看幾次就會記住。' : '慢慢來，先回五十音表看一看也很好。';
}

export function mountQuiz(root) {
  const el = document.createElement('div');
  el.className = 'quiz';
  root.appendChild(el);

  const cfg = {
    content: getPref('quizContent', 'kana'),
    mode: getPref('quizMode', 'k2r'),
    wordMode: getPref('quizWordMode', 'read'),
    script: getPref('quizScript', 'hira'),
    groups: new Set(getPref('quizGroups', ['a', 'ka', 'sa'])),
    length: getPref('quizLength', 10),
  };
  let screen = 'setup';
  let game = null;
  let timer = null;
  let weakShown = -1; // 設定畫面上顯示的「常答錯」數量

  const saveCfg = () => {
    setPref('quizContent', cfg.content);
    setPref('quizMode', cfg.mode);
    setPref('quizWordMode', cfg.wordMode);
    setPref('quizScript', cfg.script);
    setPref('quizGroups', [...cfg.groups]);
    setPref('quizLength', cfg.length);
  };

  const selectedItems = () => GROUPS.filter((g) => cfg.groups.has(g.id)).flatMap((g) => g.items);
  const scriptsFor = (s) => (s === 'mix' ? ['hira', 'kata'] : [s]);
  // 只用已選範圍裡的假名就能寫出來的單字
  const selectedWords = () => {
    const known = new Set(selectedItems().map((i) => i.kana));
    const scripts = scriptsFor(cfg.script);
    return WORDS.filter((w) => scripts.includes(w.script) && w.kinds.every((k) => known.has(k)));
  };

  // 目前設定下所有可能的題目
  function cfgQuestions() {
    if (cfg.content === 'word') {
      const words = selectedWords();
      const qs = words.map((item) => ({ item, script: item.script }));
      return { qs, pool: words, mode: cfg.wordMode, ready: words.length >= WORD_MIN };
    }
    const items = selectedItems();
    const qs = items.flatMap((item) => scriptsFor(cfg.script).map((script) => ({ item, script })));
    return { qs, pool: items, mode: cfg.mode, ready: items.length > 0 };
  }

  function start(questions, pool, mode) {
    clearTimeout(timer);
    game = {
      qs: shuffle(questions).map((q) => ({ ...q, options: (isWord(q.item) ? makeWordOptions : makeOptions)(q, pool) })),
      pool,
      mode, // k2r / r2k（假名）或 read / mean / pick（單字）
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
    const { qs, pool, mode, ready } = cfgQuestions();
    if (ready) start(pickQuestions(qs, cfg.length), pool, mode);
  }

  function answer(idx) {
    if (screen !== 'play' || game.answered) return;
    const q = game.qs[game.i];
    if (idx < 0 || idx >= q.options.length) return;
    const ok = q.options[idx].kana === q.item.kana;
    game.answered = true;
    game.picked = idx;
    const ms = performance.now() - game.shownAt;
    record(qKey(q), ok, ms);
    if (ok) {
      if (ms > slowLimit(qKey(q))) game.slow.push(q);
      game.score++;
      game.streak++;
      game.best = Math.max(game.best, game.streak);
    } else {
      game.streak = 0;
      game.mistakes.push(q);
    }
    say(show(q.item, q.script));
    draw();
    // 假名答對會自動跳下一題；單字要看解釋，等使用者自己按「下一題」
    if (ok && !isWord(q.item)) timer = setTimeout(next, 900);
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
    const wordMode = cfg.content === 'word';
    const noun = wordMode ? '單字' : '假名';
    const { qs, ready } = cfgQuestions();
    const words = wordMode ? qs.length : 0;
    const total = qs.length;
    const weak = qs.filter(isWeak).length;
    weakShown = weak;
    const emptyHint = wordMode ? '這個範圍能組成的單字太少，多選幾行吧' : '先選至少一個範圍喔';
    const label = (g) => (cfg.script === 'kata' ? toKatakana(g.label) : g.label);

    el.innerHTML = `
      <section class="card setup">
        <div class="field">
          <p class="field-label">內容</p>
          ${seg('content', CONTENTS, cfg.content)}
        </div>
        <div class="field">
          <p class="field-label">題型</p>
          ${wordMode ? seg('wordMode', WORD_MODES, cfg.wordMode) : seg('mode', MODES, cfg.mode)}
        </div>
        <div class="field">
          <p class="field-label">文字</p>
          ${seg('script', SCRIPTS, cfg.script)}
        </div>
        <div class="field">
          <p class="field-label"><span>範圍</span><span class="muted">已選 ${items.length} 個假名${wordMode ? `・${words} 個單字` : ''}</span></p>
          <div class="chips">
            ${GROUPS.map(
              (g) => `<button type="button" class="chip${g.kind === 'seion' ? ' kana-chip' : ''}" data-group="${g.id}"
                aria-pressed="${cfg.groups.has(g.id)}"${g.kind === 'seion' ? ' lang="ja"' : ''}>${label(g)}${
                g.kind === 'seion' ? `<span class="chip-r" lang="en">${g.items[0].romaji}</span>` : ''
              }</button>`,
            ).join('')}
          </div>
          <div class="quick">
            <button type="button" class="link-btn" data-quick="seion">全部清音</button>
            <button type="button" class="link-btn" data-quick="all">全選</button>
            <button type="button" class="link-btn" data-quick="none">清除</button>
          </div>
          ${wordMode ? '<p class="range-note">只會出現用已選的假名就能寫出來的單字。</p>' : ''}
          ${weak ? `<p class="range-note weak-note">其中 ${weak} 個${noun}常答錯，測驗時會優先出現。</p>` : ''}
        </div>
        <div class="field">
          <p class="field-label">題數</p>
          ${seg('length', { 10: '10 題', 20: '20 題', all: `全部 ${total} 題` }, cfg.length)}
        </div>
        <button type="button" class="btn primary big block" data-act="start" ${ready ? '' : 'disabled'}>
          開始測驗 ${icons.arrow}
        </button>
        ${ready ? '' : `<p class="empty-hint">${emptyHint}</p>`}
      </section>`;
  }

  function feedbackHTML(q, ok) {
    const picked = q.options[game.picked];
    const last = game.i + 1 >= game.qs.length;
    const word = isWord(q.item);
    const kana = (i) => `<b lang="ja">${show(i, q.script)}</b>`;
    let text;
    if (ok) text = `<div class="fb-text ok">${icons.check}<span>答對了！</span></div>`;
    // 單字的正確答案已經寫在題目下方的解釋裡，這裡只說選到的是什麼
    else if (word)
      text = `<div class="fb-text bad">
          <span>答錯了</span>
          <small>你選的是 ${kana(picked)} ${picked.romaji}（${picked.zh}）</small>
        </div>`;
    else
      text = `<div class="fb-text bad">
          <span>答案是 ${kana(q.item)} ${q.item.romaji}</span>
          <small>你選的 ${kana(picked)} 念 ${picked.romaji}</small>
        </div>`;
    // 假名答對會自動跳題，按鈕淡一點；其他情況都要自己按，用主要按鈕
    return `${text}<button type="button" class="btn ${ok && !word ? 'ghost' : 'primary'}" data-act="next">${
      last ? '看結果' : '下一題'
    } ${icons.arrow}</button>`;
  }

  function drawPlay() {
    const q = game.qs[game.i];
    const n = game.qs.length;
    const mode = game.mode;
    const shown = show(q.item, q.script);
    // 每種題型：題目上面的說明、題目的樣式和內容、選項顯示什麼
    const view = {
      k2r: { label: '這個假名怎麼念？', cls: 'kana', main: shown, opt: (o) => o.romaji },
      r2k: { label: `選出這個音的${SCRIPT_NAME[q.script]}`, cls: 'romaji', main: q.item.romaji, opt: (o) => show(o, q.script), ja: true },
      read: { label: '這個單字怎麼念？', cls: 'kana word', main: shown, opt: (o) => o.romaji },
      mean: { label: '這個單字是什麼意思？', cls: 'kana word', main: shown, opt: (o) => o.zh },
      pick: { label: '選出這個意思的單字', cls: 'meaning', main: q.item.zh, opt: (o) => show(o, q.script), ja: true },
    }[mode];
    const showsKana = view.cls.startsWith('kana'); // 題目本身就是假名，可以先聽發音
    const correctIdx = q.options.findIndex((o) => o.kana === q.item.kana);
    const ok = game.answered && game.picked === correctIdx;
    const done = game.i + (game.answered ? 1 : 0);
    const word = isWord(q.item);
    const explain = word && game.answered; // 單字答完：題目下方顯示字典解釋

    el.innerHTML = `
      <div class="play">
        <div class="play-top">
          <button type="button" class="icon-btn" data-act="quit" aria-label="結束測驗">${icons.close}</button>
          <div class="progress" role="progressbar" aria-label="進度" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}">
            <div class="bar" style="width:${(done / n) * 100}%"></div>
          </div>
          <span class="counter">${game.i + 1} / ${n}</span>
        </div>

        <section class="card prompt${explain ? ' answered' : ''}">
          <p class="prompt-label">${view.label}</p>
          <div class="prompt-main ${view.cls}"${showsKana ? ` lang="ja" style="--n:${[...shown].length}"` : ''}>${view.main}</div>
          ${
            showsKana || game.answered
              ? `<button type="button" class="icon-btn speak" data-act="speak" aria-label="播放發音">${icons.volume}</button>`
              : ''
          }
          <p class="prompt-meta">${game.streak >= 3 ? `連續答對 ${game.streak} 題` : explain ? '' : '&nbsp;'}</p>
          ${explain ? entryHTML(q.item, mode) : ''}
        </section>

        <div class="options${word ? ' words' : ''}">
          ${q.options
            .map((o, idx) => {
              let state = '';
              if (game.answered) state = idx === correctIdx ? 'correct' : idx === game.picked ? 'wrong' : 'dim';
              return `<button type="button" class="opt ${state}" data-opt="${idx}" ${game.answered ? 'disabled' : ''}>
                <span class="num" aria-hidden="true">${idx + 1}</span>
                <span class="opt-label"${view.ja ? ' lang="ja"' : ''}>${view.opt(o)}</span>
              </button>`;
            })
            .join('')}
        </div>

        <div class="feedback${explain ? ' sticky' : ''}" aria-live="polite">${game.answered ? feedbackHTML(q, ok) : ''}</div>
      </div>`;

    // 不會自動跳題時，把焦點放到「下一題」，鍵盤直接按 Enter 就好
    if (game.answered && (!ok || word)) el.querySelector('[data-act="next"]')?.focus({ preventScroll: true });
  }

  function drawResult() {
    const n = game.qs.length;
    const pct = Math.round((game.score / n) * 100);
    const word = isWord(game.qs[0].item);
    const misses = uniqBy(game.mistakes, qKey);
    const missed = new Set(misses.map(qKey));
    const slows = uniqBy(game.slow, qKey).filter((q) => !missed.has(qKey(q)));
    const noun = word ? '單字' : '假名';
    const kanaList = (qs) => `<ul class="miss">
      ${qs
        .map(
          (q) => `<li><span class="k" lang="ja">${show(q.item, q.script)}</span><span class="r">${q.item.romaji}</span>${
            word ? `<span class="r">${q.item.zh}</span>` : ''
          }</li>`,
        )
        .join('')}
    </ul>`;
    el.innerHTML = `
      <section class="card result">
        <p class="result-label">測驗完成</p>
        <div class="score">${game.score}<small> / ${n}</small></div>
        <p class="msg">${resultMessage(pct, word)}</p>
        <div class="stats-row">
          <div><b>${pct}%</b><span>正確率</span></div>
          <div><b>${game.best}</b><span>最多連續答對</span></div>
        </div>
        ${misses.length ? `<h3>答錯的${noun}</h3>${kanaList(misses)}` : ''}
        ${slows.length ? `<h3>答對但想比較久的${noun}</h3>${kanaList(slows)}<p class="result-note">多練幾次、答得更快就算熟練了。</p>` : ''}
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
        case 'next': return next();
        case 'speak': return q && say(show(q.item, q.script), { force: true });
        case 'speak-ex': return q?.item.dict && say(q.item.dict.ex, { force: true });
        case 'again': return startFromCfg();
        case 'retry-miss': {
          const qs = uniqBy(game.mistakes, qKey).map(({ item, script }) => ({ item, script }));
          return start(qs, game.pool, game.mode);
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

  // 其他裝置的紀錄同步進來時，設定畫面的「常答錯」數量可能要更新
  const offStats = onStatsChange(() => {
    if (screen === 'setup' && cfgQuestions().qs.filter(isWeak).length !== weakShown) draw();
  });

  draw();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    offStats();
  };
}
